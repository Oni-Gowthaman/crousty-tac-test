// Every user-facing word in the customer app and the chef screen
// lives here, in English and French. Add a key here, use t('key')
// in any EJS view, and both languages stay in sync automatically.
// French is the default language throughout the app.

const dict = {
  // --- Front / landing page ---
  tagline: { en: 'Scan · Order · Enjoy', fr: 'Scannez · Commandez · Régalez-vous' },
  table: { en: 'Table', fr: 'Table' },
  counter_order: { en: 'Counter order', fr: 'Commande au comptoir' },
  dining_question: { en: 'Dine in or takeaway?', fr: 'Sur place ou à emporter ?' },
  dine_in: { en: 'Dine in', fr: 'Sur place' },
  takeaway: { en: 'Takeaway', fr: 'À emporter' },
  order_now: { en: 'Order now', fr: 'Commander maintenant' },
  english: { en: 'English', fr: 'English' },
  french: { en: 'Français', fr: 'Français' },

  // --- Menu ---
  our_menu: { en: 'Our Menu', fr: 'Notre Carte' },
  tacos: { en: 'Tacos', fr: 'Tacos' },
  wraps: { en: 'Wraps', fr: 'Wraps' },
  sandwiches: { en: 'Sandwiches', fr: 'Sandwichs' },
  dips: { en: 'Dips & Sauces', fr: 'Sauces' },
  drinks: { en: 'Drinks', fr: 'Boissons' },
  add: { en: 'Add', fr: 'Ajouter' },
  sold_out: { en: 'Sold out today', fr: 'Épuisé aujourd\u2019hui' },
  veg: { en: 'Veg', fr: 'Végé' },
  non_veg: { en: 'Non-veg', fr: 'Non-végé' },
  view_cart: { en: 'View cart', fr: 'Voir le panier' },
  your_order: { en: 'Your order', fr: 'Votre commande' },
  empty_cart: { en: 'Your cart is empty', fr: 'Votre panier est vide' },
  back_to_menu: { en: 'Back to menu', fr: 'Retour à la carte' },

  // --- Cart / checkout ---
  order_summary: { en: 'Order summary', fr: 'Résumé de la commande' },
  subtotal: { en: 'Subtotal', fr: 'Sous-total' },
  discount: { en: 'Discount', fr: 'Réduction' },
  tax: { en: 'Tax', fr: 'Taxe' },
  service_charge: { en: 'Service charge', fr: 'Frais de service' },
  total: { en: 'Total', fr: 'Total' },
  add_dips: { en: 'Add dips & sauces', fr: 'Ajouter des sauces' },
  optional: { en: '(optional)', fr: '(facultatif)' },
  your_details: { en: 'Your details', fr: 'Vos informations' },
  full_name: { en: 'Full name', fr: 'Nom complet' },
  mobile_number: { en: 'Mobile number', fr: 'Numéro de mobile' },
  cooking_instructions: { en: 'Cooking instructions', fr: 'Instructions de cuisson' },
  cooking_instructions_ph: { en: 'e.g. less spicy, nut allergy…', fr: 'ex. moins épicé, allergie aux noix…' },
  payment_method: { en: 'Payment mode', fr: 'Mode de paiement' },
  cash: { en: 'Cash', fr: 'Espèces' },
  card: { en: 'Card', fr: 'Carte' },
  pay_qr: { en: 'Pay via QR', fr: 'Payer par QR' },
  payment_note: { en: 'This just tells staff how you\u2019ll pay — you pay in person at the counter when you collect your food.', fr: 'Ceci indique juste au personnel votre mode de paiement — vous payez sur place au comptoir en récupérant votre commande.' },
  place_order: { en: 'Place order', fr: 'Commander' },
  offer_applied: { en: 'Offer applied automatically', fr: 'Offre appliquée automatiquement' },
  remove: { en: 'Remove', fr: 'Retirer' },
  order_confirmed_title: { en: 'Order sent!', fr: 'Commande envoyée !' },
  order_confirmed_msg: { en: 'You\u2019ll get a pop-up the moment your food is ready. Our staff will also call out your name and table for pickup.', fr: 'Vous recevrez une notification dès que votre commande sera prête. Notre équipe annoncera aussi votre nom et votre table.' },
  continue_btn: { en: 'Continue', fr: 'Continuer' },

  // --- Status ---
  status_received: { en: 'Order received', fr: 'Commande reçue' },
  status_preparing: { en: 'Preparing your food', fr: 'En préparation' },
  status_ready: { en: 'Ready! Hurray!', fr: 'Prête ! Hourra !' },
  status_collected: { en: 'Collected — enjoy!', fr: 'Récupérée — bon appétit !' },
  estimated_time: { en: 'Estimated time', fr: 'Temps estimé' },
  minutes: { en: 'min', fr: 'min' },
  order_number: { en: 'Order', fr: 'Commande' },
  step_received: { en: 'Received', fr: 'Reçue' },
  step_preparing: { en: 'Preparing', fr: 'Préparation' },
  step_ready: { en: 'Ready', fr: 'Prête' },
  ready_message: { en: 'Hurray! Your food is ready!', fr: 'Hourra ! Votre commande est prête !' },
  collect_at_counter: { en: 'Please collect it at the counter.', fr: 'Merci de venir la récupérer au comptoir.' },

  // --- Rating ---
  liked_most_q: { en: 'Which food did you like the most?', fr: 'Quel plat avez-vous préféré ?' },
  liked_most_hint: { en: 'Pick as many as you like', fr: 'Choisissez-en autant que vous voulez' },
  feedback_optional: { en: 'Any other comments? (optional)', fr: 'Un commentaire ? (facultatif)' },
  submit_rating: { en: 'Submit', fr: 'Envoyer' },
  thank_you: { en: 'Thank you!', fr: 'Merci !' },
  thank_you_msg: { en: 'Thanks for eating with us — see you soon!', fr: 'Merci de votre visite — à bientôt !' },

  // --- Chef screen ---
  kitchen_screen: { en: 'Kitchen Screen', fr: 'Écran Cuisine' },
  new_orders: { en: 'New', fr: 'Nouvelles' },
  preparing: { en: 'Preparing', fr: 'En préparation' },
  ready: { en: 'Ready', fr: 'Prêtes' },
  mark_preparing: { en: 'Start preparing', fr: 'Démarrer' },
  mark_ready: { en: 'Mark ready', fr: 'Marquer prête' },
  mark_collected: { en: 'Mark collected', fr: 'Marquer récupérée' },
  set_time: { en: 'Set estimated minutes', fr: 'Définir le temps estimé' },
  menu_availability: { en: 'Menu availability', fr: 'Disponibilité du menu' },
  available: { en: 'Available', fr: 'Disponible' },
  logout: { en: 'Log out', fr: 'Déconnexion' },
  no_orders: { en: 'No orders right now', fr: 'Aucune commande pour le moment' },
  instructions_label: { en: 'Instructions', fr: 'Instructions' },
  payment_label: { en: 'Payment', fr: 'Paiement' }
};

function t(lang, key) {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

// Builds a flat { key: text } object for a whole language —
// handy to hand to an EJS view as `t`.
function allFor(lang) {
  const out = {};
  Object.keys(dict).forEach((key) => {
    out[key] = dict[key][lang] || dict[key].en;
  });
  return out;
}

module.exports = { t, allFor, dict };
