/**
 * scheduleController.js
 * Full CRUD for event schedule in tabular format:
 * S/N | Day | Time (from → to) | Lecture Title | Lecturer | Facilitators
 */
import { query, transaction } from '../database/db.js';
import { success, created, error, notFound } from '../utils/response.js';

/* ── GET full schedule ───────────────────────────────────────── */
export const getSchedule = async (req, res, next) => {
  try {
    const eventId = req.params.eventId || req.params.id; // works from both routers
    const [rows] = await query(
      `SELECT
         l.id, l.s_n, l.event_day_id,
         d.day_number, d.event_date, d.theme AS day_theme,
         l.start_time, l.end_time,
         l.title, l.lecture_type,
         l.main_speaker_name, l.facilitators,
         l.youtube_url,
         l.description, l.sort_order,
         GROUP_CONCAT(s.name ORDER BY ls.sort_order SEPARATOR '||') AS speaker_names,
         GROUP_CONCAT(s.id  ORDER BY ls.sort_order SEPARATOR ',')  AS speaker_ids
       FROM lectures l
       LEFT JOIN event_days d ON d.id = l.event_day_id
       LEFT JOIN lecture_speakers ls ON ls.lecture_id = l.id
       LEFT JOIN speakers s ON s.id = ls.speaker_id
       WHERE l.event_id = ?
       GROUP BY l.id
       ORDER BY d.day_number, l.s_n, l.sort_order, l.start_time`,
      [eventId]
    );
    success(res, rows);
  } catch (e) { next(e); }
};

