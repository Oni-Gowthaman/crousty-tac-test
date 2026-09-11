const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireChef } = require('../middleware/auth');
const { allFor } = require('../utils/i18n');

router.get('/login', async (req, res) => {
  if (req.session.staff && req.session.staff.role === 'chef') return res.redirect('/chef/dashboard');
  const [chefs] = await db.query('SELECT id, name FROM staff WHERE role = "chef" AND is_active = 1 ORDER BY name');
  res.render('chef/login', { error: null, chefs });
});

router.post('/login', async (req, res) => {
  const { staffId, pin } = req.body;
  const [rows] = await db.query('SELECT * FROM staff WHERE id = ? AND role = "chef" AND is_active = 1', [staffId]);
  if (!rows.length) {
    const [chefs] = await db.query('SELECT id, name FROM staff WHERE role = "chef" AND is_active = 1 ORDER BY name');
    return res.render('chef/login', { error: 'Unknown staff member.', chefs });
  }

  const match = await bcrypt.compare(pin || '', rows[0].pin_hash || '');
  if (!match) {
    const [chefs] = await db.query('SELECT id, name FROM staff WHERE role = "chef" AND is_active = 1 ORDER BY name');
    return res.render('chef/login', { error: 'Incorrect PIN.', chefs });
  }

  req.session.staff = { id: rows[0].id, name: rows[0].name, role: 'chef' };
  res.redirect('/chef/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/chef/login'));
});

router.get('/dashboard', requireChef, async (req, res) => {
  const lang = req.cookies.chefLang === 'en' ? 'en' : 'fr';
  const [menuItems] = await db.query('SELECT id, name_en, name_fr, category, is_available FROM menu_items ORDER BY category, sort_order');
  res.render('chef/dashboard', {
    staff: req.session.staff,
    lang,
    t: allFor(lang),
    menuItems
  });
});

router.get('/lang/:lang', requireChef, (req, res) => {
  res.cookie('chefLang', req.params.lang === 'en' ? 'en' : 'fr', { maxAge: 1000 * 60 * 60 * 24 * 30 });
  res.redirect('/chef/dashboard');
});

module.exports = router;
