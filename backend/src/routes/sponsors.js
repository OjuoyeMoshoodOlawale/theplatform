import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { query } from '../database/db.js';
import { success, created, error, notFound } from '../utils/response.js';
import { tenantWhere, stampId } from '../utils/tenantScope.js';

const router = express.Router();
const adm    = [authenticate, authorize('super_admin', 'admin')];

/* ── Public: list active sponsors ────────────────────────────── */
router.get('/sponsors', async (req, res, next) => {
  try {
    const { event_id } = req.query;
    let where = 'WHERE s.is_active = 1';
    const params = [];
    if (event_id) {
      where += ' AND (s.event_id = ? OR s.event_id IS NULL)';
      params.push(event_id);
    }
    const tScope = tenantWhere(req, 's');
    where += tScope.clause;
    params.push(...tScope.params);
    const [rows] = await query(
      `SELECT s.*, e.title AS event_title, e.edition
       FROM sponsors s LEFT JOIN events e ON e.id = s.event_id
       ${where}
       ORDER BY FIELD(s.tier,'title','gold','silver','bronze','media','partner'), s.sort_order, s.name`,
      params
    );
    success(res, rows);
  } catch (e) { next(e); }
});

/* ── Admin: list all ──────────────────────────────────────────── */
router.get('/sponsors/all', ...adm, async (req, res, next) => {
  try {
    const tScope = tenantWhere(req, 's');
    const [rows] = await query(
      `SELECT s.*, e.title AS event_title, e.edition
       FROM sponsors s LEFT JOIN events e ON e.id = s.event_id
       WHERE 1=1${tScope.clause}
       ORDER BY FIELD(s.tier,'title','gold','silver','bronze','media','partner'), s.sort_order`,
      tScope.params
    );
    success(res, rows);
  } catch (e) { next(e); }
});

/* ── Admin: create ────────────────────────────────────────────── */
router.post('/sponsors', ...adm, async (req, res, next) => {
  try {
    const { event_id, name, logo_url, website_url, tier, description, sort_order } = req.body;
    if (!name?.trim()) return error(res, 'Sponsor name is required.', 400);
    const [r] = await query(
      `INSERT INTO sponsors (event_id, name, logo_url, website_url, tier, description, sort_order, tenant_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [event_id || null, name.trim(), logo_url || null, website_url || null,
       tier || 'gold', description || null, sort_order ?? 0, stampId(req)]
    );
    created(res, { id: r.insertId }, 'Sponsor added.');
  } catch (e) { next(e); }
});

/* ── Admin: update ────────────────────────────────────────────── */
router.put('/sponsors/:id', ...adm, async (req, res, next) => {
  try {
    const { event_id, name, logo_url, website_url, tier, description, sort_order, is_active } = req.body;
    const ts = tenantWhere(req, '');
    const [r] = await query(
      `UPDATE sponsors SET event_id=?, name=?, logo_url=?, website_url=?,
         tier=?, description=?, sort_order=?, is_active=? WHERE id=?${ts.clause}`,
      [event_id || null, name, logo_url || null, website_url || null,
       tier || 'gold', description || null, sort_order ?? 0, is_active ? 1 : 0, req.params.id, ...ts.params]
    );
    if (!r.affectedRows) return error(res, 'Sponsor not found in your organisation.', 404);
    success(res, null, 'Sponsor updated.');
  } catch (e) { next(e); }
});

/* ── Admin: delete ────────────────────────────────────────────── */
router.delete('/sponsors/:id', ...adm, async (req, res, next) => {
  try {
    const ts = tenantWhere(req, '');
    const [r] = await query(`DELETE FROM sponsors WHERE id=?${ts.clause}`, [req.params.id, ...ts.params]);
    if (!r.affectedRows) return error(res, 'Sponsor not found in your organisation.', 404);
    success(res, null, 'Sponsor deleted.');
  } catch (e) { next(e); }
});

export default router;
