import { query, transaction } from '../database/db.js';
import { success, created, error, notFound as notFoundRes } from '../utils/response.js';
import { initializeTransaction, verifyTransaction, verifyWebhookSignature } from '../services/paystackService.js';
import { grossUpForPaystack } from '../utils/paystackFees.js';
import { resolvePaystackKeys } from '../utils/paystackKeys.js';
import { stampId } from '../utils/tenantScope.js';
import { generateQRCodeSVG, ticketQRData } from '../services/qrcodeService.js';
import { sendTicketEmail } from '../services/emailService.js';
import {
  generateTicketNumber, generatePaystackRef,
  toKobo, fromKobo, getEffectivePrice
} from '../utils/helpers.js';

// ── Initiate Ticket Purchase ─────────────────────────────────
export const initiateTicketPurchase = async (req, res, next) => {
  try {
    const {
      event_id, ticket_type_id, category_id,
      name, email, phone, gender, occupation,
      quantity: rawQty,
    } = req.body;
    const quantity = Math.max(1, Math.min(20, parseInt(rawQty) || 1)); // cap 1-20

    // Validate event (status = 'active' is the only gate; no separate registration_open column)
    const [events] = await query(
      "SELECT * FROM events WHERE id = ? AND status = 'active'",
      [event_id]
    );
    if (!events.length) {
      return error(res, 'This event is not available for registration at the moment.');
    }

    // Validate ticket type (quantity_available / quantity_sold per schema)
    const [ticketTypes] = await query(
      'SELECT * FROM ticket_types WHERE id = ? AND event_id = ? AND is_active = 1',
      [ticket_type_id, event_id]
    );
    if (!ticketTypes.length) {
      return error(res, 'The selected ticket type is not available.');
    }

    const ticketType = ticketTypes[0];

    // Check capacity (schema uses quantity_available / quantity_sold)
    if (ticketType.quantity_available && ticketType.quantity_sold + quantity > ticketType.quantity_available) {
      const left = ticketType.quantity_available - ticketType.quantity_sold;
      return error(res, left > 0
        ? `Only ${left} ${ticketType.name} ticket(s) left — reduce your quantity.`
        : `Sorry, ${ticketType.name} tickets are sold out.`, 409);
    }

    // Determine price (respect early_bird_closes_at from event)
    const earlyBirdOpen = events[0].early_bird_closes_at && new Date(events[0].early_bird_closes_at) > new Date();
    const isEarlyBird   = earlyBirdOpen && !!ticketType.early_bird_price;
    const unitPrice     = isEarlyBird ? parseFloat(ticketType.early_bird_price) : parseFloat(ticketType.regular_price);
    const price         = unitPrice * quantity;  // total for all tickets
    // Gross up so the organisation receives the EXACT ticket price after Paystack's cut.
    // The buyer pays price + processing fee.
    const { total: chargeAmount } = grossUpForPaystack(price);
    const amountKobo    = toKobo(chargeAmount);

    // Find or create participant — scoped to THIS tenant so the same email in
    // another organisation doesn't get reused here.
    let participantId;
    const tId = stampId(req);
    const [existing] = await query(
      'SELECT id FROM participants WHERE email = ? AND (tenant_id = ? OR (? IS NULL AND tenant_id IS NULL)) LIMIT 1',
      [email.toLowerCase(), tId, tId]
    );

    if (existing.length) {
      participantId = existing[0].id;
      await query(
        'UPDATE participants SET name = ?, phone = ?, updated_at = NOW() WHERE id = ?',
        [name, phone, participantId]
      );
    } else {
      const [inserted] = await query(
        `INSERT INTO participants (name, email, phone, gender, occupation, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email.toLowerCase(), phone, gender || null, occupation || null, tId]
      );
      participantId = inserted.insertId;
    }

    // Note: a PAID ticket no longer blocks buying again — a person may buy
    // multiple tickets (e.g. for family/friends). Each purchase gets its own
    // unique_number. Pending rows are reused below to avoid abandoned duplicates.

    // Generate ticket number
    const [[{ nextSeq }]] = await query(
      'SELECT COALESCE(MAX(id), 0) + 1 AS nextSeq FROM tickets'
    );
    const uniqueNumber = generateTicketNumber(events[0].edition || '3', nextSeq);
    const paystackRef = generatePaystackRef('MYS');

    // Validate category if provided (event_categories is GLOBAL — no event_id column)
    if (category_id) {
      const [cats] = await query(
        'SELECT id, capacity FROM event_categories WHERE id=? AND is_active=1',
        [category_id]
      );
      if (!cats.length) return error(res, 'Invalid category selected.', 400);
      if (cats[0].capacity) {
        const [[{ cnt }]] = await query(
          "SELECT COUNT(*) AS cnt FROM tickets WHERE category_id=? AND event_id=? AND status='paid'",
          [category_id, event_id]
        );
        if (cnt >= cats[0].capacity) return error(res, 'This category is full. Please select another.', 409);
      }
    }

    // Check for an existing PENDING ticket for this participant+event and reuse it
    // (prevents duplicate pending rows + Paystack "Duplicate Transaction Reference"
    //  when a user closes the popup and clicks Pay again)
    const [pendingExisting] = await query(
      `SELECT id FROM tickets
       WHERE participant_id = ? AND event_id = ? AND status = 'pending'
       ORDER BY id DESC LIMIT 1`,
      [participantId, event_id]
    );

    if (pendingExisting.length) {
      // Reuse the row but give it a FRESH reference (old one may be locked at Paystack)
      await query(
        `UPDATE tickets
         SET ticket_type_id = ?, category_id = ?, paystack_reference = ?,
             amount_paid = ?, quantity = ?, is_early_bird = ?, unique_number = ?
         WHERE id = ?`,
        [ticket_type_id, category_id || null, paystackRef, price, quantity, isEarlyBird ? 1 : 0, uniqueNumber, pendingExisting[0].id]
      );
    } else {
      // Create pending ticket — retry with a fresh sequence if unique_number
      // collides (rare, under concurrent purchases).
      let attempt = 0, inserted = false, num = uniqueNumber;
      while (!inserted && attempt < 5) {
        try {
          await query(
            `INSERT INTO tickets (participant_id, event_id, ticket_type_id, category_id, unique_number, paystack_reference, amount_paid, quantity, is_early_bird, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [participantId, event_id, ticket_type_id, category_id || null, num, paystackRef, price, quantity, isEarlyBird ? 1 : 0]
          );
          inserted = true;
          uniqueNumber = num;
        } catch (insErr) {
          if (insErr.code === 'ER_DUP_ENTRY' && attempt < 4) {
            attempt++;
            const [[{ retrySeq }]] = await query('SELECT COALESCE(MAX(id),0) + 1 + ? AS retrySeq FROM tickets', [attempt]);
            num = generateTicketNumber(events[0].edition || '3', retrySeq);
          } else { throw insErr; }
        }
      }
    }

    // Init Paystack
    const ptKeys = resolvePaystackKeys(req.tenant);
    const paystackData = await initializeTransaction({
      email: email.toLowerCase(),
      amount: amountKobo,
      reference: paystackRef,
      secretKey: ptKeys.secret,
      metadata: {
        custom_fields: [
          { display_name: 'Full Name', variable_name: 'name', value: name },
          { display_name: 'Ticket Type', variable_name: 'ticket_type', value: ticketType.name },
          { display_name: 'Ticket Number', variable_name: 'ticket_number', value: uniqueNumber },
          { display_name: 'Event', variable_name: 'event', value: events[0].title },
        ],
        participant_id: participantId,
        ticket_number: uniqueNumber,
        is_early_bird: isEarlyBird,
      },
    });

    return success(res, {
      authorization_url: paystackData.authorization_url,
      access_code:       paystackData.access_code,
      public_key:        ptKeys.public,
      reference:         paystackRef,
      ticket_number:     uniqueNumber,
      amount:            price,
      quantity,
      unit_price:        unitPrice,
      is_early_bird:     isEarlyBird,
    }, 'Payment initiated. Complete your payment to confirm your ticket.');
  } catch (err) {
    next(err);
  }
};

