-- Apply on an existing database (does not replace full init.sql).
-- Login: admin@localhost  /  Admin123!

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
