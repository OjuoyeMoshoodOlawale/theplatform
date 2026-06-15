import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { generateTags, listTags, assignTag, getPrintableTags, tagStats } from '../controllers/tagController.js';
import { validate, rules } from '../middleware/validate.js';
import { query } from '../database/db.js';
import { success } from '../utils/response.js';

const router = express.Router();
const adm = [authenticate, authorize('super_admin','admin')];

/* ── PUBLIC: look up a tag by number → assigned participant or "not assigned" ──
   Used by the QR code on printed tags. No auth — anyone scanning sees the
   public profile of whoever the tag is assigned to (or that it's unassigned). */
router.get('/lookup/:tagNumber', async (req, res, next) => {
  try {
    const tagNumber = (req.params.tagNumber || '').trim().toUpperCase();
    const [rows] = await query(
      `SELECT et.tag_number, et.assigned_at,
              p.name AS participant_name, p.email, p.phone, p.gender, p.occupation,
              c.name AS category_name, c.color AS category_color,
              tk.unique_number, tk.amount_paid,
              tt.name AS ticket_type_name,
              e.title AS event_title, e.edition, e.venue,
              a.checked_in_at, a.checked_out_at,
              h.name AS hostel_name, ha.room_number
       FROM event_tags et
       LEFT JOIN participants p     ON p.id = et.participant_id
       LEFT JOIN tickets tk         ON tk.id = et.ticket_id
       LEFT JOIN ticket_types tt    ON tt.id = tk.ticket_type_id
       LEFT JOIN event_categories c ON c.id = tk.category_id
       LEFT JOIN events e           ON e.id = et.event_id
       LEFT JOIN attendance a       ON a.ticket_id = et.ticket_id
       LEFT JOIN hostel_assignments ha ON ha.ticket_id = et.ticket_id
       LEFT JOIN hostels h          ON h.id = ha.hostel_id
       WHERE et.tag_number = ?
       ORDER BY a.checked_in_at DESC
       LIMIT 1`,
      [tagNumber]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Tag not found.', found: false });
    }

    const t = rows[0];
    const assigned = !!t.participant_name;

    return success(res, {
      tag_number:   t.tag_number,
      assigned,
      event_title:  t.event_title,
      edition:      t.edition,
      venue:        t.venue,
      participant:  assigned ? {
        name:           t.participant_name,
        email:          t.email,
        phone:          t.phone,
        gender:         t.gender,
        occupation:     t.occupation,
        category:       t.category_name,
        category_color: t.category_color,
        ticket_number:  t.unique_number,
        ticket_type:    t.ticket_type_name,
        amount_paid:    t.amount_paid,
        hostel:         t.hostel_name,
        room_number:    t.room_number,
        checked_in:     !!t.checked_in_at,
        checked_out:    !!t.checked_out_at,
        checked_in_at:  t.checked_in_at,
        checked_out_at: t.checked_out_at,
        assigned_at:    t.assigned_at,
      } : null,
    });
  } catch (e) { next(e); }
});

// Generate tags for a specific event: POST /tags/:eventId/generate
router.post('/:eventId/generate', ...adm, validate(rules.generateTags), (req, res, next) => {
  req.body.event_id = req.params.eventId;
  return generateTags(req, res, next);
});

router.post('/generate', ...adm, validate(rules.generateTags), generateTags);
router.get('/:eventId',       authenticate, listTags);
router.put('/:id/assign',     authenticate, assignTag);
router.patch('/:id/assign',   authenticate, assignTag);
router.get('/:eventId/print', ...adm, getPrintableTags);
router.get('/:eventId/stats', authenticate, tagStats);

// Mark tag as printed
router.patch('/:id/printed', authenticate, async (req, res, next) => {
  try {
    await query('UPDATE event_tags SET is_printed = 1 WHERE id = ?', [req.params.id]);
    success(res, null, 'Tag marked as printed.');
  } catch (e) { next(e); }
});

export default router;
