import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  listExpenses, raiseExpense, updateExpense, reviewExpense, markPaid, expenseSummary,
} from '../controllers/expensesController.js';

const router = express.Router();

const adm = [authenticate, authorize('super_admin', 'admin')];
// Department staff can access most expense routes
const staff = [authenticate, authorize('super_admin', 'admin', 'department')];

/* ─── Departments (admin CRUD) ────────────────────────────── */
router.get('/departments',        authenticate, listDepartments);   // all auth roles
router.post('/departments',       ...adm, createDepartment);
router.put('/departments/:id',    ...adm, updateDepartment);
router.delete('/departments/:id', ...adm, deleteDepartment);

/* ─── Expense requests ────────────────────────────────────── */
router.get('/expenses',           ...staff, listExpenses);        // dept sees only their own
router.get('/expenses/summary',   ...staff, expenseSummary);
router.post('/expenses',          ...staff, raiseExpense);        // dept raises request
router.put('/expenses/:id',       ...staff, updateExpense);       // dept edits pending only
router.post('/expenses/:id/review', ...adm, reviewExpense);      // admin approve/reject
router.post('/expenses/:id/pay',    ...adm, markPaid);           // admin marks paid

export default router;
