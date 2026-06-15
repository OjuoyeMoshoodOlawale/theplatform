import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, rules } from '../middleware/validate.js';
import { query } from '../database/db.js';
import { success as ok, error as err, notFound as notFoundRes } from '../utils/response.js';
import { stampId } from '../utils/tenantScope.js';
import {
  initiateTicketPurchase, verifyTicketPayment,
  paystackWebhook, getTicket,
  adminGetTickets, adminTicketStats,
} from '../controllers/ticketController.js';
import { generateTicketNumber } from '../utils/helpers.js';
import { generateQRCodeSVG, ticketQRData } from '../services/qrcodeService.js';
import { sendTicketEmail } from '../services/emailService.js';

const router = express.Router();

// ── Public ────────────────────────────────────────────────────
router.post('/initiate', validate(rules.ticketInitiate), initiateTicketPurchase);
router.get('/verify/:reference', verifyTicketPayment);
router.post('/webhook', express.raw({ type: 'application/json' }), paystackWebhook);

// ── Admin ─────────────────────────────────────────────────────
router.get('/admin/all',         authenticate, authorize('super_admin','admin'), adminGetTickets);
router.get('/admin/stats/:eventId', authenticate, authorize('super_admin','admin'), adminTicketStats);

// Lookup by unique_number for check-in scanner
router.get('/by-number/:num', authenticate, async (req, res, next) => {
  let num = (req.params.num || '').trim();
  // If a TAG number was scanned (e.g. TAG-001), resolve it to its ticket's unique_number
  if (/^TAG-/i.test(num)) {
    try {
      const [rows] = await query(
        `SELECT t.unique_number FROM event_tags et
         JOIN tickets t ON t.id = et.ticket_id
         WHERE et.tag_number = ? LIMIT 1`,
        [num.toUpperCase()]
      );
      if (rows.length) num = rows[0].unique_number;
    } catch { /* fall through — try as-is */ }
  }
  req.params.uniqueNumber = num;
  return getTicket(req, res, next);
});
/* ── Certificate (printable HTML) ───────────────────────────── */
router.get('/certificate/:ref', async (req, res, next) => {
  try {
    let ref = (req.params.ref || '').trim().toUpperCase();

    // Resolve TAG number → ticket unique_number
    if (/^TAG-/i.test(ref)) {
      const [tagRows] = await query(
        `SELECT t.unique_number FROM event_tags et
         JOIN tickets t ON t.id = et.ticket_id
         WHERE et.tag_number = ? LIMIT 1`, [ref]
      );
      if (tagRows.length) ref = tagRows[0].unique_number;
    }

    const [rows] = await query(
      `SELECT t.unique_number,
              p.name AS participant_name,
              e.title AS event_title, e.edition, e.status AS event_status,
              e.start_date AS event_start_date, e.end_date, e.venue AS event_venue
       FROM tickets t
       JOIN participants p ON p.id = t.participant_id
       JOIN events e       ON e.id = t.event_id
       WHERE t.unique_number = ? AND t.status = 'paid'`,
      [ref]
    );

    if (!rows.length) return err(res, 'No ticket found for that number. Check and try again.', 404);

    const cert = rows[0];

    // Admin preview bypass — a valid admin token (header or ?token query) can
    // view the certificate at any time for cross-checking, even before the event ends.
    let isAdmin = false;
    try {
      const hdr = req.headers.authorization;
      const tok = (hdr && hdr.startsWith('Bearer ')) ? hdr.split(' ')[1] : req.query.token;
      if (tok) {
        const decoded = jwt.verify(tok, process.env.JWT_SECRET);
        if (decoded?.id) isAdmin = true;
      }
    } catch { /* invalid/expired token → treat as public visitor */ }

    // Participants: certificate available once the event is completed OR ended
    const endPassed = cert.end_date && new Date(cert.end_date) < new Date();
    const isReady   = cert.event_status === 'completed' || endPassed;

    if (!isAdmin && !isReady) {
      return err(res, 'Your certificate will be available after the event has concluded.', 403);
    }

    ok(res, { ...cert, preview: isAdmin && !isReady });
  } catch (e) { next(e); }
});

router.get('/:uniqueNumber', getTicket);

