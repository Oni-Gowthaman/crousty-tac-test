const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireChef } = require('../middleware/auth');
const { getIO } = require('../socket');
const { generateOrderCode, isOfferLive, calcOrderTotals } = require('../utils/helpers');
const { chargePayment } = require('../utils/payment');
const { sendReadySms } = require('../utils/sms');
const { recalcRatingsForOrder } = require('../utils/ratingRecalc');

// ---------------------------------------------------------
// POST /api/orders — customer places an order
// body: { tableCode, name, mobile, items: [{id, qty}],
//         paymentMode, lang, diningOption, specialInstructions }
// ---------------------------------------------------------
router.post('/orders', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { tableCode, name, mobile, items, paymentMode, lang, diningOption, specialInstructions } = req.body;

    if (!tableCode || !name || !mobile || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Missing order details.' });
    }
    if (!['cash', 'card', 'qr'].includes(paymentMode)) {
      return res.status(400).json({ error: 'Invalid payment mode.' });
    }
    const dining = diningOption === 'takeaway' ? 'takeaway' : 'dine_in';

    const [tableRows] = await conn.query(
      'SELECT * FROM restaurant_tables WHERE table_code = ? AND is_active = 1',
      [tableCode]
    );
    if (!tableRows.length) return res.status(404).json({ error: 'Table not found.' });
    const table = tableRows[0];

    // Load live menu items to trust server-side prices, not the client's.
    const ids = items.map((i) => Number(i.id));
    const [menuRows] = await conn.query(
      `SELECT * FROM menu_items WHERE id IN (${ids.map(() => '?').join(',')}) AND is_available = 1`,
      ids
    );
    if (!menuRows.length) return res.status(400).json({ error: 'Items are no longer available.' });

    let subtotal = 0;
    const lineItems = [];
    items.forEach((cartLine) => {
      const item = menuRows.find((m) => m.id === Number(cartLine.id));
      if (!item) return; // skip sold-out / removed items silently
      const qty = Math.max(1, Number(cartLine.qty) || 1);
      subtotal += Number(item.price) * qty;
      lineItems.push({ menu_item_id: item.id, quantity: qty, unit_price: item.price });
    });
    if (!lineItems.length) return res.status(400).json({ error: 'No valid items in cart.' });
    subtotal = Number(subtotal.toFixed(2));

    const [offerRows] = await conn.query('SELECT * FROM offers WHERE is_active = 1');
    const activeOffer = offerRows.find(isOfferLive) || null;
    const [[settings]] = await conn.query('SELECT * FROM restaurant_settings WHERE id = 1');
    const totals = calcOrderTotals(subtotal, activeOffer, settings);

    await conn.beginTransaction();

    // find-or-create the guest customer by mobile number
    const [existingCustomer] = await conn.query('SELECT * FROM customers WHERE mobile_number = ?', [mobile]);
    let customerId;
    if (existingCustomer.length) {
      customerId = existingCustomer[0].id;
      await conn.query('UPDATE customers SET name = ? WHERE id = ?', [name, customerId]);
    } else {
      const [ins] = await conn.query('INSERT INTO customers (name, mobile_number) VALUES (?, ?)', [name, mobile]);
      customerId = ins.insertId;
    }

    let orderCode = generateOrderCode();
    // extremely unlikely collision guard
    for (let i = 0; i < 3; i++) {
      const [dupe] = await conn.query('SELECT id FROM orders WHERE order_code = ?', [orderCode]);
      if (!dupe.length) break;
      orderCode = generateOrderCode();
    }

    const [orderIns] = await conn.query(
      `INSERT INTO orders
        (order_code, table_id, customer_id, dining_option, status, special_instructions,
         payment_mode_label, subtotal, discount_amount, tax_amount, charge_amount, total_amount, offer_id, language)
       VALUES (?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderCode, table.id, customerId, dining, (specialInstructions || '').slice(0, 500) || null,
        paymentMode, totals.subtotal, totals.discount, totals.tax, totals.charge, totals.total,
        activeOffer ? activeOffer.id : null, lang === 'en' ? 'en' : 'fr'
      ]
    );
    const orderId = orderIns.insertId;

    for (const li of lineItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, li.menu_item_id, li.quantity, li.unit_price]
      );
    }

    // Payment is a LABEL ONLY — the customer pays in person at the
    // counter. This just records what they said they'll use. See
    // server/utils/payment.js for where a real gateway would plug in
    // later if that ever changes.
    const paymentResult = await chargePayment({ method: paymentMode, amount: totals.total, orderCode });
    await conn.query(
      `INSERT INTO payments (order_id, amount, payment_method, payment_status, transaction_reference, paid_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, totals.total, paymentMode, paymentResult.status, paymentResult.reference, null]
    );

    await conn.commit();

    // Push the new order straight to the kitchen screen, tagged with the
    // table (or "Takeaway"), dining mode, total, payment mode, and any
    // cooking instructions — everything the kitchen is allowed to see.
    getIO().to('kitchen').emit('new_order', {
      orderId,
      orderCode,
      tableNumber: table.table_number,
      isCounter: !!table.is_counter,
      dining,
      customerName: name,
      itemCount: lineItems.reduce((s, li) => s + li.quantity, 0),
      total: totals.total,
      paymentMode,
      specialInstructions: specialInstructions || null
    });

    res.json({ success: true, orderCode, totals });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Could not place order. Please try again.' });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------
// GET /api/orders/:code — poll fallback for the status screen
// ---------------------------------------------------------
router.get('/orders/:code', async (req, res) => {
  const [rows] = await db.query(
    `SELECT o.*, rt.table_number FROM orders o JOIN restaurant_tables rt ON rt.id = o.table_id WHERE o.order_code = ?`,
    [req.params.code]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// ---------------------------------------------------------
// POST /api/ratings
// body: { orderCode, favoriteItemIds: [1,2,...], comments }
// "Which food did you like the most?" (multi-select from the
// customer's own order) + an optional free-text comment.
// ---------------------------------------------------------
router.post('/ratings', async (req, res) => {
  const { orderCode, favoriteItemIds, comments } = req.body;
  const [orders] = await db.query('SELECT id FROM orders WHERE order_code = ?', [orderCode]);
  if (!orders.length) return res.status(404).json({ error: 'Order not found.' });
  const orderId = orders[0].id;

  const [ratingIns] = await db.query(
    'INSERT INTO ratings (order_id, comments) VALUES (?, ?)',
    [orderId, (comments || '').trim() || null]
  );
  const ratingId = ratingIns.insertId;

  const ids = Array.isArray(favoriteItemIds) ? favoriteItemIds.map(Number).filter(Boolean) : [];
  for (const menuItemId of ids) {
    await db.query(
      'INSERT INTO item_favorites (rating_id, order_id, menu_item_id) VALUES (?, ?, ?)',
      [ratingId, orderId, menuItemId]
    );
  }

  // Recalculate the displayed rating for every item in this order —
  // being ordered again changes the denominator even for items that
  // weren't picked as a favourite this time.
  recalcRatingsForOrder(orderId).catch((e) => console.error('Rating recalc failed:', e));

  res.json({ success: true });
});

// ===========================================================
// Chef-only endpoints
// ===========================================================

// Live orders for the kitchen screen, grouped by status.
// Kitchen staff may see: items+qty, customer name, table or
// "Takeaway", dining mode, cooking instructions, total price,
// and payment mode. They do NOT see per-item prices, the
// customer's mobile number, or any ratings/reports.
router.get('/chef/orders', requireChef, async (req, res) => {
  const [orders] = await db.query(
    `SELECT o.id, o.order_code, o.status, o.estimated_minutes, o.total_amount, o.created_at,
            o.dining_option, o.special_instructions, o.payment_mode_label,
            rt.table_number, rt.is_counter, c.name AS customer_name
     FROM orders o
     JOIN restaurant_tables rt ON rt.id = o.table_id
     JOIN customers c ON c.id = o.customer_id
     WHERE o.status IN ('new','preparing','ready')
     ORDER BY o.created_at ASC`
  );

  const orderIds = orders.map((o) => o.id);
  let itemsByOrder = {};
  if (orderIds.length) {
    const [items] = await db.query(
      `SELECT oi.order_id, oi.quantity, mi.name_en, mi.name_fr
       FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id
       WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})`,
      orderIds
    );
    items.forEach((it) => {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
      itemsByOrder[it.order_id].push(it);
    });
  }

  res.json(orders.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] })));
});

