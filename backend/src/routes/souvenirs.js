import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { query } from '../database/db.js';
import { success, created, error, notFound } from '../utils/response.js';
import { initializeTransaction, verifyTransaction } from '../services/paystackService.js';
import { grossUpForPaystack } from '../utils/paystackFees.js';
import { tenantWhere, stampId } from '../utils/tenantScope.js';
import { resolvePaystackKeys } from '../utils/paystackKeys.js';

const router = express.Router();
const adm    = [authenticate, authorize('super_admin', 'admin')];

/* ── Public: list active souvenirs ──────────────────────────── */
router.get('/souvenirs', async (req, res, next) => {
  try {
    const { event_id } = req.query;
    let where = 'WHERE s.is_active = 1';
    const params = [];
    if (event_id) {
      where += ' AND (s.event_id = ? OR s.event_id IS NULL)';
      params.push(event_id);
    }
    const tScope = tenantWhere(req, 's');
    where += tScope.clause;
    params.push(...tScope.params);
    const [rows] = await query(
      `SELECT s.*,
              e.title AS event_title, e.edition,
              (s.available_qty IS NULL OR s.available_qty > s.sold_qty) AS in_stock
       FROM souvenirs s
       LEFT JOIN events e ON e.id = s.event_id
       ${where}
       ORDER BY s.sort_order, s.name`,
      params
    );
    success(res, rows);
  } catch (e) { next(e); }
});

/* ── Admin: list all (inc inactive) ────────────────────────── */
router.get('/souvenirs/all', ...adm, async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT s.*, e.title AS event_title, e.edition
       FROM souvenirs s LEFT JOIN events e ON e.id = s.event_id
       ORDER BY s.sort_order, s.name`
    );
    success(res, rows);
  } catch (e) { next(e); }
});

/* ── Admin: create souvenir ─────────────────────────────────── */
router.post('/souvenirs', ...adm, async (req, res, next) => {
  try {
    const { event_id, name, description, price, image_url, available_qty, sort_order } = req.body;
    if (!name?.trim())       return error(res, 'Name is required.', 400);
    if (!price || price < 0) return error(res, 'Valid price required.', 400);
    // If tied to an event, that event must belong to this tenant
    if (event_id) {
      const te = tenantWhere(req, 'e');
      const [ev] = await query(`SELECT e.id FROM events e WHERE e.id=?${te.clause}`, [event_id, ...te.params]);
      if (!ev.length) return error(res, 'Event not found in your organisation.', 404);
    }
    const [r] = await query(
      `INSERT INTO souvenirs (event_id, name, description, price, image_url, available_qty, sort_order, tenant_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [event_id || null, name.trim(), description || null, parseFloat(price),
       image_url || null, available_qty || null, sort_order ?? 0, stampId(req)]
    );
    created(res, { id: r.insertId }, 'Souvenir created.');
  } catch (e) { next(e); }
});

/* ── Admin: update souvenir ─────────────────────────────────── */
router.put('/souvenirs/:id', ...adm, async (req, res, next) => {
  try {
    const { event_id, name, description, price, image_url, available_qty, sort_order, is_active } = req.body;
    const ts = tenantWhere(req, '');
    const [r] = await query(
      `UPDATE souvenirs SET event_id=?, name=?, description=?, price=?,
         image_url=?, available_qty=?, sort_order=?, is_active=? WHERE id=?${ts.clause}`,
      [event_id || null, name, description || null, parseFloat(price),
       image_url || null, available_qty || null, sort_order ?? 0, is_active ? 1 : 0, req.params.id, ...ts.params]
    );
    if (!r.affectedRows) return error(res, 'Souvenir not found in your organisation.', 404);
    success(res, null, 'Souvenir updated.');
  } catch (e) { next(e); }
});

/* ── Admin: delete souvenir ─────────────────────────────────── */
router.delete('/souvenirs/:id', ...adm, async (req, res, next) => {
  try {
    const [[{ cnt }]] = await query(
      "SELECT COUNT(*) AS cnt FROM souvenir_orders WHERE souvenir_id=? AND status='paid'", [req.params.id]
    );
    if (cnt > 0) return error(res, `Cannot delete — ${cnt} paid order(s) exist. Deactivate instead.`, 409);
    const ts = tenantWhere(req, '');
    const [r] = await query(`DELETE FROM souvenirs WHERE id=?${ts.clause}`, [req.params.id, ...ts.params]);
    if (!r.affectedRows) return error(res, 'Souvenir not found in your organisation.', 404);
    success(res, null, 'Souvenir deleted.');
  } catch (e) { next(e); }
});

