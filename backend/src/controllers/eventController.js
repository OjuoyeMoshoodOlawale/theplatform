import { query, transaction } from '../database/db.js';
import { success, created, error, notFound as notFoundRes, paginated, buildPagination } from '../utils/response.js';
import { parsePagination } from '../utils/helpers.js';
import { tenantWhere, stampId } from '../utils/tenantScope.js';

// ═══════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ═══════════════════════════════════════════════════════════

// ── Get Active Event ─────────────────────────────────────────
export const getActiveEvent = async (req, res, next) => {
  try {
    const t = tenantWhere(req, 'e');
    const [events] = await query(
      `SELECT e.*, a.name AS created_by_name
       FROM events e
       LEFT JOIN admins a ON a.id = e.created_by
       WHERE e.status = 'active'${t.clause}
       ORDER BY e.start_date ASC LIMIT 1`,
      [...t.params]
    );

    if (events.length) {
      const event = events[0];
      const eventData = await enrichEvent(event.id, event);
      return success(res, { ...eventData, is_past: false });
    }

    // No active event — fall back to the most recently completed event so the
    // landing page still shows the last event's schedule, speakers and recordings.
    const [completed] = await query(
      `SELECT e.*, a.name AS created_by_name
       FROM events e
       LEFT JOIN admins a ON a.id = e.created_by
       WHERE e.status = 'completed'
       ORDER BY e.end_date DESC, e.start_date DESC LIMIT 1`
    );

    if (completed.length) {
      const event = completed[0];
      const eventData = await enrichEvent(event.id, event);
      // is_past = true tells the frontend to show 'Event Closed' and hide registration
      return success(res, { ...eventData, is_past: true });
    }

    return success(res, null, 'No active event.');
  } catch (err) {
    next(err);
  }
};

// ── Get All Events (public + admin dropdown) ─────────────────
export const getPublicEvents = async (req, res, next) => {
  try {
    const t = tenantWhere(req);
    const [events] = await query(
      `SELECT id, title, tagline, edition, start_date, end_date,
              venue, status, cover_image_url, early_bird_closes_at,
              CONCAT('[', edition, '] ', title) AS display_title
       FROM events WHERE status IN ('active','completed','draft','archived')${t.clause}
       ORDER BY start_date DESC`,
      [...t.params]
    );
    return success(res, events);
  } catch (err) {
    next(err);
  }
};

// ── Get Past Events ─────────────────────────────────────────
export const getPastEvents = async (req, res, next) => {
  try {
    const inc  = (req.query.include || '').split(',').map(s => s.trim());
    const withGallery  = inc.includes('gallery')  || req.query.include_gallery === '1';
    const withLectures = inc.includes('lectures');
    const withSpeakers = inc.includes('speakers');

    const [events] = await query(
      `SELECT e.*,
              COUNT(DISTINCT t.id) AS total_participants,
              COUNT(DISTINCT g.id) AS gallery_count
       FROM events e
       LEFT JOIN tickets t ON t.event_id = e.id AND t.status = 'paid'
       LEFT JOIN event_gallery g ON g.event_id = e.id
       WHERE e.status IN ('completed','archived')
       GROUP BY e.id ORDER BY e.start_date DESC`
    );

    for (const ev of events) {
      if (withGallery) {
        const [imgs] = await query(
          'SELECT id, image_url, thumbnail_url, caption FROM event_gallery WHERE event_id=? ORDER BY sort_order LIMIT 20',
          [ev.id]
        );
        ev.gallery = imgs;
      }
      if (withLectures) {
        const [days] = await query('SELECT * FROM event_days WHERE event_id=? ORDER BY day_number', [ev.id]);
        const [lecs] = await query(
          'SELECT id, event_day_id, s_n, title, lecture_type, start_time, end_time, main_speaker_name, facilitators FROM lectures WHERE event_id=? ORDER BY event_day_id, sort_order, start_time',
          [ev.id]
        );
        ev.days = days; ev.lectures = lecs;
      }
      if (withSpeakers) {
        const [spks] = await query(
          'SELECT id, name, title, bio, photo_url FROM speakers WHERE event_id=? ORDER BY sort_order', [ev.id]
        );
        ev.speakers = spks;
      }
    }
    return success(res, events);
  } catch (err) { next(err); }
};

