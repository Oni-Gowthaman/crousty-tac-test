-- =========================================================
-- CROUSTY TAC — Migration: v1 schema -> v2 schema
--
-- Run this ONLY if you already ran the old schema.sql and
-- have real data you want to keep. It adds the new columns
-- and tables without deleting anything.
--
-- If this is a brand-new setup, ignore this file — just run
-- database/schema.sql followed by database/seed.sql.
--
-- Usage:  mysql -u root -p crousty_tac < database/migration.sql
-- =========================================================

USE crousty_tac;

-- ---- restaurant_tables: allow a NULL table_number for the counter QR ----
ALTER TABLE restaurant_tables
  MODIFY COLUMN table_number INT NULL,
  ADD COLUMN is_counter TINYINT(1) NOT NULL DEFAULT 0 AFTER table_code;

-- ---- menu_items: veg/non-veg tag + rating ----
ALTER TABLE menu_items
  ADD COLUMN is_veg TINYINT(1) NOT NULL DEFAULT 0 AFTER photo_url,
  ADD COLUMN rating DECIMAL(2,1) NOT NULL DEFAULT 4.5 AFTER is_veg,
  ADD COLUMN rating_manual_override TINYINT(1) NOT NULL DEFAULT 0 AFTER rating;

-- ---- orders: dining option, cooking instructions, payment label,
--      tax/charge breakdown, ready timestamp ----
ALTER TABLE orders
  ADD COLUMN dining_option ENUM('dine_in','takeaway') NOT NULL DEFAULT 'dine_in' AFTER customer_id,
  ADD COLUMN special_instructions VARCHAR(500) NULL AFTER estimated_minutes,
  ADD COLUMN payment_mode_label ENUM('cash','card','qr') NOT NULL DEFAULT 'cash' AFTER special_instructions,
  ADD COLUMN tax_amount DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER discount_amount,
  ADD COLUMN charge_amount DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER tax_amount,
  ADD COLUMN ready_at DATETIME NULL AFTER ready_notified;

-- ---- payments: "digital_wallet" becomes "qr" (label only) ----
ALTER TABLE payments
  MODIFY COLUMN payment_method ENUM('cash','card','qr') NOT NULL;

-- ---- ratings: drop the old 1-5 star columns (replaced by the
--      "which food did you like most" multi-select) ----
ALTER TABLE ratings
  DROP COLUMN food_rating,
  DROP COLUMN service_rating;

-- ---- new table: which items were picked as favourites ----
CREATE TABLE IF NOT EXISTS item_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rating_id INT NOT NULL,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rating_id) REFERENCES ratings(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
) ENGINE=InnoDB;

-- ---- new table: announcements (plain banner, no discount) ----
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_en VARCHAR(255) NOT NULL,
  message_fr VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---- new table: restaurant-wide tax/charge settings (single row) ----
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id INT PRIMARY KEY DEFAULT 1,
  tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  service_charge_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  address VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT IGNORE INTO restaurant_settings (id, tax_percent, service_charge_percent, address, phone)
VALUES (1, 0, 0, '203 Rue des Martyrs de la Résistance, 76150 Maromme', '02 35 75 51 82');

CREATE INDEX idx_favorites_item ON item_favorites(menu_item_id);

-- ---- add the one counter QR row if it doesn't exist yet ----
INSERT INTO restaurant_tables (table_number, table_code, is_counter)
SELECT NULL, 'COUNTER1', 1
WHERE NOT EXISTS (SELECT 1 FROM restaurant_tables WHERE is_counter = 1);

SELECT 'Migration complete.' AS status;
