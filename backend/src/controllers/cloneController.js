// This file adds the cloneEvent export that gets appended via the route
// to eventController by direct import. Kept separate to avoid re-running full controller.
import { query } from '../database/db.js';
import { success, error } from '../utils/response.js';

export const cloneEvent = async (req, res, next) => {
  try {
    const { sourceEventId, title, edition, start_date, end_date, shift_days } = req.body;

    // Load source event
    const [src] = await query('SELECT * FROM events WHERE id=?', [sourceEventId]);
    if (!src.length) return error(res, 'Source event not found.', 404);
    const s = src[0];

    // Calculate date offset
    const dayOffset = shift_days ? parseInt(shift_days) : 0;
    const offsetDate = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      dt.setDate(dt.getDate() + dayOffset);
      return dt.toISOString().slice(0, 10);
    };

    const slug = `${edition || s.edition}-${(title || s.title)}`.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/, '') + '-' + Date.now();

    // Create new event
    const [r] = await query(
      `INSERT INTO events
         (title, tagline, edition, slug, description, start_date, end_date,
          venue, venue_address, early_bird_closes_at, status, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title || s.title, s.tagline, edition || s.edition, slug, s.description,
       start_date || offsetDate(s.start_date), end_date || offsetDate(s.end_date),
       s.venue, s.venue_address,
       s.early_bird_closes_at ? offsetDate(s.early_bird_closes_at) : null,
       'draft', req.admin.id]
    );
    const newId = r.insertId;

    // Clone ticket types
    const [tts] = await query(
      'SELECT * FROM ticket_types WHERE event_id=? AND is_active=1', [sourceEventId]
    );
    for (const tt of tts) {
      await query(
        `INSERT INTO ticket_types (event_id, name, regular_price, early_bird_price, quantity_available)
         VALUES (?,?,?,?,?)`,
        [newId, tt.name, tt.regular_price, tt.early_bird_price, tt.quantity_available]
      );
    }

    // Clone categories
    const [cats] = await query(
      'SELECT * FROM event_categories WHERE event_id=? AND is_active=1 ORDER BY sort_order', [sourceEventId]
    );
    for (const c of cats) {
      await query(
        `INSERT INTO event_categories (event_id, name, description, color, capacity, sort_order)
         VALUES (?,?,?,?,?,?)`,
        [newId, c.name, c.description, c.color, c.capacity, c.sort_order]
      );
    }

    // Clone event days with date offset
    const [days] = await query(
      'SELECT * FROM event_days WHERE event_id=? ORDER BY day_number', [sourceEventId]
    );
    const dayMap = {};
    for (const d of days) {
      const [dr] = await query(
        `INSERT INTO event_days (event_id, day_number, event_date, theme, description)
         VALUES (?,?,?,?,?)`,
        [newId, d.day_number, offsetDate(d.event_date), d.theme, d.description]
      );
      dayMap[d.id] = dr.insertId;
    }

    // Clone schedule (lectures) — times stay, only dates shift
    const [lecs] = await query(
      'SELECT * FROM lectures WHERE event_id=? ORDER BY s_n', [sourceEventId]
    );
    for (const l of lecs) {
      const newDayId = l.event_day_id ? (dayMap[l.event_day_id] || null) : null;
      const [lr] = await query(
        `INSERT INTO lectures
           (event_id, event_day_id, title, lecture_type, start_time, end_time,
            main_speaker_name, facilitators, description, s_n, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [newId, newDayId, l.title, l.lecture_type, l.start_time, l.end_time,
         l.main_speaker_name, l.facilitators, l.description, l.s_n, l.sort_order]
      );
      // speaker links
      const [lsRows] = await query('SELECT * FROM lecture_speakers WHERE lecture_id=?', [l.id]);
      for (const ls of lsRows) {
        await query('INSERT IGNORE INTO lecture_speakers (lecture_id,speaker_id,sort_order) VALUES (?,?,?)',
          [lr.insertId, ls.speaker_id, ls.sort_order]);
      }
    }

    success(res, { id: newId },
      `Event cloned successfully as draft. ${tts.length} ticket type(s), ${cats.length} category(ies), ${lecs.length} schedule entry(ies) copied.`
    );
  } catch (e) { next(e); }
};
