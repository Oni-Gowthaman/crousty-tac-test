const db = require('../db');
const { computeItemRating } = require('./helpers');

// Recalculates and saves menu_items.rating for one item, based on how
// many orders included it vs. how many times it was picked as a
// favourite in feedback. Skipped if the Manager has manually overridden
// the rating (rating_manual_override = 1) — their number always wins
// until they choose to reset it back to automatic from the admin panel.
async function recalcItemRating(menuItemId) {
  const [[item]] = await db.query('SELECT rating_manual_override FROM menu_items WHERE id = ?', [menuItemId]);
  if (!item || item.rating_manual_override) return;

  const [[{ timesOrdered }]] = await db.query(
    `SELECT COUNT(DISTINCT order_id) AS timesOrdered FROM order_items WHERE menu_item_id = ?`,
    [menuItemId]
  );
  const [[{ timesFavorited }]] = await db.query(
    `SELECT COUNT(DISTINCT order_id) AS timesFavorited FROM item_favorites WHERE menu_item_id = ?`,
    [menuItemId]
  );

  const newRating = computeItemRating(timesOrdered, timesFavorited);
  await db.query('UPDATE menu_items SET rating = ? WHERE id = ?', [newRating, menuItemId]);
}

// Recalculates every distinct item that appeared in a given order —
// called once after a rating/feedback submission, since that submission
// can change the denominator (times-ordered) for items even if they
// weren't picked as favourites this time.
async function recalcRatingsForOrder(orderId) {
  const [rows] = await db.query('SELECT DISTINCT menu_item_id FROM order_items WHERE order_id = ?', [orderId]);
  for (const row of rows) {
    await recalcItemRating(row.menu_item_id);
  }
}

module.exports = { recalcItemRating, recalcRatingsForOrder };
