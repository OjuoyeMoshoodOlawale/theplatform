/**
 * reportsController.js
 * R&P (Report and Programme) — revenue, participant counts, daily breakdown
 */
import { query } from '../database/db.js';
import { success } from '../utils/response.js';

/* ── Event overview report ───────────────────────────────────── */
export const eventOverview = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Revenue & ticket totals
    const [[rev]] = await query(
      `SELECT
         COUNT(*) AS total_tickets,
         SUM(status='paid') AS paid_tickets,
         SUM(status='pending') AS pending_tickets,
         SUM(CASE WHEN status='paid' THEN amount_paid ELSE 0 END) AS total_revenue,
         SUM(CASE WHEN status='paid' AND is_early_bird=1 THEN amount_paid ELSE 0 END) AS early_bird_revenue,
         SUM(CASE WHEN status='paid' AND is_early_bird=0 THEN amount_paid ELSE 0 END) AS regular_revenue
       FROM tickets WHERE event_id=?`,
      [eventId]
    );

    // By ticket type
    const [byType] = await query(
      `SELECT tt.name, tt.regular_price, tt.early_bird_price,
              COUNT(t.id) AS sold, SUM(t.amount_paid) AS revenue
       FROM ticket_types tt
       LEFT JOIN tickets t ON t.ticket_type_id=tt.id AND t.status='paid'
       WHERE tt.event_id=?
       GROUP BY tt.id ORDER BY tt.regular_price`,
      [eventId]
    );

    // By category
    const [byCategory] = await query(
      `SELECT
         COALESCE(c.name,'Unassigned') AS category,
         c.color,
         COUNT(t.id) AS count,
         SUM(t.amount_paid) AS revenue
       FROM tickets t
       LEFT JOIN event_categories c ON c.id=t.category_id
       WHERE t.event_id=? AND t.status='paid'
       GROUP BY c.id ORDER BY c.sort_order, c.name`,
      [eventId]
    );

    // Attendance summary
    const [[att]] = await query(
      `SELECT
         COUNT(*) AS total_checked_in,
         SUM(checked_out_at IS NOT NULL) AS checked_out,
         SUM(checked_out_at IS NULL) AS on_premises
       FROM attendance WHERE event_id=? AND checked_in_at IS NOT NULL`,
      [eventId]
    );

    success(res, { revenue: rev, byType, byCategory, attendance: att });
  } catch (e) { next(e); }
};

/* ── Daily breakdown (check-in counts + revenue per day) ─────── */
export const dailyReport = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    // Get event days
    const [days] = await query(
      'SELECT * FROM event_days WHERE event_id=? ORDER BY day_number',
      [eventId]
    );

    // If no days defined, use calendar dates from attendance
    const [checkinDays] = await query(
      `SELECT DATE(checked_in_at) AS day_date,
              COUNT(*) AS checked_in,
              SUM(checked_out_at IS NOT NULL) AS checked_out
       FROM attendance
       WHERE event_id=? AND checked_in_at IS NOT NULL
       GROUP BY DATE(checked_in_at)
       ORDER BY day_date`,
      [eventId]
    );

    // Revenue by purchase date
    const [revDays] = await query(
      `SELECT DATE(purchased_at) AS sale_date,
              COUNT(*) AS tickets_sold,
              SUM(amount_paid) AS revenue
       FROM tickets
       WHERE event_id=? AND status='paid' AND purchased_at IS NOT NULL
       GROUP BY DATE(purchased_at)
       ORDER BY sale_date`,
      [eventId]
    );

    // Category breakdown per day
    const [catPerDay] = await query(
      `SELECT DATE(a.checked_in_at) AS day_date,
              COALESCE(c.name,'Unassigned') AS category,
              c.color,
              COUNT(*) AS count
       FROM attendance a
       JOIN tickets t ON t.id=a.ticket_id
       LEFT JOIN event_categories c ON c.id=t.category_id
       WHERE a.event_id=? AND a.checked_in_at IS NOT NULL
       GROUP BY DATE(a.checked_in_at), c.id
       ORDER BY day_date, c.sort_order`,
      [eventId]
    );

    success(res, { days, checkinDays, revDays, catPerDay });
  } catch (e) { next(e); }
};

/* ── Event snapshot (dashboard progress) ─────────────────────── */
export const dashboardSnapshot = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const [[tickets]] = await query(
      `SELECT
         SUM(status='paid') AS sold,
         SUM(CASE WHEN status='paid' THEN amount_paid ELSE 0 END) AS revenue
       FROM tickets WHERE event_id=?`,
      [eventId]
    );

    const [[att]] = await query(
      `SELECT COUNT(*) AS checked_in,
              SUM(checked_out_at IS NOT NULL) AS checked_out
       FROM attendance WHERE event_id=? AND checked_in_at IS NOT NULL`,
      [eventId]
    );

    const [ticketTypes] = await query(
      `SELECT tt.name, tt.quantity_available, tt.quantity_sold,
              COUNT(t.id) AS sold_count
       FROM ticket_types tt
       LEFT JOIN tickets t ON t.ticket_type_id=tt.id AND t.status='paid'
       WHERE tt.event_id=? GROUP BY tt.id`,
      [eventId]
    );

    const [categories] = await query(
      `SELECT c.name, c.color, c.capacity,
              COUNT(t.id) AS registered
       FROM event_categories c
       LEFT JOIN tickets t ON t.category_id=c.id AND t.status='paid' AND t.event_id=?
       WHERE c.is_active=1
       GROUP BY c.id ORDER BY c.sort_order`,
      [eventId]
    );

    // Save today's snapshot
    const today = new Date().toISOString().slice(0,10);
    await query(
      `INSERT INTO event_snapshots (event_id, snapshot_date, tickets_sold, revenue, checked_in, checked_out)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         tickets_sold=VALUES(tickets_sold), revenue=VALUES(revenue),
         checked_in=VALUES(checked_in), checked_out=VALUES(checked_out)`,
      [eventId, today, tickets.sold||0, tickets.revenue||0, att.checked_in||0, att.checked_out||0]
    );

    // Historical snapshots for trend chart
    const [snapshots] = await query(
      `SELECT snapshot_date, tickets_sold, revenue, checked_in
       FROM event_snapshots WHERE event_id=? ORDER BY snapshot_date ASC`,
      [eventId]
    );

    success(res, {
      tickets: { sold: tickets.sold||0, revenue: tickets.revenue||0 },
      attendance: att,
      ticketTypes,
      categories,
      snapshots,
    });
  } catch (e) { next(e); }
};
