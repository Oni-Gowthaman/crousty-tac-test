const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { generateTableCode } = require('../utils/helpers');
const { recalcItemRating } = require('../utils/ratingRecalc');
const { allFor: adminT } = require('../utils/adminI18n');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ===========================================================
// Auth
// ===========================================================
router.get('/login', (req, res) => {
  if (req.session.staff && req.session.staff.role === 'admin') return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.query(`SELECT * FROM staff WHERE username = ? AND role = 'admin' AND is_active = 1`, [username]);
  if (!rows.length) return res.render('admin/login', { error: 'Unknown username.' });

  const match = await bcrypt.compare(password || '', rows[0].password_hash || '');
  if (!match) return res.render('admin/login', { error: 'Incorrect password.' });

  req.session.staff = { id: rows[0].id, name: rows[0].name, role: 'admin' };
  res.redirect('/admin/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.use(requireAdmin); // everything below this line requires an admin session

// Lightweight EN/FR toggle for the admin chrome (sidebar + page titles).
// Sets res.locals so every render() below gets `adminLang` / `at` for
// free, without editing each route.
router.use((req, res, next) => {
  const lang = req.cookies.adminLang === 'fr' ? 'fr' : 'en';
  res.locals.adminLang = lang;
  res.locals.at = adminT(lang);
  next();
});

router.get('/lang/:lang', (req, res) => {
  res.cookie('adminLang', req.params.lang === 'fr' ? 'fr' : 'en', { maxAge: 1000 * 60 * 60 * 24 * 365 });
  res.redirect(req.get('Referer') || '/admin/dashboard');
});

// ===========================================================
// Dashboard
// ===========================================================
router.get('/dashboard', async (req, res) => {
  const [[{ todayOrders }]] = await db.query(
    `SELECT COUNT(*) AS todayOrders FROM orders WHERE DATE(created_at) = CURDATE()`
  );
  const [[{ todayRevenue }]] = await db.query(
    `SELECT COALESCE(SUM(total_amount),0) AS todayRevenue FROM orders WHERE DATE(created_at) = CURDATE() AND status <> 'cancelled'`
  );
  const [topDishes] = await db.query(
    `SELECT mi.name_en, mi.name_fr, SUM(oi.quantity) AS qty
     FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id
     JOIN orders o ON o.id = oi.order_id
     WHERE DATE(o.created_at) = CURDATE()
     GROUP BY oi.menu_item_id ORDER BY qty DESC LIMIT 5`
  );
  const [activeOrders] = await db.query(
    `SELECT status, COUNT(*) AS c FROM orders WHERE status IN ('new','preparing','ready') GROUP BY status`
  );
  const [[{ soldOutCount }]] = await db.query(`SELECT COUNT(*) AS soldOutCount FROM menu_items WHERE is_available = 0`);
  res.render('admin/dashboard', { staff: req.session.staff, todayOrders, todayRevenue, topDishes, activeOrders, soldOutCount });
});

// ===========================================================
// Menu management
// ===========================================================
router.get('/menu', async (req, res) => {
  const [items] = await db.query('SELECT * FROM menu_items ORDER BY category, sort_order, id');
  res.render('admin/menu', { staff: req.session.staff, items, editItem: null, error: null });
});

router.get('/menu/new', (req, res) => {
  res.render('admin/menu-form', { staff: req.session.staff, item: null, error: null });
});

router.post('/menu/new', upload.single('photo'), async (req, res) => {
  const b = req.body;
  const photoUrl = req.file ? `/uploads/menu/${req.file.filename}` : '/uploads/menu/placeholder.svg';
  const days = Array.isArray(b.days) ? b.days.join(',') : (b.days || 'mon,tue,wed,thu,fri,sat,sun');
  const ratingLocked = b.rating_locked ? 1 : 0;
  await db.query(
    `INSERT INTO menu_items
      (name_en, name_fr, category, ingredients_en, ingredients_fr, price, photo_url, is_veg, rating, rating_manual_override, days_available, is_available)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.name_en, b.name_fr, b.category, b.ingredients_en, b.ingredients_fr, b.price, photoUrl,
     b.is_veg ? 1 : 0, b.rating || 4.5, ratingLocked, days, b.is_available ? 1 : 1]
  );
  res.redirect('/admin/menu');
});

router.get('/menu/:id/edit', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.redirect('/admin/menu');
  res.render('admin/menu-form', { staff: req.session.staff, item: rows[0], error: null });
});

router.post('/menu/:id/edit', upload.single('photo'), async (req, res) => {
  const b = req.body;
  const days = Array.isArray(b.days) ? b.days.join(',') : (b.days || 'mon,tue,wed,thu,fri,sat,sun');
  const ratingLocked = b.rating_locked ? 1 : 0;
  const fields = [
    b.name_en, b.name_fr, b.category, b.ingredients_en, b.ingredients_fr, b.price,
    b.is_veg ? 1 : 0, b.rating || 4.5, ratingLocked, days, b.is_available ? 1 : 0
  ];
  let sql = `UPDATE menu_items SET name_en=?, name_fr=?, category=?, ingredients_en=?, ingredients_fr=?, price=?,
             is_veg=?, rating=?, rating_manual_override=?, days_available=?, is_available=?`;
  if (req.file) {
    sql += `, photo_url=?`;
    fields.push(`/uploads/menu/${req.file.filename}`);
  }
  sql += ` WHERE id=?`;
  fields.push(req.params.id);
  await db.query(sql, fields);

  // If the Manager just switched this item BACK to automatic, recalculate
  // its rating immediately from real order/favourite history.
  if (!ratingLocked) await recalcItemRating(req.params.id);

  res.redirect('/admin/menu');
});

router.post('/menu/:id/delete', async (req, res) => {
  await db.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
  res.redirect('/admin/menu');
});

router.post('/menu/:id/toggle', async (req, res) => {
  await db.query('UPDATE menu_items SET is_available = NOT is_available WHERE id = ?', [req.params.id]);
  res.redirect('/admin/menu');
});

// ===========================================================
// Offers management (discounts)
// ===========================================================
router.get('/offers', async (req, res) => {
  const [offers] = await db.query('SELECT * FROM offers ORDER BY start_date DESC');
  res.render('admin/offers', { staff: req.session.staff, offers });
});

router.post('/offers/new', async (req, res) => {
  const b = req.body;
  await db.query(
    `INSERT INTO offers (description_en, description_fr, discount_type, discount_value, start_date, end_date, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [b.description_en, b.description_fr, b.discount_type, b.discount_value, b.start_date, b.end_date, b.is_active ? 1 : 0]
  );
  res.redirect('/admin/offers');
});

router.post('/offers/:id/toggle', async (req, res) => {
  await db.query('UPDATE offers SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
  res.redirect('/admin/offers');
});

router.post('/offers/:id/delete', async (req, res) => {
  await db.query('DELETE FROM offers WHERE id = ?', [req.params.id]);
  res.redirect('/admin/offers');
});

// ===========================================================
// Announcements (plain banner, no discount attached)
// ===========================================================
router.get('/announcements', async (req, res) => {
  const [announcements] = await db.query('SELECT * FROM announcements ORDER BY created_at DESC');
  res.render('admin/announcements', { staff: req.session.staff, announcements });
});

router.post('/announcements/new', async (req, res) => {
  const b = req.body;
  await db.query(
    'INSERT INTO announcements (message_en, message_fr, is_active) VALUES (?, ?, ?)',
    [b.message_en, b.message_fr, b.is_active ? 1 : 0]
  );
  res.redirect('/admin/announcements');
});

router.post('/announcements/:id/toggle', async (req, res) => {
  await db.query('UPDATE announcements SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
  res.redirect('/admin/announcements');
});

router.post('/announcements/:id/delete', async (req, res) => {
  await db.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
  res.redirect('/admin/announcements');
});

// ===========================================================
// Tax & charge settings + restaurant address/phone
// ===========================================================
router.get('/settings', async (req, res) => {
  const [[settings]] = await db.query('SELECT * FROM restaurant_settings WHERE id = 1');
  res.render('admin/settings', { staff: req.session.staff, settings, saved: req.query.saved === '1' });
});

router.post('/settings', async (req, res) => {
  const b = req.body;
  await db.query(
    `UPDATE restaurant_settings SET tax_percent=?, service_charge_percent=?, address=?, phone=? WHERE id = 1`,
    [b.tax_percent || 0, b.service_charge_percent || 0, b.address || '', b.phone || '']
  );
  res.redirect('/admin/settings?saved=1');
});

// ===========================================================
// Tables + QR codes — add as many as you like, any time.
// Exactly one of these rows is the counter QR (is_counter = 1).
// ===========================================================
router.get('/tables', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM restaurant_tables ORDER BY is_counter DESC, table_number');
  const counter = rows.find((r) => r.is_counter);
  const tables = rows.filter((r) => !r.is_counter);
  res.render('admin/tables', { staff: req.session.staff, tables, counter, baseUrl: BASE_URL });
});

router.post('/tables/new', async (req, res) => {
  const [[{ maxNum }]] = await db.query('SELECT COALESCE(MAX(table_number),0) AS maxNum FROM restaurant_tables WHERE is_counter = 0');
  const nextNumber = maxNum + 1;
  const code = generateTableCode(nextNumber);
  await db.query('INSERT INTO restaurant_tables (table_number, table_code, is_counter) VALUES (?, ?, 0)', [nextNumber, code]);

  const qrPath = path.join(__dirname, '..', '..', 'public', 'uploads', 'qr', `${code}.png`);
  await QRCode.toFile(qrPath, `${BASE_URL}/t/${code}`, { width: 500, margin: 2 });

  res.redirect('/admin/tables');
});

// Create the one counter QR, if it doesn't exist yet (older installs
// migrated from the v1 schema before the counter concept existed).
router.post('/tables/counter/new', async (req, res) => {
  const [existing] = await db.query('SELECT id FROM restaurant_tables WHERE is_counter = 1');
  if (!existing.length) {
    const code = 'COUNTER1';
    await db.query('INSERT INTO restaurant_tables (table_number, table_code, is_counter) VALUES (NULL, ?, 1)', [code]);
    const qrPath = path.join(__dirname, '..', '..', 'public', 'uploads', 'qr', `${code}.png`);
    await QRCode.toFile(qrPath, `${BASE_URL}/c/${code}`, { width: 500, margin: 2 });
  }
  res.redirect('/admin/tables');
});

router.post('/tables/:id/toggle', async (req, res) => {
  await db.query('UPDATE restaurant_tables SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
  res.redirect('/admin/tables');
});

// Regenerate the QR image on demand (e.g. if the PNG file was lost)
router.get('/tables/:code/qr.png', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM restaurant_tables WHERE table_code = ?', [req.params.code]);
  if (!rows.length) return res.status(404).send('Not found');
  const table = rows[0];
  const qrPath = path.join(__dirname, '..', '..', 'public', 'uploads', 'qr', `${req.params.code}.png`);
  if (!fs.existsSync(qrPath)) {
    const link = table.is_counter ? `${BASE_URL}/c/${req.params.code}` : `${BASE_URL}/t/${req.params.code}`;
    await QRCode.toFile(qrPath, link, { width: 500, margin: 2 });
  }
  res.sendFile(qrPath);
});

// ===========================================================
// Orders & payment history
// ===========================================================
router.get('/orders', async (req, res) => {
  const [orders] = await db.query(
    `SELECT o.*, c.name AS customer_name, c.mobile_number, rt.table_number, rt.is_counter,
            p.payment_method, p.payment_status
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     JOIN restaurant_tables rt ON rt.id = o.table_id
     LEFT JOIN payments p ON p.order_id = o.id
     ORDER BY o.created_at DESC LIMIT 200`
  );
  res.render('admin/orders', { staff: req.session.staff, orders });
});

// ===========================================================
// Customers
// ===========================================================
router.get('/customers', async (req, res) => {
  const [customers] = await db.query(
    `SELECT c.*, COUNT(o.id) AS order_count, COALESCE(SUM(o.total_amount),0) AS total_spent
     FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
     GROUP BY c.id ORDER BY c.created_at DESC`
  );
  res.render('admin/customers', { staff: req.session.staff, customers });
});

// ===========================================================
// Ratings & feedback
// "Which food did you like most" leaderboard + free-text comments,
// filterable by day. (No 1-5 star average any more — see the v2 spec.)
// ===========================================================
router.get('/ratings', async (req, res) => {
  const { day } = req.query;

  let leaderboardSql = `
    SELECT mi.id, mi.name_en, mi.name_fr, COUNT(*) AS loves
    FROM item_favorites f
    JOIN menu_items mi ON mi.id = f.menu_item_id
    JOIN orders o ON o.id = f.order_id
    WHERE 1=1`;
  const leaderboardParams = [];
  if (day) { leaderboardSql += ' AND DATE(o.created_at) = ?'; leaderboardParams.push(day); }
  leaderboardSql += ' GROUP BY mi.id ORDER BY loves DESC LIMIT 10';
  const [leaderboard] = await db.query(leaderboardSql, leaderboardParams);

  let commentsSql = `
    SELECT r.*, o.order_code, rt.table_number, rt.is_counter
    FROM ratings r
    JOIN orders o ON o.id = r.order_id
    JOIN restaurant_tables rt ON rt.id = o.table_id
    WHERE r.comments IS NOT NULL AND r.comments <> ''`;
  const commentsParams = [];
  if (day) { commentsSql += ' AND DATE(r.created_at) = ?'; commentsParams.push(day); }
  commentsSql += ' ORDER BY r.created_at DESC LIMIT 100';
  const [comments] = await db.query(commentsSql, commentsParams);

  res.render('admin/ratings', { staff: req.session.staff, leaderboard, comments, day: day || '' });
});

// ===========================================================
// Reports & Dashboard (current month, computed on demand)
// ===========================================================
router.get('/reports', async (req, res) => {
  const [topItems] = await db.query(
    `SELECT mi.name_en, mi.name_fr, SUM(oi.quantity) AS qty
     FROM order_items oi JOIN menu_items mi ON mi.id = oi.menu_item_id
     JOIN orders o ON o.id = oi.order_id
     WHERE YEAR(o.created_at) = YEAR(CURDATE()) AND MONTH(o.created_at) = MONTH(CURDATE())
     GROUP BY oi.menu_item_id ORDER BY qty DESC LIMIT 10`
  );

  const [paymentBreakdown] = await db.query(
    `SELECT payment_mode_label, COUNT(*) AS c
     FROM orders
     WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
     GROUP BY payment_mode_label`
  );

  const [avgPrepTime] = await db.query(
    `SELECT mi.name_en, mi.name_fr, ROUND(AVG(TIMESTAMPDIFF(MINUTE, o.created_at, o.ready_at)), 1) AS avg_minutes
     FROM order_items oi
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.ready_at IS NOT NULL
       AND YEAR(o.created_at) = YEAR(CURDATE()) AND MONTH(o.created_at) = MONTH(CURDATE())
     GROUP BY oi.menu_item_id ORDER BY avg_minutes DESC`
  );

  res.render('admin/reports', { staff: req.session.staff, topItems, paymentBreakdown, avgPrepTime });
});

// ===========================================================
// Staff accounts
// ===========================================================
router.get('/staff', async (req, res) => {
  const [staffList] = await db.query('SELECT id, name, role, username, is_active, created_at FROM staff ORDER BY role, name');
  res.render('admin/staff', { staff: req.session.staff, staffList, error: null });
});

router.post('/staff/new', async (req, res) => {
  const { name, role, username, password, pin } = req.body;
  try {
    if (role === 'admin') {
      const hash = await bcrypt.hash(password, 10);
      await db.query(`INSERT INTO staff (name, role, username, password_hash) VALUES (?, 'admin', ?, ?)`, [name, username, hash]);
    } else {
      const hash = await bcrypt.hash(pin, 10);
      await db.query(`INSERT INTO staff (name, role, pin_hash) VALUES (?, 'chef', ?)`, [name, hash]);
    }
    res.redirect('/admin/staff');
  } catch (err) {
    const [staffList] = await db.query('SELECT id, name, role, username, is_active, created_at FROM staff ORDER BY role, name');
    res.render('admin/staff', { staff: req.session.staff, staffList, error: 'That username is already taken.' });
  }
});

router.post('/staff/:id/toggle', async (req, res) => {
  await db.query('UPDATE staff SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
  res.redirect('/admin/staff');
});

router.post('/staff/:id/delete', async (req, res) => {
  await db.query('DELETE FROM staff WHERE id = ?', [req.params.id]);
  res.redirect('/admin/staff');
});

module.exports = router;
