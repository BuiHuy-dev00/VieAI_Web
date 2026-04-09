import { Pool } from 'pg';

const rawPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbPort = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 5432;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: dbPort,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'chat_db',
});

export async function initDb(): Promise<void> {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    /** DB cũ (volume Docker) có thể chưa có cột — tránh 500 khi gửi chat */
    await client.query(
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb`
    );
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`
    );
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked BOOLEAN NOT NULL DEFAULT FALSE`
    );
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_token_limit INTEGER`);
    client.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const result = await pool.query(text, params);
  return (result.rows[0] as T) || null;
}

export { pool };