// ── Verify Payment ────────────────────────────────────────────
export const verifyTicketPayment = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const [tickets] = await query(
      `SELECT t.*, p.name AS participant_name, p.email AS participant_email,
              e.title AS event_title, e.edition, e.start_date, e.venue,
              tt.name AS ticket_type_name
       FROM tickets t
       JOIN participants p ON p.id = t.participant_id
       JOIN events e ON e.id = t.event_id
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       WHERE t.paystack_reference = ?`,
      [reference]
    );

    if (!tickets.length) {
      return notFoundRes(res, 'Ticket');
    }

    const ticket = tickets[0];

    // Already paid
    if (ticket.status === 'paid') {
      return success(res, { ticket, alreadyPaid: true }, 'Ticket already confirmed.');
    }

    // Verify with Paystack
    const txData = await verifyTransaction(reference, resolvePaystackKeys(req.tenant).secret);

    if (txData.status !== 'success') {
      return error(res, `Payment was not successful. Status: ${txData.status}. Please try again or contact support.`);
    }

    // Generate QR code
    const qrData = ticketQRData(ticket.unique_number);
    const qrSvg = await generateQRCodeSVG(qrData);

    await transaction(async (conn) => {
      // Confirm ticket
      await conn.execute(
        `UPDATE tickets SET status = 'paid', purchased_at = NOW(), qr_code_svg = ? WHERE id = ?`,
        [qrSvg, ticket.id]
      );

      // Increment quantity_sold by this ticket's quantity
      await conn.execute(
        'UPDATE ticket_types SET quantity_sold = quantity_sold + ? WHERE id = ?',
        [ticket.quantity || 1, ticket.ticket_type_id]
      );

      // Update participant timestamp
      await conn.execute(
        'UPDATE participants SET updated_at = NOW() WHERE id = ?',
        [ticket.participant_id]
      );
    });

    const updatedTicket = { ...ticket, status: 'paid', qr_code_svg: qrSvg };

    // Send ticket email (non-blocking — never delays the response)
    sendTicketEmail(updatedTicket)
      .then(() => console.log(`✅ Ticket email sent → ${updatedTicket.participant_email}`))
      .catch((err) => console.error(`❌ Ticket email failed for ${updatedTicket.participant_email}:`, err.message));

    // Return enriched ticket (same shape as getTicket)
    const [enriched] = await query(
      `SELECT t.*,
              p.name  AS participant_name, p.email AS participant_email,
              e.title AS event_title, e.start_date AS event_start_date,
              e.end_date AS event_end_date, e.venue AS event_venue, e.edition,
              tt.name AS ticket_type_name,
              cat.name AS category_name
       FROM tickets t
       JOIN participants p  ON p.id  = t.participant_id
       JOIN events e        ON e.id  = t.event_id
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       LEFT JOIN event_categories cat ON cat.id = t.category_id
       WHERE t.id = ?`,
      [ticket.id]
    );

    return success(res,
      { ticket: enriched[0] || updatedTicket, alreadyPaid: false },
      '🎉 Payment confirmed! Your ticket is ready.'
    );
  } catch (err) {
    next(err);
  }
};

