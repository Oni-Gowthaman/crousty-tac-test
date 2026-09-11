# Crousty Tac — Scan · Order · Enjoy (v2)

A full mobile ordering app for **Crousty Tac** (Maromme, France): customers
scan a table QR code (or the counter QR) and order from their phone; the
chef sees orders live on a kitchen screen; the admin manages the menu,
offers, tax settings, and staff — all from a browser, on your own computer.

Built with **Node.js + Express + MySQL + Socket.IO + EJS** (no separate
frontend build step — it's a normal website, styled to match the
approved orange & white design).

> **Important note on "iOS and Android":** this is a **mobile web app** —
> it opens in the phone's browser after a QR scan and works identically
> on iPhone and Android, with no install needed. It is **not** a native
> App Store / Play Store app. Building true native apps (Swift/Kotlin or
> React Native, submitted to both stores) is a materially different,
> much larger project. If native apps are a hard requirement, flag it
> early — this codebase can serve as the backend API either way.

---

## What's new in v2 (vs. the first build)

Matches the updated requirements document. Everything below is real,
working code — not a mockup:

- **Counter QR** in addition to the 5 table QRs — takeaway customers (or
  anyone when all tables are full) scan it and pick Dine in/Takeaway
  themselves; table QRs still auto-fill the table number.
- **Front page redesigned**: logo, name, slogan, language switch in the
  top corner (**French is the default**), Dine in/Takeaway choice, Order
  Now button, address & phone — shown every visit, not just once.
- **Veg / Non-veg tag** and a **star rating** on every dish, visible to
  customers. The rating auto-updates from real feedback (see below) —
  the Manager can also lock it to a manual value any time.
- **Dips & sauces** as quick tick-boxes right in the cart (in addition to
  browsing them as a normal menu category).
- **Cooking instructions** field at checkout (allergies, "less spicy", etc).
- **Tax & service charge**: the Manager sets percentages once in Admin →
  Tax & Charges; every order's price breakdown calculates them
  automatically from then on.
- **Payment is a label only, three options: Cash / Card / Pay via QR** —
  nothing is charged in-app; the customer pays in person at the counter.
  ("Pay via QR" replaces naming Apple Pay/Google Pay specifically, since
  the customer might use any UPI/QR-based app.)
- **Order confirmation message** after placing an order, before the
  status screen, and the customer-facing status is simplified to two
  stages — **Preparing → Ready** — exactly as specified.
