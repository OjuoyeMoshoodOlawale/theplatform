/**
 * hostelController.js
 * CRUD for hostels (global, reusable) + assignment per event
 */
import { query } from '../database/db.js';
import { success, created, error, notFound } from '../utils/response.js';
import { tenantWhere, stampId } from '../utils/tenantScope.js';

/* ── List hostels ────────────────────────────────────────────── */
export const listHostels = async (req, res, next) => {
  try {
    const t = tenantWhere(req, 'h');
    const [rows] = await query(
      `SELECT h.*,
              (SELECT COUNT(*) FROM hostel_assignments ha WHERE ha.hostel_id = h.id) AS total_assigned
       FROM hostels h WHERE h.is_active = 1${t.clause}
       ORDER BY h.sort_order, h.name`,
      t.params
    );
    success(res, rows);
  } catch (e) { next(e); }
};

export const listAllHostels = async (req, res, next) => {
  try {
    const t = tenantWhere(req, 'h');
    const [rows] = await query(
      `SELECT h.*,
              (SELECT COUNT(*) FROM hostel_assignments ha WHERE ha.hostel_id = h.id) AS total_assigned
       FROM hostels h WHERE 1=1${t.clause} ORDER BY h.sort_order, h.name`,
      t.params
    );
    success(res, rows);
  } catch (e) { next(e); }
};

/* ── Create hostel ───────────────────────────────────────────── */
export const createHostel = async (req, res, next) => {
  try {
    const { name, gender, beds, location, description, sort_order } = req.body;
    if (!name?.trim()) return error(res, 'Hostel name is required.', 400);
    if (!beds || beds < 1) return error(res, 'Number of beds must be at least 1.', 400);
    const [r] = await query(
      `INSERT INTO hostels (name, gender, beds, location, description, sort_order, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), gender || 'mixed', beds,
       location || null, description || null, sort_order ?? 0, stampId(req)]
    );
    created(res, { id: r.insertId }, 'Hostel created.');
  } catch (e) { next(e); }
};

/* ── Update hostel ───────────────────────────────────────────── */
export const updateHostel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, gender, beds, location, description, sort_order, is_active } = req.body;
    const t = tenantWhere(req, '');
    const [r] = await query(
      `UPDATE hostels SET name=?, gender=?, beds=?, location=?,
       description=?, sort_order=?, is_active=? WHERE id=?${t.clause}`,
      [name, gender || 'mixed', beds, location || null,
       description || null, sort_order ?? 0, is_active ? 1 : 0, id, ...t.params]
    );
    if (!r.affectedRows) return error(res, 'Hostel not found in your organisation.', 404);
    success(res, null, 'Hostel updated.');
  } catch (e) { next(e); }
};

/* ── Delete hostel ───────────────────────────────────────────── */
export const deleteHostel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[{ cnt }]] = await query(
      'SELECT COUNT(*) AS cnt FROM hostel_assignments WHERE hostel_id=?', [id]
    );
    if (cnt > 0) return error(res, `Cannot delete — ${cnt} participant(s) assigned to this hostel.`, 409);
    const t = tenantWhere(req, '');
    const [r] = await query(`DELETE FROM hostels WHERE id=?${t.clause}`, [id, ...t.params]);
    if (!r.affectedRows) return error(res, 'Hostel not found in your organisation.', 404);
    success(res, null, 'Hostel deleted.');
  } catch (e) { next(e); }
};

/* ── Availability for an event ───────────────────────────────── */
export const hostelAvailability = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const [rows] = await query(
      `SELECT h.*,
              COUNT(ha.id) AS assigned_count,
              (h.beds - COUNT(ha.id)) AS remaining
       FROM hostels h
       LEFT JOIN hostel_assignments ha ON ha.hostel_id = h.id AND ha.event_id = ?
       WHERE h.is_active = 1
       GROUP BY h.id
       ORDER BY h.gender, h.sort_order, h.name`,
      [eventId]
    );
    success(res, rows);
  } catch (e) { next(e); }
};

/* ── Assign hostel to participant (at check-in) ──────────────── */
export const assignHostel = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { hostel_id, event_id, room_number, notes } = req.body;

    // Verify ticket
    const [tickets] = await query(
      `SELECT t.id, t.participant_id, t.event_id FROM tickets t
       WHERE t.id=? AND t.status='paid'`,
      [ticketId]
    );
    if (!tickets.length) return notFound(res, 'Ticket');
    const ticket = tickets[0];

    // Verify hostel + check capacity
    const [hostels] = await query(
      `SELECT h.*, COUNT(ha.id) AS used
       FROM hostels h
       LEFT JOIN hostel_assignments ha ON ha.hostel_id = h.id AND ha.event_id = ?
       WHERE h.id = ? AND h.is_active = 1
       GROUP BY h.id`,
      [event_id || ticket.event_id, hostel_id]
    );
    if (!hostels.length) return error(res, 'Hostel not found or inactive.', 404);
    const hostel = hostels[0];
    if (hostel.used >= hostel.capacity) return error(res, `${hostel.name} is full.`, 409);

    // Remove any existing assignment for this ticket
    await query('DELETE FROM hostel_assignments WHERE ticket_id=?', [ticketId]);

    // Create new assignment
    await query(
      `INSERT INTO hostel_assignments
         (hostel_id, event_id, ticket_id, participant_id, room_number, notes, assigned_by)
       VALUES (?,?,?,?,?,?,?)`,
      [hostel_id, event_id || ticket.event_id, ticketId, ticket.participant_id,
       room_number || null, notes || null, req.admin?.id || null]
    );

    success(res, {
      hostel_name: hostel.name,
      room_number:  room_number || null,
    }, `Assigned to ${hostel.name}${room_number ? ' room ' + room_number : ''}.`);
  } catch (e) { next(e); }
};

/* ── Get assignment for a ticket ─────────────────────────────── */
export const getAssignment = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const [rows] = await query(
      `SELECT ha.*, h.name AS hostel_name, h.gender
       FROM hostel_assignments ha
       JOIN hostels h ON h.id = ha.hostel_id
       WHERE ha.ticket_id = ?`,
      [ticketId]
    );
    success(res, rows[0] || null);
  } catch (e) { next(e); }
};

/* ── Full assignments list for an event ──────────────────────── */
export const eventAssignments = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const [rows] = await query(
      `SELECT ha.*, h.name AS hostel_name, h.gender,
              p.name AS participant_name, p.phone,
              t.unique_number, tt.name AS ticket_type,
              c.name AS category_name
       FROM hostel_assignments ha
       JOIN hostels h    ON h.id  = ha.hostel_id
       JOIN participants p ON p.id = ha.participant_id
       JOIN tickets t    ON t.id  = ha.ticket_id
       JOIN ticket_types tt ON tt.id = t.ticket_type_id
       LEFT JOIN event_categories c ON c.id = t.category_id
       WHERE ha.event_id = ?
       ORDER BY h.gender, h.name, ha.room_number`,
      [eventId]
    );
    success(res, rows);
  } catch (e) { next(e); }
};

/* ── Remove hostel assignment ────────────────────────────────── */
export const removeAssignment = async (req, res, next) => {
  try {
    await query('DELETE FROM hostel_assignments WHERE ticket_id=?', [req.params.ticketId]);
    success(res, null, 'Hostel assignment removed.');
  } catch (e) { next(e); }
};