// ── Get Single Event ────────────────────────────────────────
export const getEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const t = tenantWhere(req, '');
    const [events] = await query(
      `SELECT * FROM events WHERE id = ?${t.clause}`,
      [id, ...t.params]
    );

    if (!events.length) return notFoundRes(res, 'Event');

    const eventData = await enrichEvent(id, events[0]);
    return success(res, eventData);
  } catch (err) {
    next(err);
  }
};

// ── Get Event Schedule ───────────────────────────────────────
export const getEventSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [days] = await query(
      'SELECT * FROM event_days WHERE event_id = ? ORDER BY day_number',
      [id]
    );

    const [lectures] = await query(
      `SELECT l.*, GROUP_CONCAT(s.name SEPARATOR '||') AS speaker_names,
              GROUP_CONCAT(s.id SEPARATOR ',') AS speaker_ids
       FROM lectures l
       LEFT JOIN lecture_speakers ls ON ls.lecture_id = l.id
       LEFT JOIN speakers s ON s.id = ls.speaker_id
       WHERE l.event_id = ?
       GROUP BY l.id
       ORDER BY l.event_day_id, l.sort_order, l.start_time`,
      [id]
    );

    return success(res, { days, lectures });
  } catch (err) {
    next(err);
  }
};

// ── Get Event Speakers ───────────────────────────────────────
export const getEventSpeakers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [speakers] = await query(
      'SELECT * FROM speakers WHERE event_id = ? ORDER BY sort_order, name',
      [id]
    );
    return success(res, speakers);
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════

