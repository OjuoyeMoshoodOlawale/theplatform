import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { eventOverview, dailyReport, dashboardSnapshot } from '../controllers/reportsController.js';

const router = express.Router();
const adm = [authenticate, authorize('super_admin','admin','attendant')];

router.get('/reports/:eventId/overview',  ...adm, eventOverview);
router.get('/reports/:eventId/daily',     ...adm, dailyReport);
router.get('/reports/:eventId/dashboard', ...adm, dashboardSnapshot);

export default router;