// ── Paystack Webhook ──────────────────────────────────────────
export const paystackWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const body = JSON.stringify(req.body);

    if (!verifyWebhookSignature(body, signature)) {
      return res.status(401).send('Invalid webhook signature');
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      const reference = data.reference;
      const [tickets] = await query(
        "SELECT id, participant_id, ticket_type_id, unique_number FROM tickets WHERE paystack_reference = ? AND status = 'pending'",
        [reference]
      );

      if (tickets.length) {
        const ticket = tickets[0];
        const qrData = ticketQRData(ticket.unique_number);
        const qrSvg = await generateQRCodeSVG(qrData);

        await transaction(async (conn) => {
          await conn.execute(
            "UPDATE tickets SET status = 'paid', purchased_at = NOW(), qr_code_svg = ? WHERE id = ?",
            [qrSvg, ticket.id]
          );
          await conn.execute(
            'UPDATE ticket_types SET quantity_sold = quantity_sold + 1 WHERE id = ?',
            [ticket.ticket_type_id]
          );
          await conn.execute(
            'UPDATE participants SET updated_at = NOW() WHERE id = ?',
            [ticket.participant_id]
          );
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(200); // Always return 200 to Paystack
  }
};

// ── Get Ticket by Unique Number ──────────────────────────────
export const getTicket = async (req, res, next) => {
  try {
    const { uniqueNumber } = req.params;

    const [tickets] = await query(
      `SELECT t.*,
              p.name  AS participant_name,
              p.email AS participant_email,
              p.phone AS participant_phone,
              e.title        AS event_title,
              e.start_date   AS event_start_date,
              e.end_date     AS event_end_date,
              e.venue        AS event_venue,
              e.venue_address,
              e.edition,
              tt.name        AS ticket_type_name,
              cat.name       AS category_name,
              cat.color      AS category_color,
              et.tag_number,
              att.checked_in_at  AS check_in_at,
              att.checked_out_at AS check_out_at,
              att.id             AS attendance_id
       FROM tickets t
       JOIN participants p  ON p.id  = t.participant_id
       JOIN events e        ON e.id  = t.event_id
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       LEFT JOIN event_categories cat ON cat.id = t.category_id
       LEFT JOIN attendance att ON att.ticket_id = t.id
       LEFT JOIN event_tags et  ON et.id = att.tag_id
       WHERE t.unique_number = ?`,
      [uniqueNumber]
    );

    if (!tickets.length) return notFoundRes(res, 'Ticket');

    const ticket = tickets[0];
    if (ticket.status !== 'paid') {
      return error(res, 'This ticket has not been confirmed. Payment may be pending or cancelled.');
    }

    return success(res, ticket);
  } catch (err) {
    next(err);
  }
};

// ── Admin: Get All Tickets ────────────────────────────────────
export const adminGetTickets = async (req, res, next) => {
  try {
    const { event_id, status, search } = req.query;

    let sql = `
      SELECT t.id, t.unique_number, t.status, t.amount_paid, t.purchased_at,
             p.name AS participant_name, p.email AS participant_email, p.phone,
             tt.name AS ticket_type_name,
             et.tag_number,
             a.checked_in_at
      FROM tickets t
      JOIN participants p ON p.id = t.participant_id
      JOIN ticket_types tt ON tt.id = t.ticket_type_id
      LEFT JOIN attendance a ON a.ticket_id = t.id
      LEFT JOIN event_tags et ON et.id = a.tag_id
      WHERE 1=1
    `;
    const params = [];

    if (event_id) { sql += ' AND t.event_id = ?'; params.push(event_id); }
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.email LIKE ? OR t.unique_number LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY t.purchased_at DESC';

    const [tickets] = await query(sql, params);
    return success(res, tickets);
  } catch (err) {
    next(err);
  }
};

// ── Admin: Ticket Stats ───────────────────────────────────────
export const adminTicketStats = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const [[stats]] = await query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'paid') AS paid,
         SUM(status = 'pending') AS pending,
         SUM(status = 'cancelled') AS cancelled,
         SUM(CASE WHEN status = 'paid' THEN amount_paid ELSE 0 END) AS total_revenue
       FROM tickets WHERE event_id = ?`,
      [eventId]
    );

    const [byType] = await query(
      `SELECT tt.name, COUNT(*) AS count, SUM(t.amount_paid) AS revenue
       FROM tickets t JOIN ticket_types tt ON tt.id = t.ticket_type_id
       WHERE t.event_id = ? AND t.status = 'paid'
       GROUP BY tt.id`,
      [eventId]
    );

    const [[attStats]] = await query(
      `SELECT COUNT(*) AS checked_in FROM attendance
       WHERE event_id = ? AND checked_in_at IS NOT NULL`,
      [eventId]
    );

    const [[tagStats]] = await query(
      `SELECT COUNT(*) AS tags_assigned FROM event_tags
       WHERE event_id = ? AND ticket_id IS NOT NULL`,
      [eventId]
    );

    const [[partStats]] = await query(
      `SELECT COUNT(DISTINCT participant_id) AS participants FROM tickets
       WHERE event_id = ? AND status = 'paid'`,
      [eventId]
    );

    return success(res, {
      ...stats,
      byType,
      // Dashboard field aliases
      total_sold:    stats.paid    || 0,
      checked_in:    attStats.checked_in  || 0,
      tags_assigned: tagStats.tags_assigned || 0,
      participants:  partStats.participants  || 0,
    });
  } catch (err) {
    next(err);
  }
};
