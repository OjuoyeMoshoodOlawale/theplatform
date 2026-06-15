/**
 * tenantScope — helpers to scope queries by the current tenant.
 *
 * The tenant is resolved two ways:
 *   - req.tenant.id      (from X-Tenant-Slug header, set by resolveTenantOptional)
 *   - req.admin.tenant_id (from the authenticated admin's JWT)
 *
 * scopeId(req) returns the effective tenant id (admin's own tenant takes
 * precedence for write safety; falls back to the header tenant; null if neither
 * — which keeps single-tenant installs working).
 */
export const scopeId = (req) => {
  return req.admin?.tenant_id ?? req.tenant?.id ?? null;
};

/**
 * Append a tenant filter to a WHERE clause.
 *   const { clause, params } = tenantWhere(req, 'e');
 *   `SELECT * FROM events e WHERE 1=1 ${clause}` , [...base, ...params]
 * If there's no tenant context, returns empty (no filter) for back-compat.
 */
export const tenantWhere = (req, alias = '') => {
  const id = scopeId(req);
  if (!id) return { clause: '', params: [] };
  const col = alias ? `${alias}.tenant_id` : 'tenant_id';
  // Include NULL rows so legacy un-backfilled data still shows for the base tenant
  return { clause: ` AND (${col} = ? OR ${col} IS NULL)`, params: [id] };
};

/**
 * The tenant id to stamp on INSERTs (so new rows belong to the tenant).
 */
export const stampId = (req) => scopeId(req);