- **Rating & feedback reworked**: "Which food did you like the most?"
  (multi-select from the customer's own order) + an optional comment —
  replaces the old 1–5 star food/service prompt.
- **Kitchen screen** now also shows the total price, payment mode,
  dine-in/takeaway badge, and any cooking instructions — everything
  kitchen staff are allowed to see (still no prices-per-item, no mobile
  number, no reports).
- **Announcements** (plain banner text, no discount) as a separate tool
  from **Offers** (discounts) — both Manager-controlled, both shown
  automatically.
- **Reports page** (Admin → Reports): top-selling items, payment-mode
  split, and average time-to-ready per item, computed live for the
  current month. *(A once-a-month auto-generated/emailed report would
  need a scheduler process — out of scope for this round since that
  edges into hosting/infra; the on-demand version gives the same
  numbers on request.)*
- **Admin language toggle** (EN/FR) — sidebar nav and page titles switch;
  the data you enter (menu names, offers, etc.) stays in whichever
  language you typed it in, since you already enter both EN and FR for
  those.
- **New app-state pages**: a loading spinner, an offline banner, and
  branded "something went wrong" screens (both a server-side 404/500
  page and a client-side retry banner for failed requests) — see below.
- Full **orange & white redesign** (Poppins + Work Sans) applied to the
  customer app, the kitchen screen, and the admin panel, based on the
  reference design you approved.

### Deliberately not touched this round (as requested)
Payment gateway integration, SMS provider integration, and hosting/
deployment are all still clean placeholders — see
`server/utils/payment.js` and `server/utils/sms.js`. Nothing new was
added in those areas this round; only features/functions changed.

---

## 1. What you need installed first

- **Node.js** 18 or newer — check with `node -v`
- **MySQL** 8 (or MariaDB) running locally — check with `mysql --version`

---

## 2. One-time setup

### Brand-new install
```bash
npm install
cp .env.example .env        # then edit .env with your MySQL password
mysql -u root -p < database/schema.sql
or
Get-Content database/schema.sql | mysql -u root -p
mysql -u root -p < database/seed.sql
or
Get-Content database/seed.sql | mysql -u root -p
npm run seed:staff           # creates your first Admin login + Chef PIN
```

### Already had the OLD (v1) database set up?
**Don't** re-run `schema.sql` — it would try to recreate tables that
already exist. Instead:
```bash
mysql -u root -p crousty_tac < database/migration.sql
or
Get-Content database/migration.sql | mysql -u root -p
```
This adds every new column/table (counter QR, tax settings, veg/rating,
cooking instructions, announcements, favorites) without touching your
existing menu items, orders, or staff accounts.

Either way, your first login details:
- **Admin** → username `admin`, password `crousty2026`
- **Chef** → PIN `1234` (staff name: "Kitchen")

---

## 3. Run it

```bash
npm start
```

| Who | URL |
|---|---|
| **Admin panel** | http://localhost:3000/admin/login |
| **Kitchen / Chef screen** | http://localhost:3000/chef/login |
| **A customer's table** | Admin → Tables & QR Codes → open any QR link, e.g. `http://localhost:3000/t/T1A2B9` |
| **Counter QR (takeaway)** | Admin → Tables & QR Codes → Counter QR section, e.g. `http://localhost:3000/c/COUNTER1` |

On your phone (same wifi), swap `localhost` for your computer's local IP.

---

## 4. New app-state pages, explained

- **Loading**: `public/js/ui-states.js` shows a small spinner overlay
  automatically during any AJAX request made via `CroustyUI.fetch(...)`
  (used for placing orders, submitting feedback, kitchen actions).
- **No internet**: the same script listens for the browser's
  online/offline events and shows a persistent "you're offline" banner
  with a Retry button — on every customer page and the kitchen screen.
- **Something went wrong**: two layers —
  1. Client-side: any failed API call (not just offline — a real error)
     shows a dismissible banner with a Retry button that re-runs the
     same request.
  2. Server-side: an actual crash or a broken link now renders a
     branded page (`views/errors/500.ejs` / `404.ejs`) instead of a
     plain-text error — friendlier if something truly goes wrong.

---

## 5. Project structure (what changed)

```
crousty-tac/
├── database/
│   ├── schema.sql        ← fresh installs only
│   ├── migration.sql      ← NEW — upgrades an existing v1 database
│   └── seed.sql
├── server/
│   ├── routes/customer.js  ← counter QR, dine-in/takeaway, tax calc
│   ├── routes/api.js         ← orders + favorites-based ratings
│   ├── routes/admin.js        ← + settings, announcements, reports
│   ├── utils/i18n.js           ← expanded EN/FR dictionary
│   ├── utils/adminI18n.js       ← NEW — admin chrome translations
│   └── utils/ratingRecalc.js     ← NEW — auto item-rating calculation
├── views/
│   ├── errors/404.ejs, 500.ejs  ← NEW — branded error pages
│   └── admin/settings.ejs, announcements.ejs, reports.ejs  ← NEW
└── public/
    ├── css/*.css            ← re-themed: orange & white, Poppins
    └── js/ui-states.js        ← NEW — loading/offline/error helper
```

---

## 6. Common issues

- **"Unknown column..." errors after upgrading** — you skipped
  `migration.sql`; run it (see Section 2 above).
- **Counter QR missing on an upgraded install** — Admin → Tables & QR
  Codes has a "+ Create counter QR" button if none exists yet.
- **"Access denied for user"** — check `DB_USER` / `DB_PASSWORD` in `.env`.
- **Port 3000 already in use** — change `PORT` in `.env`.
