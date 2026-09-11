-- =========================================================
-- CROUSTY TAC — Starter data (v2)
-- Run this AFTER schema.sql. Safe to edit freely — everything
-- here can also be managed later from the Admin Panel.
-- =========================================================

USE crousty_tac;

-- ---------------------------------------------------------
-- 5 tables + the 1 counter QR. Admin can add more tables any
-- time — each new one automatically gets its own QR code, no
-- code changes. There is always exactly one counter QR.
-- ---------------------------------------------------------
INSERT INTO restaurant_tables (table_number, table_code, is_counter) VALUES
  (1, 'T1A2B9', 0),
  (2, 'T2C7D4', 0),
  (3, 'T3E1F6', 0),
  (4, 'T4G5H8', 0),
  (5, 'T5J3K0', 0),
  (NULL, 'COUNTER1', 1);

-- ---------------------------------------------------------
-- Menu items (categories: taco, wrap, sandwich, dip, drink)
-- is_veg: 1 = veg, 0 = non-veg. rating: starting value the
-- Manager can override any time — it also updates itself
-- automatically as customers mark items "liked most".
-- ---------------------------------------------------------
INSERT INTO menu_items (name_en, name_fr, category, ingredients_en, ingredients_fr, price, photo_url, is_veg, rating, sort_order) VALUES
('Kebab Taco', 'Tacos Kebab', 'taco', 'Shaved kebab meat, fries, cheese sauce, house bread', 'Émincé de kebab, frites, sauce fromagère, pain maison', 7.00, '/uploads/menu/taco.svg', 0, 4.6, 1),
('Kefta Taco', 'Tacos Kefta', 'taco', 'Homemade beef kefta, fries, cheese sauce', 'Viande hachée maison (kefta), frites, sauce fromagère', 7.00, '/uploads/menu/taco.svg', 0, 4.4, 2),
('Chicken Curry Taco', 'Tacos Poulet Curry', 'taco', 'Curry chicken, fries, cheese sauce, peppers', 'Émincé de poulet au curry, frites, sauce fromagère, poivrons', 7.50, '/uploads/menu/taco.svg', 0, 4.7, 3),
('Cordon Bleu Taco', 'Tacos Cordon Bleu', 'taco', 'Cordon bleu, fries, cheese sauce', 'Cordon bleu, frites, sauce fromagère', 7.50, '/uploads/menu/taco.svg', 0, 4.3, 4),
('Mixte Taco', 'Tacos Mixte', 'taco', 'Kebab, chicken curry, fries, cheese sauce', 'Émincé de kebab, poulet au curry, frites, sauce fromagère', 8.00, '/uploads/menu/taco.svg', 0, 4.8, 5),

('Mix Wrap', 'Wrap Mix', 'wrap', 'Tenders, steak, cheese, lettuce, tomato', 'Tenders, steak, fromage, salade, tomate', 8.50, '/uploads/menu/wrap.svg', 0, 4.5, 1),
('Crispy Wrap', 'Wrap Crispy', 'wrap', 'Breaded chicken, steak, cheese', '2 steaks hachés, poulet pané, fromage', 8.90, '/uploads/menu/wrap.svg', 0, 4.4, 2),
('Tornado Wrap', 'Wrap Tornado', 'wrap', 'Steak, potato rösti, cheese', '2 steaks hachés, galette de pomme de terre, fromage', 8.50, '/uploads/menu/wrap.svg', 0, 4.2, 3),

('Kebab Sandwich', 'Sandwich Kebab', 'sandwich', 'Shaved kebab meat, salad, sauce, bread of choice', 'Émincé de kebab, salade, sauce, pain au choix', 7.00, '/uploads/menu/sandwich.svg', 0, 4.5, 1),
('American Sandwich', 'Sandwich Américain', 'sandwich', 'Two 45g steaks, cheese, salad', '2 steaks 45g, fromage, salade', 6.50, '/uploads/menu/sandwich.svg', 0, 4.3, 2),
('Cordon Bleu Sandwich', 'Sandwich Cordon Bleu', 'sandwich', 'Cordon bleu, cheese, salad', 'Cordon bleu, fromage, salade', 6.50, '/uploads/menu/sandwich.svg', 0, 4.2, 3),
('Merguez Sandwich', 'Sandwich Merguez', 'sandwich', 'Two merguez sausages, salad, sauce', '2 merguez, salade, sauce', 6.50, '/uploads/menu/sandwich.svg', 0, 4.6, 4),
('Veggie Sandwich', 'Sandwich Végétarien', 'sandwich', 'Potato rösti, egg, cheese', 'Galette de pomme de terre, oeuf, fromage', 6.50, '/uploads/menu/sandwich.svg', 1, 4.1, 5),

('Algerian Sauce', 'Sauce Algérienne', 'dip', 'Mild spiced tomato sauce', 'Sauce tomate légèrement épicée', 1.00, '/uploads/menu/dip.svg', 1, 4.4, 1),
('White Sauce', 'Sauce Blanche', 'dip', 'Creamy house sauce', 'Sauce blanche maison', 1.00, '/uploads/menu/dip.svg', 1, 4.5, 2),
('Andalouse Sauce', 'Sauce Andalouse', 'dip', 'Smoky tomato & pepper sauce', 'Sauce tomate fumée et poivrons', 1.00, '/uploads/menu/dip.svg', 1, 4.3, 3),
('Cheese Sauce', 'Sauce Fromagère', 'dip', 'Melted cheese sauce', 'Sauce au fromage fondu', 1.00, '/uploads/menu/dip.svg', 1, 4.6, 4),

('Coca-Cola 33cl', 'Coca-Cola 33cl', 'drink', 'Classic Coca-Cola can', 'Canette Coca-Cola classique', 2.00, '/uploads/menu/drink.svg', 1, 4.5, 1),
('Coca-Cola Zero 33cl', 'Coca-Cola Zero 33cl', 'drink', 'Sugar-free Coca-Cola can', 'Canette Coca-Cola sans sucre', 2.00, '/uploads/menu/drink.svg', 1, 4.4, 2),
('Iced Tea 33cl', 'Ice Tea 33cl', 'drink', 'Peach iced tea can', 'Canette de thé glacé pêche', 2.00, '/uploads/menu/drink.svg', 1, 4.3, 3),
('Bottled Water 50cl', 'Eau Minérale 50cl', 'drink', 'Still mineral water', 'Eau plate en bouteille', 1.50, '/uploads/menu/drink.svg', 1, 4.2, 4);

-- ---------------------------------------------------------
-- A starter launch offer — shown & applied automatically
-- ---------------------------------------------------------
INSERT INTO offers (description_en, description_fr, discount_type, discount_value, start_date, end_date, is_active) VALUES
('10% off your order — app launch week!', '10% de réduction — semaine de lancement de l''appli !', 'percentage', 10.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 1);

-- ---------------------------------------------------------
-- A starter announcement (plain banner, no discount attached)
-- ---------------------------------------------------------
INSERT INTO announcements (message_en, message_fr, is_active) VALUES
('Now open for dine-in and takeaway — order from your table or the counter!', 'Ouvert sur place et à emporter — commandez depuis votre table ou le comptoir !', 1);
