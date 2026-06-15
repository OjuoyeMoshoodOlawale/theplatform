/**
 * ticketTypesController.js
 * Full self-service CRUD for ticket types under an event.
 * Admins can add/edit/delete/reorder types without developer help.
 */
import { query } from '../database/db.js';
import { success, created, error, notFound } from '../utils/response.js';
import { tenantWhere } from '../utils/tenantScope.js';

export const PARTICIPANT_CATEGORIES = [
  { value: 'all',           label: 'All Participants' },
  { value: 'undergraduate', label: 'Undergraduate Students' },
  { value: 'graduate',      label: 'Graduate / Postgraduate Students' },
  { value: 'professional',  label: 'Professionals / Alumni' },
  { value: 'other',         label: 'Other' },
];

/* ── List ticket types for an event ─────────────────────────── */
export const listTicketTypes = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const [rows] = await query(
      `SELECT tt.*,
              e.early_bird_closes_at,
              CASE
                WHEN e.early_bird_closes_at IS NOT NULL
                 AND e.early_bird_closes_at > NOW()
                 AND tt.early_bird_price IS NOT NULL
                THEN 1 ELSE 0
              END AS early_bird_active,
              (tt.quantity_available IS NULL OR tt.quantity_available > tt.quantity_sold) AS has_availability
       FROM ticket_types tt
       JOIN events e ON e.id = tt.event_id
       WHERE tt.event_id = ? AND tt.is_active = 1
       ORDER BY tt.sort_order, tt.participant_category, tt.regular_price`,
      [eventId]
    );
    success(res, rows);
  } catch (e) { next(e); }
};

export const adminListTicketTypes = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const [rows] = await query(
      `SELECT tt.*, e.early_bird_closes_at
       FROM ticket_types tt
       JOIN events e ON e.id = tt.event_id
       WHERE tt.event_id = ?
       ORDER BY tt.sort_order, tt.participant_category, tt.regular_price`,
      [eventId]
    );
    success(res, rows);
  } catch (e) { next(e); }
};

/* ── Create ticket type ──────────────────────────────────────── */
export const createTicketType = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const {
      name, participant_category = 'all', description,
      regular_price, early_bird_price,
      quantity_available, sort_order = 0,
    } = req.body;

    if (!name?.trim())               return error(res, 'Type name is required.', 400);
    if (!regular_price && regular_price !== 0) return error(res, 'Regular price is required.', 400);
    if (parseFloat(regular_price) < 0) return error(res, 'Price cannot be negative.', 400);
    if (early_bird_price && parseFloat(early_bird_price) >= parseFloat(regular_price))
      return error(res, 'Early bird price must be lower than regular price.', 400);

    // Verify the event belongs to this tenant before adding a ticket type
    const t = tenantWhere(req, 'e');
    const [events] = await query(`SELECT e.id FROM events e WHERE e.id=?${t.clause}`, [eventId, ...t.params]);
    if (!events.length) return notFound(res, 'Event');

    const [r] = await query(
      `INSERT INTO ticket_types
         (event_id, name, participant_category, description, regular_price,
          early_bird_price, quantity_available, sort_order)
       VALUES (?,?,?,?,?,?,?,?)`,
      [eventId, name.trim(), participant_category, description || null,
       parseFloat(regular_price), early_bird_price ? parseFloat(early_bird_price) : null,
       quantity_available || null, sort_order]
    );
    created(res, { id: r.insertId }, 'Ticket type created.');
  } catch (e) { next(e); }
};

/* ── Update ticket type ──────────────────────────────────────── */
export const updateTicketType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, participant_category, description,
      regular_price, early_bird_price,
      quantity_available, sort_order, is_active,
    } = req.body;

    if (!name?.trim())               return error(res, 'Type name is required.', 400);
    if (parseFloat(regular_price) < 0) return error(res, 'Price cannot be negative.', 400);
    if (early_bird_price && parseFloat(early_bird_price) >= parseFloat(regular_price))
      return error(res, 'Early bird price must be lower than regular price.', 400);

    const t = tenantWhere(req, '');
    const [r] = await query(
      `UPDATE ticket_types SET
         name=?, participant_category=?, description=?,
         regular_price=?, early_bird_price=?,
         quantity_available=?, sort_order=?, is_active=?
       WHERE id=?${t.clause}`,
      [name.trim(), participant_category || 'all', description || null,
       parseFloat(regular_price),
       early_bird_price ? parseFloat(early_bird_price) : null,
       quantity_available || null, sort_order ?? 0,
       is_active ? 1 : 0, id, ...t.params]
    );
    if (!r.affectedRows) return error(res, 'Ticket type not found in your organisation.', 404);
    success(res, null, 'Ticket type updated.');
  } catch (e) { next(e); }
};

/* ── Delete ticket type ──────────────────────────────────────── */
export const deleteTicketType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[{ sold }]] = await query(
      "SELECT COUNT(*) AS sold FROM tickets WHERE ticket_type_id=? AND status='paid'", [id]
    );
    if (sold > 0)
      return error(res, `Cannot delete — ${sold} paid ticket(s) exist for this type. Deactivate it instead.`, 409);
    const t = tenantWhere(req, '');
    const [r] = await query(`DELETE FROM ticket_types WHERE id=?${t.clause}`, [id, ...t.params]);
    if (!r.affectedRows) return error(res, 'Ticket type not found in your organisation.', 404);
    success(res, null, 'Ticket type deleted.');
  } catch (e) { next(e); }
};

/* ── Bulk reorder ────────────────────────────────────────────── */
export const reorderTicketTypes = async (req, res, next) => {
  try {
    const { order } = req.body; // [{ id, sort_order }]
    for (const item of (order || [])) {
      await query('UPDATE ticket_types SET sort_order=? WHERE id=?', [item.sort_order, item.id]);
    }
    success(res, null, 'Order saved.');
  } catch (e) { next(e); }
};

/* ── List participant categories (for dropdowns) ─────────────── */
export const getParticipantCategories = async (_req, res) => {
  success(res, PARTICIPANT_CATEGORIES);
};
