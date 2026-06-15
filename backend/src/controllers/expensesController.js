/**
 * expensesController.js
 * Departments raise expense requests → Admin approves → Finance marks paid.
 * No payment happens without admin approval.
 */
import { query } from '../database/db.js';
import { success, created, error, notFound } from '../utils/response.js';
import { tenantWhere, stampId } from '../utils/tenantScope.js';

/* ═══════════════════════════════════════════════════════════════
   DEPARTMENTS
═══════════════════════════════════════════════════════════════ */

export const listDepartments = async (req, res, next) => {
  try {
    const t = tenantWhere(req, 'd');
    const [rows] = await query(
      `SELECT d.*,
              COUNT(DISTINCT a.id) AS member_count,
              COUNT(DISTINCT e.id) AS total_requests,
              SUM(CASE WHEN e.status='pending'  THEN 1 ELSE 0 END) AS pending_count,
              SUM(CASE WHEN e.status='approved' THEN 1 ELSE 0 END) AS approved_count,
              SUM(CASE WHEN e.status='paid'     THEN e.amount_paid ELSE 0 END) AS total_paid
       FROM departments d
       LEFT JOIN admins a ON a.department_id = d.id AND a.is_active = 1
       LEFT JOIN expense_requests e ON e.department_id = d.id
       WHERE 1=1${t.clause}
       GROUP BY d.id ORDER BY d.sort_order, d.name`,
      t.params
    );
    success(res, rows);
  } catch (e) { next(e); }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, description, head_name, sort_order } = req.body;
    if (!name?.trim()) return error(res, 'Department name is required.', 400);
    const [r] = await query(
      'INSERT INTO departments (name, description, head_name, sort_order, tenant_id) VALUES (?,?,?,?,?)',
      [name.trim(), description || null, head_name || null, sort_order ?? 0, stampId(req)]
    );
    created(res, { id: r.insertId }, 'Department created.');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return error(res, 'A department with this name already exists.', 409);
    next(e);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { name, description, head_name, sort_order, is_active } = req.body;
    const t = tenantWhere(req, '');
    const [r] = await query(
      `UPDATE departments SET name=?, description=?, head_name=?, sort_order=?, is_active=? WHERE id=?${t.clause}`,
      [name, description || null, head_name || null, sort_order ?? 0, is_active ? 1 : 0, req.params.id, ...t.params]
    );
    if (!r.affectedRows) return error(res, 'Department not found in your organisation.', 404);
    success(res, null, 'Department updated.');
  } catch (e) { next(e); }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const [[{ cnt }]] = await query(
      'SELECT COUNT(*) AS cnt FROM expense_requests WHERE department_id=?', [req.params.id]
    );
    if (cnt > 0) return error(res, `Cannot delete — ${cnt} expense request(s) linked to this department.`, 409);
    const t = tenantWhere(req, '');
    const [r] = await query(`DELETE FROM departments WHERE id=?${t.clause}`, [req.params.id, ...t.params]);
    if (!r.affectedRows) return error(res, 'Department not found in your organisation.', 404);
    success(res, null, 'Department deleted.');
  } catch (e) { next(e); }
};

/* ═══════════════════════════════════════════════════════════════
   EXPENSE REQUESTS
═══════════════════════════════════════════════════════════════ */

/* List — admins see all, department staff see only their own */
export const listExpenses = async (req, res, next) => {
  try {
    const admin = req.admin;
    const { status, department_id, event_id } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    // Department role: only see their own department
    if (admin.role === 'department') {
      if (!admin.department_id) return success(res, []);
      where += ' AND e.department_id=?'; params.push(admin.department_id);
    } else if (department_id) {
      where += ' AND e.department_id=?'; params.push(department_id);
    }

    if (status)     { where += ' AND e.status=?';     params.push(status); }
    if (event_id)   { where += ' AND e.event_id=?';   params.push(event_id); }

    const [rows] = await query(
      `SELECT e.*,
              d.name   AS department_name,
              ev.title AS event_title,
              r.name   AS raised_by_name,
              ap.name  AS approved_by_name,
              pa.name  AS paid_by_name
       FROM expense_requests e
       JOIN departments d  ON d.id  = e.department_id
       LEFT JOIN events ev ON ev.id = e.event_id
       JOIN admins r       ON r.id  = e.raised_by
       LEFT JOIN admins ap ON ap.id = e.approved_by
       LEFT JOIN admins pa ON pa.id = e.paid_by
       ${where}
       ORDER BY
         FIELD(e.status,'pending','approved','paid','rejected'),
         FIELD(e.priority,'urgent','normal','low'),
         e.created_at DESC`,
      params
    );
    success(res, rows);
  } catch (e) { next(e); }
};

