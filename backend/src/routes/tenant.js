/**
 * Tenant routes
 *  - GET  /api/tenants/:slug          public tenant info (branding, pages)
 *  - GET  /api/platform/tenants       list all (platform admin)
 *  - POST /api/platform/tenants       create a tenant (platform admin)
 *  - PUT  /api/tenants/:slug/settings update branding/contact/paystack (tenant admin)
 *  - tenant_pages CRUD
 */
import express from 'express';
import { query } from '../database/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveTenant, publicTenant, clearTenantCache } from '../middleware/tenant.js';
import { success, created, error, notFound } from '../utils/response.js';

const router = express.Router();

/* ── PUBLIC: list active tenants (for the platform landing) ───────────── */
router.get('/tenants', async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT slug, name, tagline, logo_url,
              color_primary, color_secondary, color_accent
       FROM tenants
       WHERE status = 'active'
       ORDER BY created_at ASC
       LIMIT 60`
    );
    success(res, rows);
  } catch (e) { next(e); }
});

/* ── PUBLIC: tenant info + published pages (for the branded landing) ───── */
router.get('/tenants/:slug', resolveTenant, async (req, res, next) => {
  try {
    const [pages] = await query(
      `SELECT slug, title, show_in_nav, sort_order
       FROM tenant_pages
       WHERE tenant_id = ? AND is_published = 1
       ORDER BY sort_order, title`,
      [req.tenant.id]
    );
    success(res, { tenant: publicTenant(req.tenant), pages });
  } catch (e) { next(e); }
});

/* ── PUBLIC: a single published page's content ────────────────────────── */
router.get('/tenants/:slug/pages/:pageSlug', resolveTenant, async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT slug, title, body_html
       FROM tenant_pages
       WHERE tenant_id = ? AND slug = ? AND is_published = 1 LIMIT 1`,
      [req.tenant.id, req.params.pageSlug.toLowerCase()]
    );
    if (!rows.length) return notFound(res, 'Page');
    success(res, rows[0]);
  } catch (e) { next(e); }
});

/* ── TENANT ADMIN: update branding / contact / paystack ───────────────── */
router.put('/tenants/:slug/settings', resolveTenant, authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    // Ensure the admin belongs to this tenant
    if (req.admin.tenant_id && req.admin.tenant_id !== req.tenant.id) {
      return error(res, 'You can only edit your own organisation.', 403);
    }
    const f = req.body;
    await query(
      `UPDATE tenants SET
         name = COALESCE(?, name),
         tagline = ?, description = ?,
         logo_url = ?, favicon_url = ?,
         color_primary = COALESCE(?, color_primary),
         color_secondary = COALESCE(?, color_secondary),
         color_accent = COALESCE(?, color_accent),
         color_bg = COALESCE(?, color_bg),
         contact_email = ?, contact_phone = ?, website_url = ?,
         social_instagram = ?, social_twitter = ?, social_facebook = ?,
         paystack_public_key = ?, paystack_secret_key = ?
       WHERE id = ?`,
      [
        f.name ?? null, f.tagline ?? null, f.description ?? null,
        f.logo_url ?? null, f.favicon_url ?? null,
        f.color_primary ?? null, f.color_secondary ?? null, f.color_accent ?? null, f.color_bg ?? null,
        f.contact_email ?? null, f.contact_phone ?? null, f.website_url ?? null,
        f.social_instagram ?? null, f.social_twitter ?? null, f.social_facebook ?? null,
        f.paystack_public_key ?? null, f.paystack_secret_key ?? null,
        req.tenant.id,
      ]
    );
    clearTenantCache(req.tenant.slug);
    success(res, null, 'Settings updated.');
  } catch (e) { next(e); }
});

/* ── TENANT ADMIN: pages CRUD ─────────────────────────────────────────── */
router.get('/tenants/:slug/admin/pages', resolveTenant, authenticate, async (req, res, next) => {
  try {
    const [pages] = await query(
      'SELECT * FROM tenant_pages WHERE tenant_id = ? ORDER BY sort_order, title',
      [req.tenant.id]
    );
    success(res, pages);
  } catch (e) { next(e); }
});

router.post('/tenants/:slug/admin/pages', resolveTenant, authenticate, authorize('super_admin','admin'), async (req, res, next) => {
  try {
    const { slug, title, body_html, show_in_nav = 1, is_published = 1, sort_order = 0 } = req.body;
    if (!slug?.trim() || !title?.trim()) return error(res, 'Slug and title are required.', 400);
    const [r] = await query(
      `INSERT INTO tenant_pages (tenant_id, slug, title, body_html, show_in_nav, is_published, sort_order)
       VALUES (?,?,?,?,?,?,?)`,
      [req.tenant.id, slug.toLowerCase().trim(), title.trim(), body_html || null,
       show_in_nav ? 1 : 0, is_published ? 1 : 0, sort_order]
    );
    created(res, { id: r.insertId }, 'Page created.');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return error(res, 'A page with that slug already exists.', 409);
    next(e);
  }
});

router.put('/tenants/:slug/admin/pages/:id', resolveTenant, authenticate, authorize('super_admin','admin'), async (req, res, next) => {
  try {
    const { title, body_html, show_in_nav, is_published, sort_order } = req.body;
    await query(
      `UPDATE tenant_pages SET title=?, body_html=?, show_in_nav=?, is_published=?, sort_order=?
       WHERE id=? AND tenant_id=?`,
      [title, body_html || null, show_in_nav ? 1 : 0, is_published ? 1 : 0, sort_order || 0,
       req.params.id, req.tenant.id]
    );
    success(res, null, 'Page updated.');
  } catch (e) { next(e); }
});

router.delete('/tenants/:slug/admin/pages/:id', resolveTenant, authenticate, authorize('super_admin','admin'), async (req, res, next) => {
  try {
    await query('DELETE FROM tenant_pages WHERE id=? AND tenant_id=?', [req.params.id, req.tenant.id]);
    success(res, null, 'Page deleted.');
  } catch (e) { next(e); }
});

export default router;
