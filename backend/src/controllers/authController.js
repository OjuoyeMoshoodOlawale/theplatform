import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { success, error, notFound, created } from '../utils/response.js';
import { stampId, tenantWhere } from '../utils/tenantScope.js';

/* ── Login ────────────────────────────────────────────────── */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Scope login to the current tenant (same email may exist across tenants).
    // If no tenant context, match any (backwards compatible for single-tenant).
    const tenantId = req.tenant?.id || null;
    const [admins] = await query(
      `SELECT a.*, d.name AS department_name
       FROM admins a
       LEFT JOIN departments d ON d.id = a.department_id
       WHERE a.email = ? AND a.is_active = 1
         AND (? IS NULL OR a.tenant_id = ? OR a.tenant_id IS NULL)
       ORDER BY (a.tenant_id = ?) DESC
       LIMIT 1`,
      [email.toLowerCase(), tenantId, tenantId, tenantId]
    );
    if (!admins.length) return error(res, 'Invalid email or password.', 401);

    const admin = admins[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return error(res, 'Invalid email or password.', 401);

    // Update last login
    await query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);

    const payload = {
      id:            admin.id,
      email:         admin.email,
      name:          admin.name,
      role:          admin.role,
      department_id: admin.department_id,
      tenant_id:     admin.tenant_id || null,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    return success(res, {
      token,
      admin: {
        ...payload,
        department_name: admin.department_name,
      },
    });
  } catch (err) { next(err); }
};

/* ── Get current admin ─────────────────────────────────────── */
export const getMe = async (req, res, next) => {
  try {
    const [admins] = await query(
      `SELECT a.id, a.name, a.email, a.role, a.department_id, a.is_active, a.created_at,
              d.name AS department_name
       FROM admins a
       LEFT JOIN departments d ON d.id = a.department_id
       WHERE a.id = ?`,
      [req.admin.id]
    );
    if (!admins.length) return notFound(res, 'Admin');
    return success(res, admins[0]);
  } catch (err) { next(err); }
};

/* ── Create admin ──────────────────────────────────────────── */
export const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role, department_id } = req.body;

    // Department role requires a department
    if (role === 'department' && !department_id)
      return error(res, 'A department must be assigned for department role.', 400);

    // New admins belong to the creating admin's tenant.
    const tenantId = stampId(req);

    // Email must be unique WITHIN the tenant (same email may exist in another).
    const [existing] = await query(
      'SELECT id FROM admins WHERE email = ? AND (tenant_id = ? OR (? IS NULL AND tenant_id IS NULL))',
      [email.toLowerCase(), tenantId, tenantId]
    );
    if (existing.length) return error(res, 'An account with this email already exists.', 409);

    const hash = await bcrypt.hash(password, 12);
    const [r] = await query(
      'INSERT INTO admins (name, email, password, role, department_id, tenant_id) VALUES (?,?,?,?,?,?)',
      [name.trim(), email.toLowerCase(), hash, role || 'admin', department_id || null, tenantId]
    );
    return created(res, { id: r.insertId }, 'Admin account created.');
  } catch (err) { next(err); }
};

/* ── List admins ───────────────────────────────────────────── */
export const listAdmins = async (req, res, next) => {
  try {
    const t = tenantWhere(req, 'a');
    const [rows] = await query(
      `SELECT a.id, a.name, a.email, a.role, a.is_active, a.department_id, a.created_at,
              d.name AS department_name
       FROM admins a
       LEFT JOIN departments d ON d.id = a.department_id
       WHERE 1=1${t.clause}
       ORDER BY a.role, a.name`,
      t.params
    );
    return success(res, rows);
  } catch (e) { next(e); }
};

/* ── Update admin ──────────────────────────────────────────── */
export const updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, is_active, department_id, password } = req.body;

    const [existing] = await query('SELECT id, is_active FROM admins WHERE id = ?', [id]);
    if (!existing.length) return notFound(res, 'Admin');

    // Preserve current is_active if not explicitly provided
    const activeVal = is_active === undefined ? existing[0].is_active : (is_active ? 1 : 0);

    if (password && password.length >= 8) {
      const hash = await bcrypt.hash(password, 12);
      await query(
        'UPDATE admins SET name=?, email=?, role=?, is_active=?, department_id=?, password=? WHERE id=?',
        [name, email?.toLowerCase(), role, activeVal, department_id || null, hash, id]
      );
    } else {
      await query(
        'UPDATE admins SET name=?, email=?, role=?, is_active=?, department_id=? WHERE id=?',
        [name, email?.toLowerCase(), role, activeVal, department_id || null, id]
      );
    }
    return success(res, null, 'Admin updated.');
  } catch (e) { next(e); }
};

/* ── Change password ───────────────────────────────────────── */
export const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 8)
      return error(res, 'New password must be at least 8 characters.', 400);

    const [[admin]] = await query('SELECT password FROM admins WHERE id=?', [req.admin.id]);
    const match = await bcrypt.compare(current_password, admin.password);
    if (!match) return error(res, 'Current password is incorrect.', 401);

    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE admins SET password=? WHERE id=?', [hash, req.admin.id]);
    return success(res, null, 'Password changed successfully.');
  } catch (e) { next(e); }
};
