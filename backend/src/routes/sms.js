import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { query } from '../database/db.js';
import { success, error, created } from '../utils/response.js';
import { sendSMS, sendBulkSMS, smsTemplates, normPhone } from '../services/smsService.js';

const router = express.Router();
const adm    = [authenticate, authorize('super_admin', 'admin')];

/* ── Send SMS to single participant ─────────────────────────── */
router.post('/sms/send', ...adm, async (req, res, next) => {
  try {
    const { phone, message, participant_id } = req.body;
    if (!phone)    return error(res, 'Phone number required.', 400);
    if (!message)  return error(res, 'Message required.', 400);

    const result = await sendSMS(phone, message);
    if (!result.success) return error(res, result.error || 'SMS failed.', 500);
    success(res, { to: result.to }, 'SMS sent.');
  } catch (e) { next(e); }
});

/* ── Bulk SMS to event participants ─────────────────────────── */
router.post('/sms/bulk', ...adm, async (req, res, next) => {
  try {
    const { event_id, message, category_id, checked_in, not_checked_in } = req.body;
    if (!message) return error(res, 'Message required.', 400);

    let where = "WHERE t.status = 'paid' AND p.phone IS NOT NULL";
    const params = [];

    if (event_id)       { where += ' AND t.event_id = ?';    params.push(event_id); }
    if (category_id)    { where += ' AND t.category_id = ?'; params.push(category_id); }
    if (checked_in === '1') {
      where += ' AND EXISTS (SELECT 1 FROM attendance a WHERE a.ticket_id=t.id AND a.checked_in_at IS NOT NULL AND a.checked_out_at IS NULL)';
    }
    if (not_checked_in === '1') {
      where += ' AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.ticket_id=t.id AND a.checked_in_at IS NOT NULL)';
    }

    const [participants] = await query(
      `SELECT DISTINCT p.name, p.phone FROM participants p
       JOIN tickets t ON t.participant_id = p.id ${where}`,
      params
    );

    if (!participants.length) return error(res, 'No participants found matching filters.', 404);

    const phones = participants.map(p => p.phone).filter(Boolean);
    res.json({ success: true, message: `Sending to ${phones.length} recipients…`, data: { count: phones.length } });

    // Fire and forget
    sendBulkSMS(phones, message).catch(console.error);
  } catch (e) { next(e); }
});

/* ── Event reminder SMS to all paid participants ───────────── */
router.post('/sms/event-reminder/:eventId', ...adm, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const [[event]] = await query(
      'SELECT title, start_date, venue FROM events WHERE id=?', [eventId]
    );
    if (!event) return error(res, 'Event not found.', 404);

    const [parts] = await query(
      `SELECT DISTINCT p.name, p.phone FROM participants p
       JOIN tickets t ON t.participant_id = p.id
       WHERE t.event_id = ? AND t.status = 'paid' AND p.phone IS NOT NULL`,
      [eventId]
    );

    if (!parts.length) return error(res, 'No participants with phone numbers.', 404);

    const dateStr = new Date(event.start_date).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' });
    const phones  = parts.map(p => p.phone);

    res.json({ success: true, message: `Sending reminder to ${phones.length} participants…`, data: { count: phones.length } });

    // Personalised or bulk
    if (parts.length <= 50) {
      // Personalised for smaller groups
      for (const p of parts) {
        sendSMS(p.phone, smsTemplates.eventReminder(p.name, event.title, dateStr, event.venue || 'the venue')).catch(() => {});
        await new Promise(r => setTimeout(r, 100)); // rate limit
      }
    } else {
      // Generic bulk for large groups
      const msg = smsTemplates.eventReminder('', event.title, dateStr, event.venue || 'the venue')
        .replace('Alaykum !', 'Alaykum!');
      sendBulkSMS(phones, msg).catch(() => {});
    }
  } catch (e) { next(e); }
});

/* ── Balance reminder SMS ───────────────────────────────────── */
router.post('/sms/balance-reminder/:eventId', ...adm, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const [[event]] = await query('SELECT title FROM events WHERE id=?', [eventId]);
    if (!event) return error(res, 'Event not found.', 404);

    const [rows] = await query(
      `SELECT p.name, p.phone, t.balance_due FROM participants p
       JOIN tickets t ON t.participant_id = p.id
       WHERE t.event_id = ? AND t.status = 'paid' AND t.balance_due > 0 AND p.phone IS NOT NULL`,
      [eventId]
    );

    if (!rows.length) return error(res, 'No outstanding balances found.', 404);

    res.json({ success: true, message: `Sending balance reminders to ${rows.length} participants…`, data: { count: rows.length } });

    for (const row of rows) {
      sendSMS(row.phone, smsTemplates.balanceReminder(row.name, row.balance_due, event.title)).catch(() => {});
      await new Promise(r => setTimeout(r, 100));
    }
  } catch (e) { next(e); }
});

/* ── SMS provider status / balance check ───────────────────── */
router.get('/sms/status', ...adm, async (req, res, next) => {
  try {
    const apiKey = process.env.TERMII_API_KEY;
    if (!apiKey) {
      return success(res, {
        configured: false,
        message: 'TERMII_API_KEY not set in .env. Add your Termii API key to enable SMS.',
      });
    }
    // Check Termii balance
    const resp = await fetch(
      `https://api.ng.termii.com/api/get-balance?api_key=${apiKey}`
    );
    const data = await resp.json();
    success(res, { configured: true, balance: data.balance, currency: data.currency, provider: 'Termii' });
  } catch (e) {
    success(res, { configured: false, error: e.message });
  }
});

export default router;
// file appended below existing SMS routes — this is intentional
