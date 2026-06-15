import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  checkIn, assignTagAndCheckIn, checkOut,
  liveAttendance, attendanceReport
} from '../controllers/attendanceController.js';

const router = express.Router();

router.post('/check-in', authenticate, checkIn);
router.post('/checkin',  authenticate, assignTagAndCheckIn); // combined: validate + tag + check-in
router.post('/assign-tag', authenticate, assignTagAndCheckIn);
router.post('/check-out', authenticate, checkOut);
router.post('/checkout',  authenticate, checkOut);
router.get('/live/:eventId', authenticate, liveAttendance);
router.get('/report/:eventId', authenticate, authorize('super_admin', 'admin', 'attendant'), attendanceReport);

export default router;
