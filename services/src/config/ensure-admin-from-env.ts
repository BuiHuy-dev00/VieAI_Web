import { query } from './db';
import { hashPassword } from '../utils/password-utils';

/**
 * Đồng bộ tài khoản admin từ ADMIN_EMAIL / ADMIN_PASSWORD (file .env cạnh docker-compose.yml
 * được compose nạp vào backend qua env_file).
 *
 * - Có đủ biến: tạo/cập nhật user email đó, hash mật khẩu, is_admin = true.
 * - Không có: giữ tương thích — gán is_admin cho user seed admin@localhost (init.sql) nếu tồn tại.
 */
export async function ensureAdminUserFromEnv(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (email && (!password || String(password).length === 0)) {
    console.warn(
      '[init] Có ADMIN_EMAIL nhưng thiếu ADMIN_PASSWORD — không tạo admin từ .env; dùng fallback admin@localhost nếu có.'
    );
  }

  if (email && password != null && String(password).length > 0) {
    const hash = await hashPassword(String(password));
    await query(
      `INSERT INTO users (email, password_hash, name, provider, email_verified, is_admin, account_locked)
       VALUES ($1, $2, $3, 'email', TRUE, TRUE, FALSE)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         is_admin = TRUE,
         account_locked = FALSE`,
      [email, hash, process.env.ADMIN_NAME?.trim() || 'Administrator']
    );

    if (email !== 'admin@localhost') {
      await query(`UPDATE users SET is_admin = FALSE WHERE email = 'admin@localhost'`);
    }

    console.log(`[init] Tài khoản admin từ .env: ${email}`);
    return;
  }

  await query(`UPDATE users SET is_admin = TRUE WHERE email = 'admin@localhost'`);
  console.log(
    '[init] Không có ADMIN_EMAIL/ADMIN_PASSWORD — nếu có user admin@localhost (seed DB) sẽ được gán quyền admin.'
  );
}
