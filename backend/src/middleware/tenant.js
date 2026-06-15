/**
 * Tenant middleware — resolves the tenant from the URL slug or header and
 * attaches it to req.tenant. All tenant-scoped controllers then filter their
 * queries by req.tenant.id.
 *
 * Slug sources (in order):
 *   1. req.params.slug         (route like /:slug/api/...)
 *   2. X-Tenant-Slug header    (SPA sends this once it knows its tenant)
 *   3. ?tenant=slug query
 */
import { query } from '../database/db.js';

// Simple in-memory cache (tenants change rarely)
const cache = new Map();
const CACHE_TTL = 60_000; // 1 min

const fetchTenant = async (slug) => {
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.tenant;

  const [rows] = await query(
    `SELECT id, slug, name, tagline, description, logo_url, favicon_url,
            color_primary, color_secondary, color_accent, color_bg,
            contact_email, contact_phone, website_url,
            social_instagram, social_twitter, social_facebook,
            paystack_public_key, paystack_secret_key, status, plan
     FROM tenants WHERE slug = ? LIMIT 1`,
    [slug]
  );
  const tenant = rows[0] || null;
  cache.set(slug, { tenant, at: Date.now() });
  return tenant;
};

export const clearTenantCache = (slug) => {
  if (slug) cache.delete(slug); else cache.clear();
};

/**
 * Resolve tenant (required). 404 if not found, 403 if suspended.
 */
export const resolveTenant = async (req, res, next) => {
  try {
    const slug = (req.params.slug || req.headers['x-tenant-slug'] || req.query.tenant || '')
      .toString().toLowerCase().trim();

    if (!slug) {
      return res.status(400).json({ success: false, message: 'No tenant specified.' });
    }

    const tenant = await fetchTenant(slug);
    if (!tenant) {
      return res.status(404).json({ success: false, message: `No organisation found at "${slug}".` });
    }
    if (tenant.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'This organisation is suspended.' });
    }

    req.tenant = tenant;
    next();
  } catch (e) { next(e); }
};

/**
 * Resolve tenant if a slug is present, but don't fail if absent (optional).
 */
export const resolveTenantOptional = async (req, res, next) => {
  try {
    const slug = (req.params.slug || req.headers['x-tenant-slug'] || req.query.tenant || '')
      .toString().toLowerCase().trim();
    if (slug) {
      const tenant = await fetchTenant(slug);
      if (tenant && tenant.status !== 'suspended') req.tenant = tenant;
    }
    next();
  } catch (e) { next(e); }
};

/**
 * Return the public-safe tenant object (no secret keys).
 */
export const publicTenant = (t) => {
  if (!t) return null;
  const { paystack_secret_key, ...safe } = t;
  return { ...safe, has_own_paystack: !!(t.paystack_public_key && t.paystack_secret_key) };
};
