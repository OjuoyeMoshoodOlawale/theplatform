/**
 * categoriesController.js
 * Categories are GLOBAL and reusable across events — no event_id.
 * They are assigned to participants at check-in/registration.
 */
import { query } from '../database/db.js';
import { success, created, error, notFound } from '../utils/response.js';

/* ── List all categories ────────────────────────────────────── */
export const listCategories = async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT c.*,
              COUNT(DISTINCT t.id) AS registered_count
       FROM event_categories c
       LEFT JOIN tickets t ON t.category_id = c.id AND t.status = 'paid'
       GROUP BY c.id ORDER BY c.sort_order, c.name`
    );
    success(res, rows);
  } catch (e) { next(e); }
};

/* ── Create category ─────────────────────────────────────────── */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, color, capacity, sort_order } = req.body;
    if (!name?.trim()) return error(res, 'Category name is required.', 400);
    const [r] = await query(
      `INSERT INTO event_categories (name, description, color, capacity, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), description || null, color || '#02462E', capacity || null, sort_order ?? 0]
    );
    created(res, { id: r.insertId }, 'Category created.');
  } catch (e) { next(e); }
};

/* ── Update category ─────────────────────────────────────────── */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, color, capacity, sort_order, is_active } = req.body;
    await query(
      `UPDATE event_categories
       SET name=?, description=?, color=?, capacity=?, sort_order=?, is_active=?
       WHERE id=?`,
      [name, description || null, color || '#02462E', capacity || null,
       sort_order ?? 0, is_active ? 1 : 0, id]
    );
    success(res, null, 'Category updated.');
  } catch (e) { next(e); }
};

/* ── Delete category ─────────────────────────────────────────── */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[{ cnt }]] = await query(
      "SELECT COUNT(*) AS cnt FROM tickets WHERE category_id=? AND status='paid'", [id]
    );
    if (cnt > 0) return error(res, `Cannot delete — ${cnt} paid ticket(s) use this category.`, 409);
    await query('DELETE FROM event_categories WHERE id=?', [id]);
    success(res, null, 'Category deleted.');
  } catch (e) { next(e); }
};

/* ── Assign category to a ticket ────────────────────────────── */
export const assignCategory = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { category_id } = req.body;
    const [tickets] = await query(
      "SELECT id FROM tickets WHERE id=? AND status='paid'", [ticketId]
    );
    if (!tickets.length) return notFound(res, 'Ticket');
    if (category_id) {
      const [cats] = await query(
        'SELECT id, capacity FROM event_categories WHERE id=? AND is_active=1', [category_id]
      );
      if (!cats.length) return error(res, 'Invalid category.', 400);
      if (cats[0].capacity) {
        const [[{ cnt }]] = await query(
          "SELECT COUNT(*) AS cnt FROM tickets WHERE category_id=? AND status='paid'", [category_id]
        );
        if (cnt >= cats[0].capacity) return error(res, 'Category is full.', 409);
      }
    }
    await query('UPDATE tickets SET category_id=? WHERE id=?', [category_id || null, ticketId]);
    success(res, null, 'Category assigned.');
  } catch (e) { next(e); }
};
