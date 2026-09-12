const express = require('express');
const router = express.Router();
const db = require('../db');
const { allFor } = require('../utils/i18n');
const { isOfferLive, todayCode, calcOrderTotals } = require('../utils/helpers');

// Look up an active table OR the counter QR by its code.
async function findLocation(req, res, next) {
  const [rows] = await db.query(
    'SELECT * FROM restaurant_tables WHERE table_code = ? AND is_active = 1',
    [req.params.tableCode]
  );
  if (!rows.length) {
    return res.status(404).render('customer/invalid-table', {});
  }
  req.table = rows[0];
  next();
}

function getLang(req) {
  return req.cookies && req.cookies.lang === 'en' ? 'en' : 'fr'; // French is the default everywhere
}

function getDining(req, table) {
  if (req.cookies && (req.cookies.dining === 'dine_in' || req.cookies.dining === 'takeaway')) {
    return req.cookies.dining;
  }
  return table.is_counter ? 'takeaway' : 'dine_in'; // sensible default per QR type
}

async function getActiveOffer() {
  const [offers] = await db.query('SELECT * FROM offers WHERE is_active = 1');
  return offers.find(isOfferLive) || null;
}

async function getActiveAnnouncement() {
  const [rows] = await db.query('SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');
  return rows[0] || null;
}

async function getSettings() {
  const [rows] = await db.query('SELECT * FROM restaurant_settings WHERE id = 1');
  return rows[0] || { tax_percent: 0, service_charge_percent: 0, address: '', phone: '' };
}

// The counter QR is a friendlier /c/ link that just points at the same
// table lookup as everything else — the DB row's is_counter flag does
// the rest (no table number to auto-fill, defaults to Takeaway, etc.)
router.get('/c/:tableCode', (req, res) => res.redirect(301, `/t/${req.params.tableCode}`));

// ---------------------------------------------------------
// Front page — shown every time (not a one-time gate): logo,
// name, slogan, language switch (top corner), table/counter
// info, Dine in / Takeaway choice, Order Now, address + phone.
// ---------------------------------------------------------
router.get('/t/:tableCode', findLocation, async (req, res) => {
  const lang = getLang(req);
  const settings = await getSettings();
  res.render('customer/language', {
    table: req.table,
    lang,
    t: allFor(lang),
    dining: getDining(req, req.table),
    settings
  });
});

router.post('/t/:tableCode/start', findLocation, (req, res) => {
  const lang = req.body.lang === 'en' ? 'en' : 'fr';
  const dining = req.body.dining === 'takeaway' ? 'takeaway' : 'dine_in';
  res.cookie('lang', lang, { maxAge: 1000 * 60 * 60 * 24 * 30 });
  res.cookie('dining', dining, { maxAge: 1000 * 60 * 60 * 24 });
  res.redirect(`/t/${req.table.table_code}/menu`);
});

// Language switch available from the top corner on every page.
// returnTo keeps the customer on the same kind of page they were on.
router.get('/t/:tableCode/lang/:lang', findLocation, (req, res) => {
  const lang = req.params.lang === 'en' ? 'en' : 'fr';
  res.cookie('lang', lang, { maxAge: 1000 * 60 * 60 * 24 * 30 });
  const returnTo = req.query.returnTo === 'front' ? '' : '/menu';
  res.redirect(`/t/${req.table.table_code}${returnTo}`);
});

router.get('/t/:tableCode/menu', findLocation, async (req, res) => {
  const lang = getLang(req);
  const dining = getDining(req, req.table);
  const today = todayCode();

  const [items] = await db.query(
    `SELECT * FROM menu_items WHERE is_available = 1 ORDER BY category, sort_order, id`
  );
  const menuToday = items.filter((item) => item.days_available.split(',').includes(today));

  const activeOffer = await getActiveOffer();
  const announcement = await getActiveAnnouncement();

  const byCategory = { taco: [], wrap: [], sandwich: [], dip: [], drink: [] };
  menuToday.forEach((item) => byCategory[item.category].push(item));

  res.render('customer/menu', {
    table: req.table,
    lang,
    dining,
    t: allFor(lang),
    byCategory,
    activeOffer,
    announcement
  });
});

router.get('/t/:tableCode/checkout', findLocation, async (req, res) => {
  const lang = getLang(req);
  const dining = getDining(req, req.table);
  const activeOffer = await getActiveOffer();
  const settings = await getSettings();
  const [dips] = await db.query(`SELECT * FROM menu_items WHERE category = 'dip' AND is_available = 1 ORDER BY sort_order, id`);

  res.render('customer/checkout', {
    table: req.table,
    lang,
    dining,
    t: allFor(lang),
    activeOffer,
    settings,
    dips
  });
});

router.get('/t/:tableCode/status/:orderCode', findLocation, async (req, res) => {
  const lang = getLang(req);
  const [orders] = await db.query(
    `SELECT o.*, c.name AS customer_name, c.mobile_number, rt.table_number, rt.is_counter
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     JOIN restaurant_tables rt ON rt.id = o.table_id
     WHERE o.order_code = ?`,
    [req.params.orderCode]
  );
  if (!orders.length) return res.status(404).render('errors/404');
  res.render('customer/status', {
    table: req.table,
    lang,
    t: allFor(lang),
    order: orders[0]
  });
});

router.get('/t/:tableCode/rate/:orderCode', findLocation, async (req, res) => {
  const lang = getLang(req);
  const [orders] = await db.query('SELECT * FROM orders WHERE order_code = ?', [req.params.orderCode]);
  if (!orders.length) return res.status(404).render('errors/404');

  const [orderItems] = await db.query(
    `SELECT DISTINCT mi.id, mi.name_en, mi.name_fr, mi.photo_url
     FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE oi.order_id = ?`,
    [orders[0].id]
  );

  res.render('customer/rating', {
    table: req.table,
    lang,
    t: allFor(lang),
    order: orders[0],
    orderItems
  });
});

module.exports = router;