/* ── CREATE schedule entry ───────────────────────────────────── */
export const createEntry = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const {
      event_day_id, title, lecture_type,
      start_time, end_time,
      main_speaker_name, facilitators,
      description, youtube_url, speaker_ids = [],
    } = req.body;

    if (!title?.trim()) return error(res, 'Lecture title is required.', 400);

    // Auto s_n per event
    const [[{ maxSn }]] = await query(
      'SELECT COALESCE(MAX(s_n), 0) AS maxSn FROM lectures WHERE event_id=?', [eventId]
    );

    const [r] = await query(
      `INSERT INTO lectures
         (event_id, event_day_id, title, lecture_type,
          start_time, end_time, main_speaker_name, facilitators,
          description, youtube_url, s_n, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventId, event_day_id || null, title.trim(),
       lecture_type || 'lecture',
       start_time || null, end_time || null,
       main_speaker_name || null, facilitators || null,
       description || null, youtube_url || null, maxSn + 1, maxSn + 1]
    );

    const lectureId = r.insertId;

    // Link speakers if provided
    if (speaker_ids.length) {
      for (let i = 0; i < speaker_ids.length; i++) {
        await query(
          'INSERT IGNORE INTO lecture_speakers (lecture_id, speaker_id, sort_order) VALUES (?,?,?)',
          [lectureId, speaker_ids[i], i]
        );
      }
    }

    created(res, { id: lectureId }, 'Schedule entry added.');
  } catch (e) { next(e); }
};

/* ── UPDATE schedule entry ───────────────────────────────────── */
export const updateEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      event_day_id, title, lecture_type,
      start_time, end_time,
      main_speaker_name, facilitators,
      description, youtube_url, s_n, speaker_ids,
    } = req.body;

    await query(
      `UPDATE lectures SET
         event_day_id=?, title=?, lecture_type=?,
         start_time=?, end_time=?,
         main_speaker_name=?, facilitators=?,
         description=?, youtube_url=?, s_n=?, sort_order=?
       WHERE id=?`,
      [event_day_id || null, title, lecture_type || 'lecture',
       start_time || null, end_time || null,
       main_speaker_name || null, facilitators || null,
       description || null, youtube_url || null, s_n || 0, s_n || 0, id]
    );

    // Refresh speaker links
    if (speaker_ids !== undefined) {
      await query('DELETE FROM lecture_speakers WHERE lecture_id=?', [id]);
      for (let i = 0; i < speaker_ids.length; i++) {
        await query(
          'INSERT IGNORE INTO lecture_speakers (lecture_id, speaker_id, sort_order) VALUES (?,?,?)',
          [id, speaker_ids[i], i]
        );
      }
    }

    success(res, null, 'Schedule entry updated.');
  } catch (e) { next(e); }
};

/* ── DELETE schedule entry ───────────────────────────────────── */
export const deleteEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM lecture_speakers WHERE lecture_id=?', [id]);
    await query('DELETE FROM lectures WHERE id=?', [id]);
    success(res, null, 'Entry removed.');
  } catch (e) { next(e); }
};

/* ── REORDER (bulk update s_n) ───────────────────────────────── */
export const reorderSchedule = async (req, res, next) => {
  try {
    const { order } = req.body; // [{id, s_n}]
    for (const item of order) {
      await query('UPDATE lectures SET s_n=?, sort_order=? WHERE id=?',
        [item.s_n, item.s_n, item.id]);
    }
    success(res, null, 'Order saved.');
  } catch (e) { next(e); }
};

/* ── CLONE event schedule to new event ──────────────────────── */
export const cloneSchedule = async (req, res, next) => {
  try {
    // Support: POST /events/:eventId/schedule/clone → toEventId = params.eventId
    // Support: POST /events/schedule/clone          → fromEventId/toEventId in body
    const fromEventId = req.body.fromEventId;
    const toEventId   = req.body.toEventId || req.params.eventId;

    // Copy days (INSERT IGNORE — skip if day_number already exists in target event)
    const [days] = await query(
      'SELECT * FROM event_days WHERE event_id=? ORDER BY day_number', [fromEventId]
    );
    const dayMap = {};
    for (const d of days) {
      try {
        const [r] = await query(
          `INSERT IGNORE INTO event_days (event_id, day_number, event_date, theme, description)
           VALUES (?, ?, ?, ?, ?)`,
          [toEventId, d.day_number, d.event_date, d.theme, d.description]
        );
        if (r.insertId) {
          dayMap[d.id] = r.insertId;
        } else {
          // Day already existed — find its id in target
          const [existing] = await query(
            'SELECT id FROM event_days WHERE event_id=? AND day_number=?',
            [toEventId, d.day_number]
          );
          if (existing.length) dayMap[d.id] = existing[0].id;
        }
      } catch { /* skip duplicate */ }
    }

    // Copy lectures
    const [lectures] = await query(
      'SELECT * FROM lectures WHERE event_id=? ORDER BY s_n', [fromEventId]
    );
    for (const l of lectures) {
      const newDayId = l.event_day_id ? (dayMap[l.event_day_id] || null) : null;
      const [lr] = await query(
        `INSERT INTO lectures
           (event_id, event_day_id, title, lecture_type, start_time, end_time,
            main_speaker_name, facilitators, description, s_n, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [toEventId, newDayId, l.title, l.lecture_type, l.start_time, l.end_time,
         l.main_speaker_name, l.facilitators, l.description, l.s_n, l.sort_order]
      );
      // Copy speaker links
      const [lsRows] = await query(
        'SELECT * FROM lecture_speakers WHERE lecture_id=?', [l.id]
      );
      for (const ls of lsRows) {
        await query(
          'INSERT IGNORE INTO lecture_speakers (lecture_id, speaker_id, sort_order) VALUES (?,?,?)',
          [lr.insertId, ls.speaker_id, ls.sort_order]
        );
      }
    }

    success(res, null, `Schedule cloned from event ${fromEventId} to ${toEventId}.`);
  } catch (e) { next(e); }
};