/* ── Public: initiate souvenir purchase ─────────────────────── */
/* ── Public: multi-item CART checkout (one payment for many products) ──────── */
router.post('/souvenirs/cart/order', async (req, res, next) => {
  try {
    const { buyer_name, buyer_email, buyer_phone, delivery_address, notes, items } = req.body;

    if (!buyer_name?.trim()) return error(res, 'Your name is required.', 400);
    if (!buyer_email?.trim() || !/\S+@\S+\.\S+/.test(buyer_email))
      return error(res, 'Valid email required.', 400);
    if (!Array.isArray(items) || !items.length)
      return error(res, 'Your cart is empty.', 400);

    // Load & validate every item, compute the true total from DB prices
    const lines = [];
    let subtotal = 0;
    for (const it of items) {
      const qty = Math.max(1, parseInt(it.quantity || it.qty || 1));
      const [rows] = await query('SELECT * FROM souvenirs WHERE id=? AND is_active=1', [it.id]);
      if (!rows.length) return error(res, 'A product in your cart is no longer available.', 404);
      const sv = rows[0];
      if (sv.available_qty !== null && sv.sold_qty + qty > sv.available_qty)
        return error(res, `Only ${sv.available_qty - sv.sold_qty} of "${sv.name}" left in stock.`, 409);
      const unit = parseFloat(sv.price);
      lines.push({ sv, qty, unit, line_total: unit * qty });
      subtotal += unit * qty;
    }

    // Gross up the WHOLE cart once so the org receives the exact subtotal
    const { total: chargeAmount } = grossUpForPaystack(subtotal);
    const reference = `CART-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

    // Collision-proof base order number (COUNT(*)+1 collides with pending orders).
    // Each line row gets a unique suffix; all share ONE paystack_reference.
    const yy = new Date().getFullYear().toString().slice(-2);
    const baseOrderNo = `SVN-${yy}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2,4).toUpperCase()}`;

    // One order row PER line item, sharing the reference; unique order_number each
    const orderIds = [];
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const lineOrderNo = lines.length > 1 ? `${baseOrderNo}-${i + 1}` : baseOrderNo;
      const [r] = await query(
        `INSERT INTO souvenir_orders
           (order_number, souvenir_id, buyer_name, buyer_email, buyer_phone, quantity, unit_price,
            total_amount, status, paystack_reference, delivery_address, notes)
         VALUES (?,?,?,?,?,?,?,?,'pending',?,?,?)`,
        [lineOrderNo, ln.sv.id, buyer_name.trim(), buyer_email.toLowerCase(), buyer_phone || null,
         ln.qty, ln.unit, ln.line_total, reference,
         delivery_address || null, notes || null]
      );
      orderIds.push(r.insertId);
    }
    const order_number = baseOrderNo;

    const keys = resolvePaystackKeys(req.tenant);
    const payData = await initializeTransaction({
      email:        buyer_email.toLowerCase(),
      amount:       Math.round(chargeAmount * 100),
      reference,
      metadata:     { order_number, item_count: lines.length, buyer_name, cart: true },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shop/verify?ref=${reference}`,
      secretKey:    keys.secret,
    });

    created(res, {
      order_number,
      order_ids:    orderIds,
      reference,
      payment_url:  payData.authorization_url,
      access_code:  payData.access_code,
      public_key:   keys.public,
      subtotal,
      total:        chargeAmount,
      fee:          chargeAmount - subtotal,
      item_count:   lines.length,
    }, 'Cart order placed. Complete payment to confirm.');
  } catch (e) { next(e); }
});

