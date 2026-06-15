import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { query } from '../database/db.js';
import { paginated, buildPagination, success } from '../utils/response.js';
import { parsePagination } from '../utils/helpers.js';
import { tenantWhere } from '../utils/tenantScope.js';

const router = express.Router();
const adm = [authenticate, authorize('super_admin','admin')];

/* ── List participants with filters ─────────────────────────── */
router.get('/participants', authenticate, async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, event_id, category_id, checked_in } = req.query;

    let joins = `
      LEFT JOIN tickets t       ON t.participant_id = p.id
      LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
      LEFT JOIN event_categories c ON c.id = t.category_id
      LEFT JOIN attendance a    ON a.ticket_id = t.id
    `;
    let where = "WHERE t.status = 'paid'";
    const params = [];

    if (event_id)   { where += ' AND t.event_id = ?';    params.push(event_id); }
    if (category_id){ where += ' AND t.category_id = ?'; params.push(category_id); }
    if (checked_in === '1') { where += ' AND a.checked_in_at IS NOT NULL'; }
    if (checked_in === '0') { where += ' AND (a.checked_in_at IS NULL OR a.id IS NULL)'; }
    if (search) {
      where += ' AND (p.name LIKE ? OR p.email LIKE ? OR p.phone LIKE ? OR t.unique_number LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    // Tenant isolation: only this tenant's participants
    const tScope = tenantWhere(req, 'p');
    where += tScope.clause;
    params.push(...tScope.params);

    const [[{ total }]] = await query(
      `SELECT COUNT(DISTINCT p.id) AS total FROM participants p ${joins} ${where}`, params
    );

    const [rows] = await query(
      `SELECT
         p.id, p.name, p.email, p.phone, p.gender,
         t.id AS ticket_id, t.unique_number, t.amount_paid, t.balance_due,
         t.payment_method, t.event_id, t.category_id,
         tt.name AS ticket_type_name,
         c.name  AS category_name, c.color AS category_color,
         a.checked_in_at, a.checked_out_at, a.id AS attendance_id
       FROM participants p ${joins} ${where}
       ORDER BY p.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      params
    );

    paginated(res, rows, buildPagination(total, page, limit, rows.length));
  } catch (e) { next(e); }
});

/* ── Get single participant ─────────────────────────────────── */
router.get('/participants/:id', ...adm, async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT p.*, 
              JSON_ARRAYAGG(
                JSON_OBJECT('event', e.title, 'ticket', t.unique_number,
                            'amount', t.amount_paid, 'status', t.status,
                            'date', t.purchased_at)
              ) AS ticket_history
       FROM participants p
       LEFT JOIN tickets t ON t.participant_id = p.id
       LEFT JOIN events e  ON e.id = t.event_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:'Not found.' });
    success(res, rows[0]);
  } catch (e) { next(e); }
});

/* ── Tag validation for check-in ───────────────────────────── */
router.get('/tags/validate', authenticate, async (req, res, next) => {
  try {
    const { tag, event_id } = req.query;
    if (!tag) return success(res, { available: true });
    const [rows] = await query(
      "SELECT id FROM event_tags WHERE tag_number = ? AND event_id = ? AND ticket_id IS NOT NULL",
      [tag.toUpperCase(), event_id]
    );
    success(res, { available: rows.length === 0, tag: tag.toUpperCase() });
  } catch (e) { next(e); }
});

export default router;