/* ── Send facilitator reminder emails ────────────────────────── */
export const sendFacilitatorReminders = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { lecture_ids } = req.body; // optional: specific lecture IDs, else all for event

    // Get event info
    const [events] = await query('SELECT * FROM events WHERE id=?', [eventId]);
    if (!events.length) { const { notFound } = await import('../utils/response.js'); return notFound(res, 'Event'); }
    const event = events[0];

    // Get lectures with facilitators
    let sql = `SELECT id, title, start_time, end_time, event_day_id,
                      main_speaker_name, facilitators
               FROM lectures WHERE event_id=? AND facilitators IS NOT NULL AND facilitators != ''`;
    const params = [eventId];
    if (lecture_ids?.length) { sql += ` AND id IN (${lecture_ids.map(()=>'?').join(',')})`; params.push(...lecture_ids); }

    const [lectures] = await query(sql, params);
    if (!lectures.length) {
      const { error } = await import('../utils/response.js');
      return error(res, 'No lectures with facilitators found.', 400);
    }

    // Get day dates
    const [days] = await query('SELECT * FROM event_days WHERE event_id=?', [eventId]);
    const dayMap = Object.fromEntries(days.map(d => [d.id, d]));

    const { createTransport } = await import('nodemailer');
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    let sent = 0, failed = 0, skipped = 0;
    const results = [];

    for (const lec of lectures) {
      const names = lec.facilitators.split(',').map(n => n.trim()).filter(Boolean);
      const day   = lec.event_day_id ? dayMap[lec.event_day_id] : null;

      for (const facilitatorName of names) {
        // Try to find email from participants table by name match (best effort)
        const [matches] = await query(
          'SELECT email FROM participants WHERE name LIKE ? LIMIT 1',
          [`%${facilitatorName}%`]
        );
        if (!matches.length) { skipped++; results.push({ facilitator: facilitatorName, status: 'no_email' }); continue; }

        const recipientEmail = matches[0].email;
        try {
          await transporter.sendMail({
            from:    process.env.EMAIL_FROM || 'MYS <noreply@mys.com>',
            to:      recipientEmail,
            subject: `[Reminder] You are facilitating "${lec.title}" — ${event.title}`,
            html: `
              <div style="font-family:'Segoe UI',sans-serif;max-width:580px;margin:0 auto;background:#FBF6E6;padding:32px 24px">
                <img src="https://muslimyouthsummit.com/logos/logo-black.png" alt="MYS" style="height:44px;margin-bottom:24px" />
                <h2 style="color:#02462E;font-size:22px;margin:0 0 8px">Assalamu Alaikum, ${facilitatorName}!</h2>
                <p style="color:#555;line-height:1.7">This is a reminder that you are listed as a <strong>facilitator</strong> for the following session:</p>
                <div style="background:#02462E;color:white;padding:20px 24px;margin:20px 0;border-left:4px solid #FEC700">
                  <p style="margin:0 0 6px;font-size:18px;font-weight:bold">${lec.title}</p>
                  ${day ? `<p style="margin:0 0 4px;color:rgba(255,255,255,0.7)">Day ${day.day_number} — ${new Date(day.event_date).toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long'})}</p>` : ''}
                  ${lec.start_time ? `<p style="margin:0;color:#FEC700;font-weight:bold">${lec.start_time}${lec.end_time ? ' – ' + lec.end_time : ''}</p>` : ''}
                  ${lec.main_speaker_name ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:13px">Lecturer: ${lec.main_speaker_name}</p>` : ''}
                </div>
                <div style="background:#fff;border:1px solid #e5e7eb;padding:16px 20px;margin:16px 0">
                  <p style="margin:0 0 8px;font-weight:bold;color:#02462E">Event Details</p>
                  <p style="margin:0;color:#555;font-size:14px">${event.title} — ${event.venue || ''}</p>
                  <p style="margin:4px 0 0;color:#555;font-size:14px">${new Date(event.start_date).toLocaleDateString('en-NG',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
                </div>
                <p style="color:#888;font-size:13px;margin-top:24px">Please ensure you arrive at least 15 minutes before your session. JazakAllahu Khayran.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
                <p style="color:#aaa;font-size:12px;margin:0">Muslim Youth Summit Admin</p>
              </div>`,
          });
          await query(
            `INSERT INTO facilitator_reminders (lecture_id, email, sent_at, status) VALUES (?,?,NOW(),'sent')
             ON DUPLICATE KEY UPDATE sent_at=NOW(), status='sent'`,
            [lec.id, recipientEmail]
          );
          sent++; results.push({ facilitator: facilitatorName, email: recipientEmail, status: 'sent' });
        } catch (emailErr) {
          failed++; results.push({ facilitator: facilitatorName, email: recipientEmail, status: 'failed', error: emailErr.message });
        }
      }
    }

    const { success } = await import('../utils/response.js');
    success(res, { sent, failed, skipped, results },
      `Reminders: ${sent} sent, ${failed} failed, ${skipped} skipped (no email found).`);
  } catch (e) { next(e); }
};