router.post('/souvenirs/:id/order', async (req, res, next) => {
  try {
    const { buyer_name, buyer_email, buyer_phone, quantity = 1, delivery_address, notes } = req.body;

    if (!buyer_name?.trim()) return error(res, 'Your name is required.', 400);
    if (!buyer_email?.trim() || !/\S+@\S+\.\S+/.test(buyer_email))
      return error(res, 'Valid email required.', 400);

    const [souvenirs] = await query(
      'SELECT * FROM souvenirs WHERE id=? AND is_active=1', [req.params.id]
    );
    if (!souvenirs.length) return notFound(res, 'Souvenir');
    const sv = souvenirs[0];

    // Stock check
    if (sv.available_qty !== null && sv.sold_qty + quantity > sv.available_qty)
      return error(res, `Only ${sv.available_qty - sv.sold_qty} item(s) left in stock.`, 409);

    const unit_price   = parseFloat(sv.price);
    const total_amount = unit_price * parseInt(quantity);
    // Gross up so the org receives the exact item total after Paystack's cut
    const { total: chargeAmount } = grossUpForPaystack(total_amount);
    const reference    = `SVN-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

    // Collision-proof order number: SVN-25-<base36 timestamp>-<rand>
    // (COUNT(*)+1 collides when there are abandoned/pending orders)
    const yy = new Date().getFullYear().toString().slice(-2);
    const order_number = `SVN-${yy}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2,4).toUpperCase()}`;

    // Create pending order
    const [r] = await query(
      `INSERT INTO souvenir_orders
         (order_number, souvenir_id, buyer_name, buyer_email, buyer_phone, quantity, unit_price,
          total_amount, status, paystack_reference, delivery_address, notes)
       VALUES (?,?,?,?,?,?,?,?,'pending',?,?,?)`,
      [order_number, sv.id, buyer_name.trim(), buyer_email.toLowerCase(), buyer_phone || null,
       parseInt(quantity), unit_price, total_amount, reference,
       delivery_address || null, notes || null]
    );

    // Initiate Paystack
    const keys = resolvePaystackKeys(req.tenant);
    const payData = await initializeTransaction({
      email:        buyer_email.toLowerCase(),
      amount:       Math.round(chargeAmount * 100), // kobo (item total + Paystack fee)
      reference,
      metadata:     { souvenir_id: sv.id, order_id: r.insertId, buyer_name, souvenir_name: sv.name, quantity },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shop/verify?ref=${reference}`,
      secretKey:    keys.secret,
    });

    created(res, {
      order_id:     r.insertId,
      reference,
      payment_url:  payData.authorization_url,
      access_code:  payData.access_code,
      public_key:   keys.public,
      subtotal:     total_amount,
      total:        chargeAmount,
      fee:          chargeAmount - total_amount,
    }, `Order placed. Complete payment to confirm.`);
  } catch (e) { next(e); }
});

/* ── Public: verify souvenir payment ────────────────────────── */
router.get('/souvenirs/verify/:reference', async (req, res, next) => {
  try {
    const { reference } = req.params;
    const [orders] = await query(
      `SELECT o.*, s.name AS souvenir_name, s.available_qty, s.sold_qty
       FROM souvenir_orders o JOIN souvenirs s ON s.id = o.souvenir_id
       WHERE o.paystack_reference=?`, [reference]
    );
    if (!orders.length) return notFound(res, 'Order');

    // All rows for this reference (1 for single item, N for a cart)
    const alreadyPaid = orders.every(o => o.status === 'paid');
    if (alreadyPaid) {
      return success(res, { ...orders[0], status: 'paid', items: orders }, 'Already confirmed.');
    }

    const verData = await verifyTransaction(reference, resolvePaystackKeys(req.tenant).secret);
    if (verData.status !== 'success')
      return error(res, 'Payment not confirmed yet.', 402);

    // Mark ALL rows for this reference paid, and increment each souvenir's stock
    await query(
      "UPDATE souvenir_orders SET status='paid', paid_at=NOW() WHERE paystack_reference=?", [reference]
    );
    for (const o of orders) {
      await query('UPDATE souvenirs SET sold_qty=sold_qty+? WHERE id=?', [o.quantity, o.souvenir_id]);
    }

    const grandTotal = orders.reduce((s, o) => s + parseFloat(o.total_amount), 0);
    success(res, {
      ...orders[0],
      status: 'paid',
      items: orders,
      item_count: orders.length,
      grand_total: grandTotal,
    }, `Payment confirmed! Your order is being processed.`);
  } catch (e) { next(e); }
});

/* ── Admin: list all orders ─────────────────────────────────── */
router.get('/souvenir-orders', ...adm, async (req, res, next) => {
  try {
    const { status } = req.query;
    let where = ''; const params = [];
    if (status) { where = 'WHERE o.status=?'; params.push(status); }
    const [rows] = await query(
      `SELECT o.*, s.name AS souvenir_name, s.price AS unit_price_current
       FROM souvenir_orders o JOIN souvenirs s ON s.id = o.souvenir_id
       ${where} ORDER BY o.created_at DESC`,
      params
    );
    success(res, rows);
  } catch (e) { next(e); }
});

/* ── Admin: mark order as delivered ─────────────────────────── */
router.patch('/souvenir-orders/:id/deliver', ...adm, async (req, res, next) => {
  try {
    await query("UPDATE souvenir_orders SET status='delivered' WHERE id=? AND status='paid'", [req.params.id]);
    success(res, null, 'Order marked as delivered.');
  } catch (e) { next(e); }
});

export default router;
