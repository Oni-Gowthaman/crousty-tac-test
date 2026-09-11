// -----------------------------------------------------------------
// PAYMENT — placeholder / label only.
//
// Per the requirements, payment is NOT processed inside the app at
// all — the customer just picks Cash / Card / Pay via QR as a LABEL
// so kitchen/counter staff know what to expect, then pays in person
// when collecting their food. This function exists only so that IF
// a real gateway is ever wanted later, there's a single obvious place
// to add it — nothing calls it expecting a real charge to happen.
// -----------------------------------------------------------------

async function chargePayment({ method, amount, orderCode }) {
  // Cash is always just "pay at pickup" — no charge to run now.
  if (method === 'cash') {
    return { success: true, status: 'pending', reference: null };
  }

  // 'card' and 'qr' are ALSO just labels right now (no gateway wired
  // up — out of scope for this build). If that ever changes:
  //   const stripe = require('stripe')(process.env.PAYMENT_PROVIDER_API_KEY);
  //   const intent = await stripe.paymentIntents.create({ ... });
  //   return { success: true, status: 'successful', reference: intent.id };

  return { success: true, status: 'pending', reference: null };
}

module.exports = { chargePayment };
