import { validate, rules } from '../middleware/validate.js';
import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { query } from '../database/db.js';
import { success, error } from '../utils/response.js';
import {
  getSchedule, createEntry, updateEntry,
  deleteEntry, reorderSchedule, cloneSchedule,
} from '../controllers/scheduleController.js';

const router = express.Router();

// Public: view schedule
router.get('/events/:eventId/schedule', getSchedule);

// Admin CRUD
const adm = authenticate, sup = authorize('super_admin','admin');

router.post  ('/events/:eventId/schedule',        adm, sup, validate(rules.createScheduleEntry), createEntry);
router.put   ('/schedule/:id',                    adm, sup, updateEntry);

/* PATCH — update only youtube_url (used by media team upload page) */
router.patch ('/schedule/:id/youtube', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { youtube_url } = req.body;
    await query('UPDATE lectures SET youtube_url = ? WHERE id = ?', [youtube_url || null, id]);
    success(res, null, youtube_url ? 'YouTube link saved.' : 'YouTube link removed.');
  } catch (e) { next(e); }
});

/* POST — notify all attendees that recordings are now available (manual trigger) */
router.post('/events/:eventId/notify-recordings', authenticate, authorize('super_admin','admin'), async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const [[event]] = await query('SELECT title FROM events WHERE id=?', [eventId]);
    if (!event) return error(res, 'Event not found.', 404);

    // Count published recordings
    const [[{ recCount }]] = await query(
      "SELECT COUNT(*) AS recCount FROM lectures WHERE event_id=? AND youtube_url IS NOT NULL AND youtube_url != ''",
      [eventId]
    );
    if (!recCount) return error(res, 'No recordings published yet. Add YouTube links first.', 400);

    // Get attendees with email
    const [attendees] = await query(
      `SELECT DISTINCT p.name, p.email
       FROM attendance a
       JOIN tickets t ON t.id = a.ticket_id
       JOIN participants p ON p.id = t.participant_id
       WHERE t.event_id = ? AND p.email IS NOT NULL AND a.checked_in_at IS NOT NULL`,
      [eventId]
    );
    if (!attendees.length) return error(res, 'No checked-in attendees with email found.', 404);

    res.json({ success: true, message: `Notifying ${attendees.length} attendees about ${recCount} recordings…`, data: { count: attendees.length } });

    // Send in background
    (async () => {
      const { sendCampaignEmail } = await import('../services/emailService.js');
      const watchUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#schedule`;
      for (const a of attendees) {
        try {
          await sendCampaignEmail({
            to: a.email,
            subject: `Session recordings now available — ${event.title}`,
            html: `<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto">
              <div style="background:#02462E;padding:24px;text-align:center">
                <h1 style="color:#FEC700;margin:0;font-size:22px">Recordings Available</h1>
              </div>
              <div style="padding:28px;background:#FBF6E6">
                <p style="color:#333;font-size:15px;line-height:1.7">
                  Assalamu Alaikum ${a.name},<br/><br/>
                  The session recordings from <strong>${event.title}</strong> are now available to watch online.
                  ${recCount} session${recCount>1?'s have':' has'} been published.
                </p>
                <div style="text-align:center;margin:24px 0">
                  <a href="${watchUrl}" style="background:#02462E;color:#fff;padding:14px 32px;
                     text-decoration:none;font-weight:700;border-radius:4px">Watch Recordings</a>
                </div>
                <p style="color:#888;font-size:13px">JazakAllahu Khayran — The MYS Team</p>
              </div></div>`,
          });
          await new Promise(r => setTimeout(r, 200));
        } catch (e) { console.error(`  [Recordings] Email failed for ${a.email}: ${e.message}`); }
      }
      console.log(`  [Recordings] Notified ${attendees.length} attendees.`);
    })();
  } catch (e) { next(e); }
});
router.delete('/schedule/:id',                    adm, sup, deleteEntry);
router.post  ('/events/:eventId/schedule/reorder', adm, sup, reorderSchedule);
// Clone: both URL patterns (frontend uses the first)
router.post  ('/events/:eventId/schedule/clone',   adm, sup, cloneSchedule);
router.post  ('/events/schedule/clone',            adm, sup, cloneSchedule);

export default router;
