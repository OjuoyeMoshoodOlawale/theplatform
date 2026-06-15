import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listHostels, listAllHostels, createHostel, updateHostel, deleteHostel,
  hostelAvailability, assignHostel, getAssignment, eventAssignments, removeAssignment,
} from '../controllers/hostelController.js';

const router = express.Router();
const adm = [authenticate, authorize('super_admin','admin')];

// Hostel CRUD (global)
router.get('/hostels',          authenticate, listAllHostels);
router.get('/hostels/active',   listHostels);
router.post('/hostels',         ...adm, createHostel);
router.put('/hostels/:id',      ...adm, updateHostel);
router.delete('/hostels/:id',   ...adm, deleteHostel);

// Event-level availability & assignments
router.get('/hostels/event/:eventId/availability', authenticate, hostelAvailability);
router.get('/hostels/event/:eventId/assignments',  ...adm,       eventAssignments);

// Per-ticket assignment (all authenticated — attendants assign at check-in)
router.get('/tickets/:ticketId/hostel',    authenticate, getAssignment);
router.post('/tickets/:ticketId/hostel',   authenticate, assignHostel);
router.delete('/tickets/:ticketId/hostel', authenticate, removeAssignment);

export default router;