// ── Manual registration (admin / department staff) ─────────────
router.post('/manual', authenticate, authorize('super_admin','admin','department'), async (req, res, next) => {
  try {
    const {
      event_id, ticket_type_id, category_id,
      name, email, phone, gender, occupation,
      amount_paid, payment_method = 'cash', payment_note = '',
      send_email = true,
    } = req.body;

    if (!event_id || !ticket_type_id || !name || !email || !phone)
      return err(res, 'event_id, ticket_type_id, name, email and phone are required.', 400);

    // Validate event
    const [events] = await query('SELECT * FROM events WHERE id=?', [event_id]);
    if (!events.length) return notFoundRes(res, 'Event');

    // Validate ticket type
    const [tts] = await query(
      'SELECT * FROM ticket_types WHERE id=? AND event_id=? AND is_active=1',
      [ticket_type_id, event_id]
    );
    if (!tts.length) return err(res, 'Ticket type not found or inactive.', 400);
    const tt = tts[0];

    // Family registrations: lookup by email + name (not just email)
    // This allows one parent email to register multiple children with different names
    let participantId;
    const tId = stampId(req);
    const [existing] = await query(
      'SELECT id FROM participants WHERE email=? AND name=? AND (tenant_id=? OR (? IS NULL AND tenant_id IS NULL))',
      [email.toLowerCase(), name.trim(), tId, tId]
    );
    if (existing.length) {
      participantId = existing[0].id;
      await query('UPDATE participants SET phone=?, updated_at=NOW() WHERE id=?', [phone, participantId]);
    } else {
      const [ins] = await query(
        'INSERT INTO participants (name, email, phone, gender, occupation, email_subscribed, tenant_id) VALUES (?,?,?,?,?,1,?)',
        [name.trim(), email.toLowerCase(), phone, gender||null, occupation||null, tId]
      );
      participantId = ins.insertId;
    }

    // Prevent duplicate ticket for SAME person (name+email) in same event
    const [[{ dup }]] = await query(
      "SELECT COUNT(*) AS dup FROM tickets WHERE participant_id=? AND event_id=? AND status='paid'",
      [participantId, event_id]
    );
    if (dup > 0) return err(res, 'This participant already has a ticket for this event. For family members, use the same email with a different name.', 409);

    // Generate unique ticket number
    const [[{ cnt }]] = await query('SELECT COUNT(*) AS cnt FROM tickets WHERE event_id=?', [event_id]);
    const uniqueNumber = generateTicketNumber(events[0].edition || 'MYS', cnt + 1);
    const qrData       = ticketQRData(uniqueNumber);
    const qrSvg        = await generateQRCodeSVG(qrData).catch(() => null);
    const amountFinal  = parseFloat(amount_paid) || 0;
    const ticketPrice  = parseFloat(tt.regular_price) || 0;
    const balanceDue   = Math.max(0, ticketPrice - amountFinal);

    const [tRes] = await query(
      `INSERT INTO tickets
         (participant_id, event_id, ticket_type_id, category_id, unique_number,
          qr_code_svg, amount_paid, balance_due, payment_method, payment_note,
          is_early_bird, status, purchased_at, paystack_reference)
       VALUES (?,?,?,?,?,?,?,?,?,?,0,'paid',NOW(),?)`,
      [participantId, event_id, ticket_type_id, category_id || null,
       uniqueNumber, qrSvg, amountFinal, balanceDue,
       payment_method || 'cash', payment_note || null,
       `MANUAL-${Date.now()}-${participantId}`]
    );

    await query('UPDATE ticket_types SET quantity_sold=quantity_sold+1 WHERE id=?', [ticket_type_id]);

    const ticket = {
      id: tRes.insertId, unique_number: uniqueNumber,
      participant_name: name, participant_email: email,
      event_title: events[0].title, qr_code_svg: qrSvg,
      amount_paid: amountFinal, payment_method, payment_note,
      ticket_type_name: tt.name, edition: events[0].edition,
      event_venue: events[0].venue, event_start_date: events[0].start_date,
    };

    // Send ticket confirmation email
    if (send_email) {
      console.log(`  [Email] Sending ticket to ${email}…`);
      sendTicketEmail(ticket)
        .then(() => console.log(`  [Email] ✅ Sent to ${email}`))
        .catch((e) => console.error(`  [Email] ❌ FAILED for ${email}: ${e.message}`));
    }

    ok(res, ticket, `Ticket ${uniqueNumber} created for ${name}.`);
  } catch (e) { next(e); }
});

export default router;

