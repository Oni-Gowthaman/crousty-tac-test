// Light-touch translation for the Admin Panel's chrome (sidebar nav,
// page titles). Per the spec this is "if feasible" for admin/kitchen —
// the bulk of admin screens (data tables, forms) stay in English, since
// the Manager enters menu/offer text in whichever language they choose
// for each field anyway (name_en / name_fr side by side).

const dict = {
  nav_dashboard: { en: 'Dashboard', fr: 'Tableau de bord' },
  nav_menu: { en: 'Menu', fr: 'Menu' },
  nav_offers: { en: 'Offers', fr: 'Offres' },
  nav_announcements: { en: 'Announcements', fr: 'Annonces' },
  nav_tables: { en: 'Tables & QR Codes', fr: 'Tables & codes QR' },
  nav_orders: { en: 'Orders & Payments', fr: 'Commandes & paiements' },
  nav_customers: { en: 'Customers', fr: 'Clients' },
  nav_ratings: { en: 'Ratings & Feedback', fr: 'Avis & retours' },
  nav_reports: { en: 'Reports', fr: 'Rapports' },
  nav_settings: { en: 'Tax & Charges', fr: 'Taxes & frais' },
  nav_staff: { en: 'Staff Accounts', fr: 'Comptes du personnel' },
  signed_in_as: { en: 'Signed in as', fr: 'Connecté en tant que' },
  logout: { en: 'Log out', fr: 'Déconnexion' }
};

function allFor(lang) {
  const out = {};
  Object.keys(dict).forEach((key) => { out[key] = dict[key][lang] || dict[key].en; });
  return out;
}

module.exports = { allFor };
