import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listCategories, createCategory, updateCategory,
  deleteCategory, assignCategory,
} from '../controllers/categoriesController.js';

const router = express.Router();
const adm = [authenticate, authorize('super_admin','admin')];

// Global categories (no event_id)
router.get('/categories',          listCategories);          // public — registration form needs it
router.post('/categories',         ...adm, createCategory);
router.put('/categories/:id',      ...adm, updateCategory);
router.delete('/categories/:id',   ...adm, deleteCategory);

// Assign to a ticket (check-in roles)
router.patch('/tickets/:ticketId/category', authenticate, assignCategory);

export default router;