// Update an order's status (New -> Preparing -> Ready -> Collected)
router.post('/chef/orders/:id/status', requireChef, async (req, res) => {
  const { status, estimatedMinutes } = req.body;
  const allowed = ['new', 'preparing', 'ready', 'collected'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  await db.query(
    `UPDATE orders SET status = ?, estimated_minutes = COALESCE(?, estimated_minutes),
       ready_at = IF(? = 'ready' AND ready_at IS NULL, NOW(), ready_at)
     WHERE id = ?`,
    [status, estimatedMinutes || null, status, req.params.id]
  );

  const [rows] = await db.query(
    `SELECT o.*, c.name AS customer_name, c.mobile_number, rt.table_number
     FROM orders o JOIN customers c ON c.id = o.customer_id JOIN restaurant_tables rt ON rt.id = o.table_id
     WHERE o.id = ?`,
    [req.params.id]
  );
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Live update to the customer's own status screen. The customer only
  // ever sees "Preparing" or "Ready" — both 'new' and 'preparing' map
  // to the same "Preparing" step on their screen (see order-status.js).
  getIO().to(`order_${order.order_code}`).emit('order_status_updated', {
    status: order.status,
    estimatedMinutes: order.estimated_minutes
  });
  // Let the kitchen screen refresh its columns too (e.g. if two chefs are logged in).
  getIO().to('kitchen').emit('orders_changed');

  // The moment it's marked "ready", fire the ready alert once:
  // in-app pop-up (above, via socket) + text message placeholder.
  if (status === 'ready' && !order.ready_notified) {
    await db.query('UPDATE orders SET ready_notified = 1 WHERE id = ?', [order.id]);
    sendReadySms({
      mobileNumber: order.mobile_number,
      customerName: order.customer_name,
      orderCode: order.order_code,
      language: order.language
    }).catch((e) => console.error('SMS send failed:', e));
  }

  res.json({ success: true });
});

// Toggle a dish "sold out today" on/off — syncs live to the customer
// app AND the Manager's menu page (both listen on menu_watchers).
router.post('/chef/menu/:id/toggle', requireChef, async (req, res) => {
  const [rows] = await db.query('SELECT is_available FROM menu_items WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Item not found.' });
  const newValue = rows[0].is_available ? 0 : 1;
  await db.query('UPDATE menu_items SET is_available = ? WHERE id = ?', [newValue, req.params.id]);

  getIO().to('menu_watchers').emit('menu_updated');

  res.json({ success: true, isAvailable: !!newValue });
});

module.exports = router;
