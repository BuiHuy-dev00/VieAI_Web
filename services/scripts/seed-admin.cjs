/**
 * Upserts default admin user. Run from services/: npm run db:seed-admin
 * Requires .env with DB_* (localhost + DB_PORT 5433 if using docker-compose db only).
 */
require('dotenv').config();
const { Client } = require('pg');

const sql = `
INSERT INTO users (email, password_hash, name, provider, email_verified)
VALUES (
  'admin@localhost',
  '$2b$12$qx9Yj8H.7wm.1ssHZbv/Ru6fvmZCc/ARJe9tVVngpCHDBH3QJ2a7S',
  'Administrator',
  'email',
  TRUE
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  email_verified = EXCLUDED.email_verified;
`;

async function main() {
  const rawPort = parseInt(process.env.DB_PORT || '5432', 10);
  const port = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 5432;
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'chat_db',
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log('OK: admin@localhost ready (password: Admin123!)');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
