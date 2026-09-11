// -----------------------------------------------------------------
// SMS — placeholder only.
//
// The "your food is ready" alert already works fully as an in-app
// pop-up (via Socket.IO — see order-status.js / chef.js). This file
// is just where the TEXT MESSAGE part will plug in later.
//
// When you're ready to send real SMS:
//   1. npm install twilio   (or any provider you prefer)
//   2. Replace the body of sendReadySms() below with a real call.
//   3. Put your credentials in .env as SMS_PROVIDER_API_KEY.
// The rest of the app already calls this function at the right
// moment (when the chef marks an order "Ready") — nothing else
// needs to change.
// -----------------------------------------------------------------

async function sendReadySms({ mobileNumber, customerName, orderCode, language }) {
  const message =
    language === 'fr'
      ? `Crousty Tac — ${customerName}, votre commande ${orderCode} est prête ! 🎉`
      : `Crousty Tac — ${customerName}, your order ${orderCode} is ready! 🎉`;

  // TODO: replace this console log with a real SMS API call, e.g.:
  //   const twilio = require('twilio')(accountSid, process.env.SMS_PROVIDER_API_KEY);
  //   await twilio.messages.create({ to: mobileNumber, from: '+33...', body: message });

  console.log(`[SMS placeholder] Would text ${mobileNumber}: "${message}"`);
  return { success: true, simulated: true };
}

module.exports = { sendReadySms };
