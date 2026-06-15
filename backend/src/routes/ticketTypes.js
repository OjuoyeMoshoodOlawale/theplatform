import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listTicketTypes, adminListTicketTypes, createTicketType,
  updateTicketType, deleteTicketType, reorderTicketTypes,
  getParticipantCategories,
} from '../controllers/ticketTypesController.js';

const router = express.Router();
const adm = [authenticate, authorize('super_admin', 'admin')];

// Public: what's available for purchase (active only + early bird flag)
router.get('/events/:eventId/ticket-types',       listTicketTypes);

// Admin: see all (inc. inactive) + full CRUD
router.get('/events/:eventId/ticket-types/all',   ...adm, adminListTicketTypes);
router.post('/events/:eventId/ticket-types',      ...adm, createTicketType);
router.put('/ticket-types/:id',                   ...adm, updateTicketType);
router.delete('/ticket-types/:id',                ...adm, deleteTicketType);
router.post('/events/:eventId/ticket-types/reorder', ...adm, reorderTicketTypes);

// Participant categories enum (for dropdowns — no auth needed)
router.get('/ticket-types/participant-categories', getParticipantCategories);

export default router;
