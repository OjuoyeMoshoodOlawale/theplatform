import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { unauthorized, forbidden } from '../utils/response.js';
import { AppError } from './errorHandler.js';

/**
 * Verify JWT and attach admin to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      // Allow token via query param for links opened directly in the browser
      // (e.g. tag print pages, certificate downloads opened in a new tab)
      token = req.query.token;
    }
    if (!token) {
      return unauthorized(res, 'Authentication required. Please log in.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await query(
      'SELECT id, name, email, role, department_id, tenant_id, is_active FROM admins WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length) {
      return unauthorized(res, 'Admin account not found.');
    }

    const admin = rows[0];
    if (!admin.is_active) {
      return unauthorized(res, 'Your account has been deactivated. Contact a super admin.');
    }

    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require specific roles
 * Usage: authorize('super_admin') or authorize('super_admin', 'admin')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return unauthorized(res);
    }

    if (!roles.includes(req.admin.role)) {
      return forbidden(
        res,
        `This action requires ${roles.join(' or ')} privileges.`
      );
    }

    next();
  };
};

/**
 * Sign a JWT for an admin
 */
export const signToken = (admin) => {
  return jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};
