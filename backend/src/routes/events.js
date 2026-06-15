import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, rules } from '../middleware/validate.js';
import { query } from '../database/db.js';
import { success } from '../utils/response.js';
import {
  getActiveEvent, getPublicEvents, getPastEvents, getEvent, getEventSpeakers,
  adminListEvents, createEvent, updateEvent, changeEventStatus, deleteEvent,
  addEventDay, updateEventDay, deleteEventDay,
  addSpeaker, updateSpeaker, deleteSpeaker,
} from '../controllers/eventController.js';
import { getSchedule, createEntry, updateEntry, deleteEntry } from '../controllers/scheduleController.js';

const router = express.Router();

// Public
router.get('/', getPublicEvents);
router.get('/active', getActiveEvent);
router.get('/past', getPastEvents);
router.get('/:id', getEvent);
router.get('/:id/schedule', getSchedule);
router.get('/:id/speakers', getEventSpeakers);
// Ticket types are managed via /api/events/:id/ticket-types (ticketTypes.js)
router.get('/:id/lectures', getSchedule); // alias
router.get('/:id/days', async (req, res, next) => {
  try {
    const [rows] = await query('SELECT * FROM event_days WHERE event_id=? ORDER BY day_number', [req.params.id]);
    success(res, rows);
  } catch (e) { next(e); }
});

// Admin
router.get('/admin/all', authenticate, authorize('super_admin', 'admin'), adminListEvents);
router.post('/', authenticate, authorize('super_admin', 'admin'), validate(rules.createEvent), createEvent);
router.put('/:id', authenticate, authorize('super_admin', 'admin'), updateEvent);
router.delete('/:id', authenticate, authorize('super_admin'), deleteEvent);
router.put('/:id/status', authenticate, authorize('super_admin', 'admin'), changeEventStatus);
router.patch('/:id/status', authenticate, authorize('super_admin', 'admin'), changeEventStatus);

// Days
router.post('/:id/days', authenticate, authorize('super_admin', 'admin'), addEventDay);
router.put('/:id/days/:dayId', authenticate, authorize('super_admin', 'admin'), updateEventDay);
router.delete('/:id/days/:dayId', authenticate, authorize('super_admin', 'admin'), deleteEventDay);

// Lectures
// Lectures (schedule) — unified with scheduleController for consistent fields
router.post('/:id/lectures',      authenticate, authorize('super_admin','admin'), validate(rules.createScheduleEntry), (req,res,next)=>{ req.params.eventId=req.params.id; createEntry(req,res,next); });
router.put('/:id/lectures/:lid',  authenticate, authorize('super_admin','admin'), (req,res,next)=>{ req.params.id=req.params.lid; updateEntry(req,res,next); });
router.delete('/:id/lectures/:lid', authenticate, authorize('super_admin','admin'), (req,res,next)=>{ req.params.id=req.params.lid; deleteEntry(req,res,next); });

// Speakers
router.post('/:id/speakers', authenticate, authorize('super_admin', 'admin'), addSpeaker);
router.put('/:id/speakers/:sid', authenticate, authorize('super_admin', 'admin'), updateSpeaker);
router.delete('/:id/speakers/:sid', authenticate, authorize('super_admin', 'admin'), deleteSpeaker);

// Ticket Types
// (ticket type CRUD is in ticketTypes.js routes)

export default router;