// ── List All Events (Admin) ──────────────────────────────────
export const adminListEvents = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const statusFilter = req.query.status || null;

    const params = [];
    let whereClause = 'WHERE 1=1';
    if (statusFilter) {
      whereClause += ' AND e.status = ?';
      params.push(statusFilter);
    }
    const t = tenantWhere(req, 'e');
    whereClause += t.clause;
    params.push(...t.params);

    const [[{ total }]] = await query(
      `SELECT COUNT(*) AS total FROM events e ${whereClause}`,
      params
    );

    const [events] = await query(
      `SELECT e.*, a.name AS created_by_name,
              (SELECT COUNT(*) FROM tickets t WHERE t.event_id = e.id AND t.status = 'paid') AS tickets_sold
       FROM events e
       LEFT JOIN admins a ON a.id = e.created_by
       ${whereClause}
       ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return paginated(res, events, buildPagination(total, page, limit));
  } catch (err) {
    next(err);
  }
};

// ── Create Event ─────────────────────────────────────────────
export const createEvent = async (req, res, next) => {
  try {
    const {
      title, tagline, edition, description,
      start_date, end_date,
      venue, venue_address, early_bird_closes_at,
      ticket_types = [],
    } = req.body;

    // Generate a URL-safe slug
    const slug = `${edition}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      + '-' + Date.now();

    const [result] = await query(
      `INSERT INTO events
        (title, tagline, edition, slug, description, start_date, end_date,
         venue, venue_address, early_bird_closes_at, status, created_by, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [
        title, tagline || null, edition, slug, description || null,
        start_date, end_date,
        venue || null, venue_address || null, early_bird_closes_at || null,
        req.admin.id, stampId(req),
      ]
    );

    const eventId = result.insertId;

    // Optionally create ticket types in same request
    for (const tt of ticket_types) {
      if (tt.name && (tt.regular_price !== undefined)) {
        await query(
          `INSERT INTO ticket_types (event_id, name, regular_price, early_bird_price, quantity_available)
           VALUES (?, ?, ?, ?, ?)`,
          [eventId, tt.name, tt.regular_price || 0, tt.early_bird_price || null, tt.quantity_available || null]
        );
      }
    }

    return created(res, { id: eventId }, 'Event created successfully. It is currently in draft — activate it when ready.');
  } catch (err) {
    next(err);
  }
};

// ── Update Event ─────────────────────────────────────────────
export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title, tagline, edition, description,
      start_date, end_date,
      venue, venue_address, early_bird_closes_at,
    } = req.body;

    const tU = tenantWhere(req, '');
    const [existing] = await query(`SELECT id FROM events WHERE id = ?${tU.clause}`, [id, ...tU.params]);
    if (!existing.length) return notFoundRes(res, 'Event');

    await query(
      `UPDATE events SET
         title = ?, tagline = ?, edition = ?, description = ?,
         start_date = ?, end_date = ?,
         venue = ?, venue_address = ?, early_bird_closes_at = ?,
         updated_at = NOW()
       WHERE id = ?`,
      [
        title, tagline || null, edition, description || null,
        start_date, end_date,
        venue || null, venue_address || null, early_bird_closes_at || null,
        id,
      ]
    );

    return success(res, null, 'Event updated successfully.');
  } catch (err) {
    next(err);
  }
};

// ── Change Event Status ──────────────────────────────────────
export const changeEventStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return error(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const tS = tenantWhere(req, '');
    const [existing] = await query(`SELECT id, status FROM events WHERE id = ?${tS.clause}`, [id, ...tS.params]);
    if (!existing.length) return notFoundRes(res, 'Event');

    // Only one event can be active at a time
    if (status === 'active') {
      const [activeEvents] = await query(
        "SELECT id FROM events WHERE status = 'active' AND id != ?",
        [id]
      );
      if (activeEvents.length) {
        return error(res, 'Another event is currently active. Please deactivate it first.');
      }
    }

    await query('UPDATE events SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);

    // When an event is COMPLETED, email a certificate to every checked-in participant
    if (status === 'completed' && existing[0].status !== 'completed') {
      try {
        const [attendees] = await query(
          `SELECT DISTINCT p.name, p.email, t.unique_number, e.title AS event_title
           FROM attendance a
           JOIN tickets t      ON t.id = a.ticket_id
           JOIN participants p ON p.id = t.participant_id
           JOIN events e       ON e.id = t.event_id
           WHERE t.event_id = ? AND a.checked_in_at IS NOT NULL AND p.email IS NOT NULL`,
          [id]
        );
        if (attendees.length) {
          const { sendCertificateEmail } = await import('../services/emailService.js');
          console.log(`  [Cert] Sending ${attendees.length} certificates for event ${id}…`);
          // Send sequentially with small delay to respect SMTP rate limits
          (async () => {
            for (const a of attendees) {
              try {
                await sendCertificateEmail({
                  to: a.email, name: a.name,
                  eventTitle: a.event_title, uniqueNumber: a.unique_number,
                });
              } catch (e) { console.error(`  [Cert] Failed for ${a.email}: ${e.message}`); }
              await new Promise(r => setTimeout(r, 200));
            }
            console.log(`  [Cert] Certificate batch complete.`);
          })();
        }
      } catch (e) { console.error(`  [Cert] Batch error: ${e.message}`); }
    }

    const messages = {
      active: 'Event is now LIVE and visible on the landing page!',
      draft: 'Event moved back to draft.',
      completed: 'Event marked as completed. Certificates are being emailed to all attendees.',
      cancelled: 'Event has been cancelled.',
    };

    return success(res, null, messages[status]);
  } catch (err) {
    next(err);
  }
};

// ── Delete Event (super_admin) ───────────────────────────────
export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tD = tenantWhere(req, '');
    const [existing] = await query(`SELECT id FROM events WHERE id = ?${tD.clause}`, [id, ...tD.params]);
    if (!existing.length) return notFoundRes(res, 'Event');

    await query('DELETE FROM events WHERE id = ?', [id]);
    return success(res, null, 'Event deleted permanently.');
  } catch (err) {
    next(err);
  }
};

// ── Event Days ───────────────────────────────────────────────
export const addEventDay = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { day_number, date, theme, description } = req.body;

    const [result] = await query(
      'INSERT INTO event_days (event_id, day_number, date, theme, description) VALUES (?, ?, ?, ?, ?)',
      [id, day_number, date, theme, description]
    );

    return created(res, { id: result.insertId }, 'Day added to event.');
  } catch (err) {
    next(err);
  }
};

export const updateEventDay = async (req, res, next) => {
  try {
    const { dayId } = req.params;
    const { date, theme, description } = req.body;

    await query(
      'UPDATE event_days SET date = ?, theme = ?, description = ? WHERE id = ?',
      [date, theme, description, dayId]
    );
    return success(res, null, 'Day updated.');
  } catch (err) {
    next(err);
  }
};

export const deleteEventDay = async (req, res, next) => {
  try {
    await query('DELETE FROM event_days WHERE id = ?', [req.params.dayId]);
    return success(res, null, 'Day removed from event.');
  } catch (err) {
    next(err);
  }
};

// ── Lectures ─────────────────────────────────────────────────
export const addLecture = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { day_id, title, description, start_time, end_time, location, sort_order, speaker_ids } = req.body;

    const [result] = await query(
      `INSERT INTO lectures (event_id, day_id, title, description, start_time, end_time, location, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, day_id || null, title, description, start_time, end_time, location, sort_order || 0]
    );

    const lectureId = result.insertId;

    if (speaker_ids && speaker_ids.length) {
      for (const sid of speaker_ids) {
        await query('INSERT INTO lecture_speakers (lecture_id, speaker_id) VALUES (?, ?)', [lectureId, sid]);
      }
    }

    return created(res, { id: lectureId }, 'Lecture series added successfully.');
  } catch (err) {
    next(err);
  }
};

