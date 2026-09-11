// Run once after the database is set up:
//   npm run seed:staff
//
// Creates a default Admin login and a default Chef PIN so you can
// sign in immediately. Change these values below first if you like,
// or just log in with the defaults and add more staff from
// Admin > Staff Accounts afterwards.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../db');

const DEFAULT_ADMIN = { name: 'Sofi (Owner)', username: 'admin', password: 'crousty2026' };
const DEFAULT_CHEF = { name: 'Kitchen', pin: '1234' };

async function run() {
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
  const pinHash = await bcrypt.hash(DEFAULT_CHEF.pin, 10);

  await db.query(
    `INSERT INTO staff (name, role, username, password_hash)
     VALUES (?, 'admin', ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)`,
    [DEFAULT_ADMIN.name, DEFAULT_ADMIN.username, passwordHash]
  );

  const [existingChef] = await db.query('SELECT id FROM staff WHERE role = "chef" LIMIT 1');
  if (!existingChef.length) {
    await db.query(`INSERT INTO staff (name, role, pin_hash) VALUES (?, 'chef', ?)`, [DEFAULT_CHEF.name, pinHash]);
  }

  console.log('\nDefault staff accounts ready:');
  console.log(`  Admin  ->  username: ${DEFAULT_ADMIN.username}   password: ${DEFAULT_ADMIN.password}`);
  console.log(`  Chef   ->  open /chef/login, pick "${DEFAULT_CHEF.name}", PIN: ${DEFAULT_CHEF.pin}`);
  console.log('\nChange these from Admin > Staff Accounts once you\'re in.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seeding staff failed:', err.message);
  process.exit(1);
});
