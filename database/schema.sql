-- =========================================================
-- CROUSTY TAC — Database Schema (MySQL) — v2
-- Matches "Crousty Tac App Requirements 2" (counter QR,
-- dine-in/takeaway, tax & charges, veg/non-veg + ratings,
-- cooking instructions, favorite-item feedback, announcements,
-- reports). Run this once to create the database structure.
--
-- If you already ran the OLDER schema.sql and have real data
-- in it, do NOT re-run this file — run database/migration.sql
-- instead, which only adds what's new without wiping anything.
-- =========================================================

CREATE DATABASE IF NOT EXISTS crousty_tac
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE crousty_tac;

-- ---------------------------------------------------------
-- Staff accounts (Admin + Chef)
-- ---------------------------------------------------------
CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin','chef') NOT NULL,
  username VARCHAR(100) UNIQUE,          -- used by admin accounts
  password_hash VARCHAR(255),            -- used by admin accounts
  pin_hash VARCHAR(255),                 -- used by chef accounts (4-digit PIN)
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Restaurant tables + the ONE counter QR.
-- 5 table rows (is_counter = 0, table_number = 1..5) plus
-- exactly one counter row (is_counter = 1, table_number = NULL).
-- New tables can be added any time from the Admin Panel —
-- no code changes needed.
-- ---------------------------------------------------------
CREATE TABLE restaurant_tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_number INT NULL,                    -- NULL for the counter QR
  table_code VARCHAR(20) NOT NULL UNIQUE,   -- random code used in the QR link
  is_counter TINYINT(1) NOT NULL DEFAULT 0, -- 1 = counter QR (no fixed table)
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_table_number (table_number)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Menu items
-- rating: cached 1.0–5.0 score. Auto-recalculated whenever a
-- customer marks the item as a favourite in their feedback,
-- UNLESS rating_manual_override = 1 (Manager set it by hand).
-- ---------------------------------------------------------
CREATE TABLE menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name_en VARCHAR(150) NOT NULL,
  name_fr VARCHAR(150) NOT NULL,
  category ENUM('taco','wrap','sandwich','dip','drink') NOT NULL,
  ingredients_en TEXT,
  ingredients_fr TEXT,
  price DECIMAL(6,2) NOT NULL,
  photo_url VARCHAR(255),
  is_veg TINYINT(1) NOT NULL DEFAULT 0,
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  rating_manual_override TINYINT(1) NOT NULL DEFAULT 0,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  days_available VARCHAR(60) NOT NULL DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Offers (discounts — shown + applied automatically)
-- ---------------------------------------------------------
CREATE TABLE offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  description_en VARCHAR(255) NOT NULL,
  description_fr VARCHAR(255) NOT NULL,
  discount_type ENUM('percentage','fixed') NOT NULL,
  discount_value DECIMAL(6,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Announcements — plain text banner, NO discount attached.
-- Separate from `offers` because not every announcement is
-- a discount (e.g. "Closed on Monday for a private event").
-- ---------------------------------------------------------
CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_en VARCHAR(255) NOT NULL,
  message_fr VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Restaurant-wide settings — single row (id = 1).
-- Tax / service charge percentages the Manager controls;
-- applied automatically to every order's price breakdown.
-- ---------------------------------------------------------
CREATE TABLE restaurant_settings (
  id INT PRIMARY KEY DEFAULT 1,
  tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  service_charge_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  address VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Customers (one-time guest orders — no login/account)
-- ---------------------------------------------------------
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_mobile (mobile_number)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Orders
-- status: kitchen-side workflow (new -> preparing -> ready ->
--   collected). The CUSTOMER only ever sees two stages —
--   "Preparing" (covers both new & preparing) then "Ready" —
--   per the requirement that no manual customer-side update
--   happens in between.
-- ready_at: timestamp the kitchen marked it ready — used for
--   the "average prep time per item" report.
-- ---------------------------------------------------------
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(20) NOT NULL UNIQUE,     -- short code shown to the customer
  table_id INT NOT NULL,
  customer_id INT NOT NULL,
  dining_option ENUM('dine_in','takeaway') NOT NULL DEFAULT 'dine_in',
  status ENUM('new','preparing','ready','collected','cancelled') NOT NULL DEFAULT 'new',
  estimated_minutes INT NULL,
  special_instructions VARCHAR(500) NULL,
  payment_mode_label ENUM('cash','card','qr') NOT NULL DEFAULT 'cash', -- LABEL ONLY — paid in person at the counter
  subtotal DECIMAL(8,2) NOT NULL,
  discount_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
  charge_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(8,2) NOT NULL,
  offer_id INT NULL,
  language ENUM('en','fr') NOT NULL DEFAULT 'fr',
  ready_notified TINYINT(1) NOT NULL DEFAULT 0,
  ready_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Order line items
-- ---------------------------------------------------------
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(6,2) NOT NULL,
  notes VARCHAR(255),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Payments — record only. Nothing is actually charged by the
-- app; the customer pays in person using the mode they picked.
-- ---------------------------------------------------------
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  amount DECIMAL(8,2) NOT NULL,
  payment_method ENUM('cash','card','qr') NOT NULL,
  payment_status ENUM('pending','successful','failed','refunded') NOT NULL DEFAULT 'pending',
  transaction_reference VARCHAR(100),
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Ratings & feedback
-- Per the spec, the customer is asked "which food did you
-- like the most?" (multi-select from their own order) plus an
-- optional free-text comment. There is no 1-5 star prompt.
-- ---------------------------------------------------------
CREATE TABLE ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Which items were picked as "liked most" in a given rating —
-- this is what menu_items.rating is calculated from.
CREATE TABLE item_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rating_id INT NOT NULL,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rating_id) REFERENCES ratings(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
) ENGINE=InnoDB;

-- Helpful indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_menu_category ON menu_items(category);
CREATE INDEX idx_favorites_item ON item_favorites(menu_item_id);

-- Seed the single settings row so the app always has one to read.
INSERT INTO restaurant_settings (id, tax_percent, service_charge_percent, address, phone) VALUES
  (1, 0, 0, '203 Rue des Martyrs de la Résistance, 76150 Maromme', '02 35 75 51 82');
