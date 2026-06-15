/**
 * Platform admin routes — manage the whole platform (create/list tenants).
 * Protected by a platform-admin JWT (separate from tenant admins).
 */
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { success, created, error } from '../utils/response.js';
import { clearTenantCache } from '../middleware/tenant.js';

const router = express.Router();

/* ── Platform admin auth middleware ───────────────────────────────────── */
const platformAuth = async (req, res, next) => {
  try {
    const hdr = req.headers.authorization;
    const tok = hdr?.startsWith('Bearer ') ? hdr.split(' ')[1] : null;
    if (!tok) return error(res, 'Platform authentication required.', 401);
    const decoded = jwt.verify(tok, process.env.JWT_SECRET);
    if (!decoded.platform) return error(res, 'Not a platform admin token.', 403);
    req.platformAdmin = decoded;
    next();
  } catch { return error(res, 'Invalid platform token.', 401); }
};

/* ── Platform admin login ─────────────────────────────────────────────── */
router.post('/platform/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [rows] = await query('SELECT * FROM platform_admins WHERE email=? AND is_active=1', [email?.toLowerCase()]);
    if (!rows.length) return error(res, 'Invalid credentials.', 401);
    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return error(res, 'Invalid credentials.', 401);
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, platform: true },
      process.env.JWT_SECRET, { expiresIn: '8h' }
    );
    success(res, { token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (e) { next(e); }
});

/* ── List all tenants ─────────────────────────────────────────────────── */
router.get('/platform/tenants', platformAuth, async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT t.id, t.slug, t.name, t.status, t.plan, t.created_at,
              (SELECT COUNT(*) FROM events e WHERE e.tenant_id = t.id) AS event_count,
              (SELECT COUNT(*) FROM admins a WHERE a.tenant_id = t.id) AS admin_count
       FROM tenants t ORDER BY t.created_at DESC`
    );
    success(res, rows);
  } catch (e) { next(e); }
});

/* ── Create a tenant (+ its first super_admin) ────────────────────────── */
router.post('/platform/tenants', platformAuth, async (req, res, next) => {
  try {
    const {
      slug, name, tagline, contact_email,
      color_primary, color_secondary, color_accent, color_bg,
      admin_name, admin_email, admin_password,
    } = req.body;

    if (!slug?.trim() || !name?.trim()) return error(res, 'Slug and name are required.', 400);
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) return error(res, 'Slug must be lowercase letters, numbers, hyphens (2-40 chars).', 400);
    if (!admin_email || !admin_password) return error(res, 'Admin email and password are required.', 400);

    // Create tenant
    const [tr] = await query(
      `INSERT INTO tenants (slug, name, tagline, contact_email,
         color_primary, color_secondary, color_accent, color_bg, status, plan)
       VALUES (?,?,?,?,?,?,?,?,'active','free')`,
      [slug.toLowerCase().trim(), name.trim(), tagline || null, contact_email || null,
       color_primary || '#02462E', color_secondary || '#FEC700',
       color_accent || '#6BBC01', color_bg || '#FBF6E6']
    );
    const tenantId = tr.insertId;

    // Create the tenant's first super_admin
    const hash = await bcrypt.hash(admin_password, 12);
    await query(
      `INSERT INTO admins (tenant_id, name, email, password, role, is_active)
       VALUES (?,?,?,?,'super_admin',1)`,
      [tenantId, admin_name || name, admin_email.toLowerCase(), hash]
    );

    clearTenantCache(slug);
    created(res, { id: tenantId, slug }, `Tenant "${name}" created at /${slug}`);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return error(res, 'That slug or admin email is already taken.', 409);
    next(e);
  }
});

/* ── Suspend / activate a tenant ──────────────────────────────────────── */
router.patch('/platform/tenants/:id/status', platformAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active','suspended','trial'].includes(status)) return error(res, 'Invalid status.', 400);
    const [[t]] = await query('SELECT slug FROM tenants WHERE id=?', [req.params.id]);
    await query('UPDATE tenants SET status=? WHERE id=?', [status, req.params.id]);
    if (t) clearTenantCache(t.slug);
    success(res, null, `Tenant ${status}.`);
  } catch (e) { next(e); }
});

export default router;