/* Raise a new expense request */
export const raiseExpense = async (req, res, next) => {
  try {
    const admin = req.admin;
    const {
      department_id, event_id, title, description,
      amount_requested, priority = 'normal', raise_note, due_date,
    } = req.body;

    if (!title?.trim())         return error(res, 'Title is required.', 400);
    if (!amount_requested || amount_requested <= 0)
      return error(res, 'Amount must be greater than zero.', 400);

    // Department role must use their own dept
    const deptId = admin.role === 'department' ? admin.department_id : department_id;
    if (!deptId) return error(res, 'Department is required.', 400);

    // Verify dept exists + active
    const [depts] = await query('SELECT id FROM departments WHERE id=? AND is_active=1', [deptId]);
    if (!depts.length) return error(res, 'Department not found or inactive.', 404);

    const [r] = await query(
      `INSERT INTO expense_requests
         (department_id, event_id, title, description, amount_requested,
          priority, raise_note, due_date, raised_by, status)
       VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
      [deptId, event_id || null, title.trim(), description || null,
       parseFloat(amount_requested), priority, raise_note || null,
       due_date || null, admin.id]
    );

    // Email super admins (non-blocking)
    try {
      const { createTransport } = await import('nodemailer');
      const [superAdmins] = await query(
        "SELECT name, email FROM admins WHERE role='super_admin' AND is_active=1 LIMIT 3"
      );
      if (superAdmins.length) {
        const transporter = createTransport({
          host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||'587'),
          secure: process.env.SMTP_PORT === '465',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        const [deptRow] = await query('SELECT name FROM departments WHERE id=?', [deptId]);
        const priorityLabel = { urgent:'🔴 URGENT', normal:'Normal', low:'Low' }[priority] || priority;
        for (const sa of superAdmins) {
          transporter.sendMail({
            from: process.env.EMAIL_FROM || 'MYS Admin <noreply@mys.com>',
            to:   sa.email,
            subject: `[${priorityLabel}] New Expense Request — ${deptRow?.[0]?.name || 'Department'}`,
            html: `<div style="font-family:sans-serif;max-width:560px;padding:24px">
              <h2 style="color:#02462E">New Expense Request</h2>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:8px 0;color:#888;width:120px">Department</td><td style="padding:8px 0;font-weight:bold">${deptRow?.[0]?.name || '—'}</td></tr>
                <tr><td style="padding:8px 0;color:#888">Title</td><td style="padding:8px 0">${title}</td></tr>
                <tr><td style="padding:8px 0;color:#888">Amount</td><td style="padding:8px 0;font-weight:bold;color:#02462E">₦${Number(amount_requested).toLocaleString('en-NG')}</td></tr>
                <tr><td style="padding:8px 0;color:#888">Priority</td><td style="padding:8px 0">${priorityLabel}</td></tr>
                <tr><td style="padding:8px 0;color:#888">Raised by</td><td style="padding:8px 0">${admin.name}</td></tr>
                ${due_date ? `<tr><td style="padding:8px 0;color:#888">Due</td><td style="padding:8px 0">${due_date}</td></tr>` : ''}
                ${description ? `<tr><td style="padding:8px 0;color:#888">Notes</td><td style="padding:8px 0">${description}</td></tr>` : ''}
              </table>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/expenses" style="display:inline-block;background:#FEC700;color:#02462E;padding:10px 24px;font-weight:bold;text-decoration:none;margin-top:16px">
                Review Request →
              </a>
            </div>`,
          }).catch(() => {});
        }
      }
    } catch {}

    created(res, { id: r.insertId }, `Expense request submitted. Pending admin approval.`);
  } catch (e) { next(e); }
};

/* Update own request (only while pending) */
export const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const admin = req.admin;
    const { title, description, amount_requested, priority, raise_note, due_date } = req.body;

    const [rows] = await query('SELECT * FROM expense_requests WHERE id=?', [id]);
    if (!rows.length) return notFound(res, 'Expense request');
    const exp = rows[0];

    // Department can only edit their own pending requests
    if (admin.role === 'department') {
      if (exp.raised_by !== admin.id) return error(res, 'You can only edit your own requests.', 403);
      if (exp.status !== 'pending')   return error(res, 'Only pending requests can be edited.', 409);
    }

    await query(
      `UPDATE expense_requests
       SET title=?, description=?, amount_requested=?, priority=?, raise_note=?, due_date=?
       WHERE id=?`,
      [title || exp.title, description ?? exp.description,
       parseFloat(amount_requested) || exp.amount_requested,
       priority || exp.priority, raise_note ?? exp.raise_note,
       due_date || exp.due_date, id]
    );
    success(res, null, 'Request updated.');
  } catch (e) { next(e); }
};

/* Approve or reject (admin only) */
export const reviewExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, amount_approved, approve_note } = req.body;

    if (!['approve','reject'].includes(action))
      return error(res, 'action must be "approve" or "reject".', 400);

    const [rows] = await query('SELECT * FROM expense_requests WHERE id=?', [id]);
    if (!rows.length) return notFound(res, 'Expense request');
    if (rows[0].status !== 'pending')
      return error(res, 'Only pending requests can be reviewed.', 409);

    if (action === 'approve') {
      const approved = parseFloat(amount_approved) || rows[0].amount_requested;
      await query(
        `UPDATE expense_requests
         SET status='approved', amount_approved=?, approved_by=?, approved_at=NOW(), approve_note=?
         WHERE id=?`,
        [approved, req.admin.id, approve_note || null, id]
      );
      success(res, null, `Request approved for ₦${Number(approved).toLocaleString('en-NG')}.`);
    } else {
      await query(
        `UPDATE expense_requests
         SET status='rejected', approved_by=?, approved_at=NOW(), approve_note=?
         WHERE id=?`,
        [req.admin.id, approve_note || null, id]
      );
      success(res, null, 'Request rejected.');
    }
  } catch (e) { next(e); }
};

/* Mark as paid (admin/finance only) */
export const markPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount_paid, pay_note } = req.body;

    const [rows] = await query('SELECT * FROM expense_requests WHERE id=?', [id]);
    if (!rows.length) return notFound(res, 'Expense request');
    if (rows[0].status !== 'approved')
      return error(res, 'Only approved requests can be marked as paid.', 409);

    const paid = parseFloat(amount_paid) || rows[0].amount_approved || rows[0].amount_requested;
    await query(
      `UPDATE expense_requests
       SET status='paid', amount_paid=?, paid_by=?, paid_at=NOW(), pay_note=?
       WHERE id=?`,
      [paid, req.admin.id, pay_note || null, id]
    );
    success(res, null, `Payment of ₦${Number(paid).toLocaleString('en-NG')} recorded.`);
  } catch (e) { next(e); }
};

/* Summary stats for dashboard */
export const expenseSummary = async (req, res, next) => {
  try {
    const admin = req.admin;
    let where = '';
    const params = [];
    if (admin.role === 'department' && admin.department_id) {
      where = 'WHERE department_id=?'; params.push(admin.department_id);
    }

    const [[stats]] = await query(
      `SELECT
         COUNT(*) AS total,
         SUM(status='pending')  AS pending,
         SUM(status='approved') AS approved,
         SUM(status='rejected') AS rejected,
         SUM(status='paid')     AS paid,
         SUM(amount_requested)  AS total_requested,
         SUM(CASE WHEN status IN ('approved','paid') THEN COALESCE(amount_approved,amount_requested) ELSE 0 END) AS total_approved,
         SUM(CASE WHEN status='paid' THEN COALESCE(amount_paid,0) ELSE 0 END) AS total_paid
       FROM expense_requests ${where}`,
      params
    );
    success(res, stats);
  } catch (e) { next(e); }
};
