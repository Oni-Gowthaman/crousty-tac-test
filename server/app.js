require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');

const socketWrapper = require('./socket');

const customerRoutes = require('./routes/customer');
const chefRoutes = require('./routes/chef');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
socketWrapper.init(io);

// --- View engine ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// --- Core middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'crousty-tac-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12 } // 12 hours
  })
);

// --- Socket.IO: rooms ---
// order_<code>   -> that one customer's live status screen
// kitchen        -> the chef dashboard (new orders, status changes)
// menu_watchers  -> every customer currently browsing the menu (sold-out updates)
io.on('connection', (socket) => {
  socket.on('join_order', (orderCode) => socket.join(`order_${orderCode}`));
  socket.on('join_kitchen', () => socket.join('kitchen'));
  socket.on('join_menu_watchers', () => socket.join('menu_watchers'));
});

// --- Routes ---
app.use('/api', apiRoutes);
app.use('/chef', chefRoutes);
app.use('/admin', adminRoutes);
app.use('/', customerRoutes); // customer routes last: they include a catch on /t/:tableCode

// Plain landing page for local testing — real customers always arrive via
// a table's QR code (see Admin > Tables & QR Codes), never through here.
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; max-width: 480px; margin: 60px auto; text-align:center; color:#221B15;">
      <h1 style="color:#FF7A29;">🌮 Crousty Tac</h1>
      <p>This is the server root — customers reach the menu by scanning a table's QR code (or the counter QR).</p>
      <p><a href="/admin/login" style="color:#E85D04; font-weight:700;">Admin Panel</a> &nbsp;·&nbsp; <a href="/chef/login" style="color:#E85D04; font-weight:700;">Kitchen Screen</a></p>
      <p style="color:#9a8f80; font-size:13px;">Go to Admin &rarr; Tables &amp; QR Codes to open a table's (or the counter's) ordering page directly.</p>
    </div>
  `);
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).render('errors/404');
});

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('errors/500');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Crousty Tac server running at http://localhost:${PORT}`);
});
