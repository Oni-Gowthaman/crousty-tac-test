// Small shared helpers used across routes.

// Short, human-friendly order code, e.g. "CT-4F82"
function generateOrderCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `CT-${code}`;
}

// Random code used inside each table's QR link, e.g. "T7X9QK"
function generateTableCode(tableNumber) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `T${tableNumber}${code}`;
}

function formatEuro(amount) {
  return `€${Number(amount).toFixed(2)}`;
}

// Works out whether an offer is currently active (dates + flag)
function isOfferLive(offer) {
  if (!offer || !offer.is_active) return false;
  const today = new Date().toISOString().slice(0, 10);
  return offer.start_date <= today && offer.end_date >= today;
}

function applyDiscount(subtotal, offer) {
  if (!isOfferLive(offer)) return { discount: 0, total: subtotal };
  let discount = 0;
  if (offer.discount_type === 'percentage') {
    discount = (subtotal * Number(offer.discount_value)) / 100;
  } else {
    discount = Number(offer.discount_value);
  }
  discount = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal - discount);
  return { discount: Number(discount.toFixed(2)), total: Number(total.toFixed(2)) };
}

// Full price breakdown used on both the checkout preview and the order
// API, so the number the customer sees matches exactly what gets saved.
// Order of operations: subtotal -> discount off subtotal -> tax + service
// charge calculated on the DISCOUNTED amount -> final total.
function calcOrderTotals(subtotal, offer, settings) {
  const { discount, total: afterDiscount } = applyDiscount(subtotal, offer);
  const taxPercent = settings ? Number(settings.tax_percent) : 0;
  const chargePercent = settings ? Number(settings.service_charge_percent) : 0;
  const tax = Math.round(afterDiscount * (taxPercent / 100) * 100) / 100;
  const charge = Math.round(afterDiscount * (chargePercent / 100) * 100) / 100;
  const total = Math.round((afterDiscount + tax + charge) * 100) / 100;
  return { subtotal, discount, tax, charge, total };
}

// Three-letter day code used by menu_items.days_available, e.g. "mon"
function todayCode() {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
}

// A menu item's displayed rating is 3.0 (baseline) plus up to +2.0 based
// on how often it's picked as a "liked most" favourite relative to how
// often it's been ordered — capped at 5.0, floored at 1.0. Skipped
// entirely if the Manager has manually overridden the rating.
function computeItemRating(timesOrdered, timesFavorited) {
  if (!timesOrdered) return 4.5; // no order history yet — keep the starter default
  const ratio = Math.min(1, timesFavorited / timesOrdered);
  const rating = 3.0 + ratio * 2.0;
  return Math.round(Math.min(5, Math.max(1, rating)) * 10) / 10;
}

module.exports = {
  generateOrderCode,
  generateTableCode,
  formatEuro,
  isOfferLive,
  applyDiscount,
  calcOrderTotals,
  todayCode,
  computeItemRating
};