export const updateLecture = async (req, res, next) => {
  try {
    const { lid } = req.params;
    const { day_id, title, description, start_time, end_time, location, sort_order, speaker_ids } = req.body;

    await query(
      `UPDATE lectures SET day_id = ?, title = ?, description = ?, start_time = ?,
       end_time = ?, location = ?, sort_order = ? WHERE id = ?`,
      [day_id || null, title, description, start_time, end_time, location, sort_order || 0, lid]
    );

    if (speaker_ids !== undefined) {
      await query('DELETE FROM lecture_speakers WHERE lecture_id = ?', [lid]);
      for (const sid of speaker_ids) {
        await query('INSERT INTO lecture_speakers (lecture_id, speaker_id) VALUES (?, ?)', [lid, sid]);
      }
    }

    return success(res, null, 'Lecture updated.');
  } catch (err) {
    next(err);
  }
};

export const deleteLecture = async (req, res, next) => {
  try {
    await query('DELETE FROM lectures WHERE id = ?', [req.params.lid]);
    return success(res, null, 'Lecture removed.');
  } catch (err) {
    next(err);
  }
};

// ── Speakers ─────────────────────────────────────────────────
export const addSpeaker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, title, bio, photo_url, sort_order } = req.body;

    // The event must belong to this tenant
    const t = tenantWhere(req, 'e');
    const [ev] = await query(`SELECT e.id FROM events e WHERE e.id=?${t.clause}`, [id, ...t.params]);
    if (!ev.length) return notFoundRes(res, 'Event');

    const [result] = await query(
      `INSERT INTO speakers (event_id, name, title, bio, photo_url, sort_order, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, title || null, bio || null, photo_url || null, sort_order || 0, stampId(req)]
    );

    return created(res, { id: result.insertId }, 'Speaker added successfully.');
  } catch (err) {
    next(err);
  }
};

export const updateSpeaker = async (req, res, next) => {
  try {
    const { sid } = req.params;
    const { name, title, bio, photo_url, sort_order } = req.body;

    await query(
      `UPDATE speakers SET name = ?, title = ?, bio = ?, photo_url = ?, sort_order = ?
       WHERE id = ?`,
      [name, title || null, bio || null, photo_url || null, sort_order || 0, sid]
    );

    return success(res, null, 'Speaker updated.');
  } catch (err) {
    next(err);
  }
};

export const deleteSpeaker = async (req, res, next) => {
  try {
    await query('DELETE FROM speakers WHERE id = ?', [req.params.sid]);
    return success(res, null, 'Speaker removed.');
  } catch (err) {
    next(err);
  }
};

// ── Ticket Types ─────────────────────────────────────────────
export const getTicketTypes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [types] = await query(
      'SELECT * FROM ticket_types WHERE event_id = ? AND is_active = 1 ORDER BY regular_price',
      [id]
    );
    return success(res, types);
  } catch (err) {
    next(err);
  }
};

export const addTicketType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, regular_price, early_bird_price, quantity_available } = req.body;

    const [result] = await query(
      `INSERT INTO ticket_types
        (event_id, name, regular_price, early_bird_price, quantity_available)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, regular_price || 0, early_bird_price || null, quantity_available || null]
    );

    return created(res, { id: result.insertId }, 'Ticket type added successfully.');
  } catch (err) {
    next(err);
  }
};

export const updateTicketType = async (req, res, next) => {
  try {
    const { tid } = req.params;
    const { name, regular_price, early_bird_price, quantity_available, is_active } = req.body;

    await query(
      `UPDATE ticket_types SET name = ?, regular_price = ?,
       early_bird_price = ?, quantity_available = ?, is_active = ?
       WHERE id = ?`,
      [name, regular_price || 0, early_bird_price || null, quantity_available || null, is_active ? 1 : 0, tid]
    );

    return success(res, null, 'Ticket type updated.');
  } catch (err) {
    next(err);
  }
};

// ── Internal: Enrich Event ───────────────────────────────────
async function enrichEvent(eventId, event) {
  const [days] = await query(
    'SELECT * FROM event_days WHERE event_id = ? ORDER BY day_number',
    [eventId]
  );

  const [lectures] = await query(
    `SELECT l.*, GROUP_CONCAT(s.name SEPARATOR ', ') AS speaker_names
     FROM lectures l
     LEFT JOIN lecture_speakers ls ON ls.lecture_id = l.id
     LEFT JOIN speakers s ON s.id = ls.speaker_id
     WHERE l.event_id = ?
     GROUP BY l.id ORDER BY l.event_day_id, l.sort_order, l.start_time`,
    [eventId]
  );

  const [speakers] = await query(
    'SELECT * FROM speakers WHERE event_id = ? ORDER BY sort_order, name',
    [eventId]
  );

  const [ticketTypes] = await query(
    `SELECT *, CASE
       WHEN early_bird_price IS NOT NULL AND early_bird_price > 0 THEN 1
       ELSE 0 END AS has_early_bird
     FROM ticket_types WHERE event_id = ? AND is_active = 1
     ORDER BY sort_order, participant_category, regular_price`,
    [eventId]
  );

  // Stats — defensive: handle case where balance_due column doesn't exist yet
  let stats = { total_sold: 0, total_revenue: 0, partial_payments: 0 };
  try {
    const [[s]] = await query(
      `SELECT
         SUM(status='paid') AS total_sold,
         SUM(CASE WHEN status='paid' THEN amount_paid ELSE 0 END) AS total_revenue,
         SUM(CASE WHEN status='paid' AND balance_due > 0 THEN 1 ELSE 0 END) AS partial_payments
       FROM tickets WHERE event_id = ?`,
      [eventId]
    );
    stats = s || stats;
  } catch {
    // balance_due column may not exist on older DBs — run migrate.sql
    try {
      const [[s]] = await query(
        `SELECT SUM(status='paid') AS total_sold,
                SUM(CASE WHEN status='paid' THEN amount_paid ELSE 0 END) AS total_revenue
         FROM tickets WHERE event_id = ?`,
        [eventId]
      );
      stats = { ...stats, ...s };
    } catch {}
  }

  return { ...event, days, lectures, speakers, ticketTypes, stats };
}
