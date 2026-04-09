import { query, queryOne } from '../config/db';
import { createError } from '../middleware/error-handler';
import { registerUserWithoutSession, revokeAllRefreshTokensForUser } from './auth-service';
import { createItem, deleteItem, updateItem } from './item-service';
import type { CreateItemRequest, UpdateItemRequest, ItemResponse } from '../types/item-types';
import { ADMIN_ITEM_TEMPLATES } from '../config/admin-item-templates';
import type {
  AdminUserListRow,
  AdminUserListResponse,
  AdminUserDetail,
  AdminTokenUsageResponse,
  AdminTokenDayPoint,
  AdminChatSessionRow,
  AdminMessageRow,
  AdminMessagesResponse,
  AdminItemCatalogEntry,
} from '../types/admin-types';

interface ItemRow {
  id: string;
  name: string;
  icon_url: string;
  home_url: string | null;
  description: string | null;
  expiry_date: Date | null;
  status: string;
  category: string;
  available_actions: string[];
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

function mapItemRow(row: ItemRow): ItemResponse {
  return {
    id: row.id,
    name: row.name,
    icon_url: row.icon_url,
    home_url: row.home_url || undefined,
    description: row.description || undefined,
    expiry_date: row.expiry_date?.toISOString(),
    status: row.status as ItemResponse['status'],
    category: row.category as ItemResponse['category'],
    available_actions: row.available_actions as ItemResponse['available_actions'],
    user_id: row.user_id,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function mapUserRow(r: {
  id: number;
  email: string;
  name: string | null;
  created_at: Date;
  is_admin: boolean;
  account_locked: boolean;
  monthly_token_limit: number | null;
}): AdminUserListRow {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    created_at: r.created_at.toISOString(),
    is_admin: r.is_admin,
    account_locked: r.account_locked,
    monthly_token_limit: r.monthly_token_limit,
  };
}

export async function adminListUsers(page = 1, limit = 20): Promise<AdminUserListResponse> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safeLimit;

  const countRow = await queryOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM users`
  );
  const total = parseInt(countRow?.n ?? '0', 10);

  const rows = await query<{
    id: number;
    email: string;
    name: string | null;
    created_at: Date;
    is_admin: boolean;
    account_locked: boolean;
    monthly_token_limit: number | null;
  }>(
    `SELECT id, email, name, created_at, is_admin, account_locked, monthly_token_limit
     FROM users ORDER BY id ASC
     LIMIT $1 OFFSET $2`,
    [safeLimit, offset]
  );

  return {
    users: rows.map(mapUserRow),
    total,
    page: safePage,
    limit: safeLimit,
  };
}

async function getTokenTotals(userId: number): Promise<{ total: number; month: number }> {
  const totalRow = await queryOne<{ n: string }>(
    `SELECT COALESCE(SUM(m.tokens_used), 0)::text AS n
     FROM messages m
     INNER JOIN chat_sessions s ON s.id = m.session_id
     WHERE s.user_id = $1`,
    [userId]
  );
  const monthRow = await queryOne<{ n: string }>(
    `SELECT COALESCE(SUM(m.tokens_used), 0)::text AS n
     FROM messages m
     INNER JOIN chat_sessions s ON s.id = m.session_id
     WHERE s.user_id = $1
       AND m.created_at >= date_trunc('month', CURRENT_TIMESTAMP)
       AND m.created_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'`,
    [userId]
  );
  return {
    total: parseInt(totalRow?.n ?? '0', 10),
    month: parseInt(monthRow?.n ?? '0', 10),
  };
}

export async function adminGetUser(userId: number): Promise<AdminUserDetail | null> {
  const u = await queryOne<{
    id: number;
    email: string;
    name: string | null;
    created_at: Date;
    is_admin: boolean;
    account_locked: boolean;
    monthly_token_limit: number | null;
  }>(
    `SELECT id, email, name, created_at, is_admin, account_locked, monthly_token_limit FROM users WHERE id = $1`,
    [userId]
  );
  if (!u) return null;

  const itemRows = await query<ItemRow>(`SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC`, [
    userId,
  ]);
  const tokens = await getTokenTotals(userId);

  return {
    ...mapUserRow(u),
    items: itemRows.map(mapItemRow),
    tokens_used_total: tokens.total,
    tokens_used_this_month: tokens.month,
  };
}

export async function adminGetTokenUsage(userId: number, days = 30): Promise<AdminTokenUsageResponse> {
  const d = Math.min(Math.max(days, 1), 365);
  const rows = await query<{ day: Date; tokens: string }>(
    `SELECT date_trunc('day', m.created_at)::date AS day,
            COALESCE(SUM(m.tokens_used), 0)::text AS tokens
     FROM messages m
     INNER JOIN chat_sessions s ON s.id = m.session_id
     WHERE s.user_id = $1
       AND m.created_at >= CURRENT_TIMESTAMP - ($2::integer * INTERVAL '1 day')
     GROUP BY 1
     ORDER BY 1 ASC`,
    [userId, d]
  );

  const points: AdminTokenDayPoint[] = rows.map((r) => ({
    day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
    tokens: parseInt(r.tokens, 10),
  }));

  const total_in_range = points.reduce((a, p) => a + p.tokens, 0);

  return { days: points, total_in_range };
}

export async function adminListSessions(userId: number): Promise<AdminChatSessionRow[]> {
  const rows = await query<{
    id: string;
    title: string;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, title, created_at, updated_at FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
  }));
}

export async function adminGetSessionMessages(
  userId: number,
  sessionId: string
): Promise<AdminMessagesResponse | null> {
  const session = await queryOne<{
    id: string;
    title: string;
    created_at: Date;
    updated_at: Date;
  }>(`SELECT id, title, created_at, updated_at FROM chat_sessions WHERE id = $1 AND user_id = $2`, [
    sessionId,
    userId,
  ]);
  if (!session) return null;

  const msgRows = await query<{
    id: number;
    role: string;
    content: string;
    attachments: unknown;
    tokens_used: number | null;
    created_at: Date;
  }>(
    `SELECT id, role, content, attachments, tokens_used, created_at FROM messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );

  const messages: AdminMessageRow[] = msgRows.map((m) => ({
    id: m.id,
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
    attachments: m.attachments,
    tokens_used: m.tokens_used ?? undefined,
    created_at: m.created_at.toISOString(),
  }));

  return {
    session: {
      id: session.id,
      title: session.title,
      created_at: session.created_at.toISOString(),
      updated_at: session.updated_at.toISOString(),
    },
    messages,
  };
}

export async function adminPatchUser(
  userId: number,
  patch: { account_locked?: boolean; monthly_token_limit?: number | null },
  /** Không cho khóa chính mình */
  actorUserId: number
): Promise<AdminUserListRow | null> {
  if (userId === actorUserId && patch.account_locked === true) {
    throw createError('Không thể khóa tài khoản đang đăng nhập', 400);
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (patch.account_locked !== undefined) {
    updates.push(`account_locked = $${i++}`);
    params.push(patch.account_locked);
  }
  if (patch.monthly_token_limit !== undefined) {
    updates.push(`monthly_token_limit = $${i++}`);
    params.push(patch.monthly_token_limit);
  }

  if (updates.length === 0) {
    const u = await queryOne<{
      id: number;
      email: string;
      name: string | null;
      created_at: Date;
      is_admin: boolean;
      account_locked: boolean;
      monthly_token_limit: number | null;
    }>(
      `SELECT id, email, name, created_at, is_admin, account_locked, monthly_token_limit FROM users WHERE id = $1`,
      [userId]
    );
    return u ? mapUserRow(u) : null;
  }

  params.push(userId);

  const row = await queryOne<{
    id: number;
    email: string;
    name: string | null;
    created_at: Date;
    is_admin: boolean;
    account_locked: boolean;
    monthly_token_limit: number | null;
  }>(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, name, created_at, is_admin, account_locked, monthly_token_limit`,
    params
  );

  if (patch.account_locked === true) {
    await revokeAllRefreshTokensForUser(userId);
  }

  return row ? mapUserRow(row) : null;
}

/** Cộng ngày vào hạn dịch vụ (không cần quyền renew trên item). */
export async function adminExtendItemDays(
  ownerUserId: number,
  itemId: string,
  days: number
): Promise<ItemResponse | null> {
  if (days < 1 || days > 3650) {
    throw createError('Số ngày không hợp lệ (1–3650)', 400);
  }

  const existing = await queryOne<ItemRow>(`SELECT * FROM items WHERE id = $1 AND user_id = $2`, [
    itemId,
    ownerUserId,
  ]);
  if (!existing) return null;

  const now = new Date();
  const current = existing.expiry_date ? new Date(existing.expiry_date) : now;
  const base = current > now ? current : now;
  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + days);

  const row = await queryOne<ItemRow>(
    `UPDATE items SET expiry_date = $1, updated_at = $2, status = 'active' WHERE id = $3 AND user_id = $4 RETURNING *`,
    [newExpiry, new Date(), itemId, ownerUserId]
  );

  return row ? mapItemRow(row) : null;
}

export async function adminUpdateUserItem(
  ownerUserId: number,
  itemId: string,
  body: UpdateItemRequest
): Promise<ItemResponse | null> {
  return updateItem(itemId, ownerUserId, body);
}

export function adminGetItemCatalog(): AdminItemCatalogEntry[] {
  return Object.entries(ADMIN_ITEM_TEMPLATES).map(([id, tpl]) => ({
    id,
    name: tpl.name,
    description: tpl.description,
  }));
}

/**
 * Thêm dịch vụ từ mẫu (ChatGPT GO/PLUS/PRO). Trùng tên với item của user → 409.
 */
export async function adminCreateItemFromTemplate(
  userId: number,
  templateId: string,
  expiryDays?: number
): Promise<ItemResponse> {
  const tpl = ADMIN_ITEM_TEMPLATES[templateId];
  if (!tpl) {
    throw createError('Mẫu dịch vụ không hợp lệ', 400);
  }

  const dup = await queryOne<{ id: string }>(
    `SELECT id FROM items WHERE user_id = $1 AND name = $2`,
    [userId, tpl.name]
  );
  if (dup) {
    throw createError('Người dùng đã có dịch vụ này', 409);
  }

  const days = expiryDays !== undefined && expiryDays > 0 ? Math.min(expiryDays, 3650) : 30;
  const exp = new Date();
  exp.setDate(exp.getDate() + days);

  const body: CreateItemRequest = {
    name: tpl.name,
    icon_url: tpl.icon_url,
    home_url: tpl.home_url,
    description: tpl.description,
    expiry_date: exp.toISOString(),
    status: tpl.status,
    category: tpl.category,
    available_actions: tpl.available_actions,
  };

  return createItem(userId, body);
}

export async function adminDeleteUserItem(userId: number, itemId: string): Promise<boolean> {
  return deleteItem(itemId, userId);
}

export async function adminCreateUser(input: {
  email: string;
  password: string;
  name?: string;
  templateId?: string;
  expiryDays?: number;
}): Promise<AdminUserListRow> {
  const created = await registerUserWithoutSession(input.email, input.password, input.name);
  try {
    if (input.templateId) {
      await adminCreateItemFromTemplate(created.id, input.templateId, input.expiryDays);
    }
  } catch (err) {
    await query('DELETE FROM users WHERE id = $1', [created.id]);
    throw err;
  }

  const row = await queryOne<{
    id: number;
    email: string;
    name: string | null;
    created_at: Date;
    is_admin: boolean;
    account_locked: boolean;
    monthly_token_limit: number | null;
  }>(
    `SELECT id, email, name, created_at, is_admin, account_locked, monthly_token_limit FROM users WHERE id = $1`,
    [created.id]
  );
  if (!row) {
    throw createError('Không tải lại user sau khi tạo', 500);
  }
  return mapUserRow(row);
}

export async function adminDeleteUser(userId: number, actorUserId: number): Promise<void> {
  if (userId === actorUserId) {
    throw createError('Không thể xóa chính tài khoản đang đăng nhập', 400);
  }
  const u = await queryOne<{ is_admin: boolean }>(`SELECT is_admin FROM users WHERE id = $1`, [userId]);
  if (!u) {
    throw createError('Không tìm thấy người dùng', 404);
  }
  if (u.is_admin) {
    throw createError('Không thể xóa tài khoản quản trị', 400);
  }
  await revokeAllRefreshTokensForUser(userId);
  await query('DELETE FROM users WHERE id = $1', [userId]);
}

/** Tổng token đã dùng trong tháng (để giới hạn chat). */
export async function getMonthlyTokensUsed(userId: number): Promise<number> {
  const monthRow = await queryOne<{ n: string }>(
    `SELECT COALESCE(SUM(m.tokens_used), 0)::text AS n
     FROM messages m
     INNER JOIN chat_sessions s ON s.id = m.session_id
     WHERE s.user_id = $1
       AND m.created_at >= date_trunc('month', CURRENT_TIMESTAMP)
       AND m.created_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'`,
    [userId]
  );
  return parseInt(monthRow?.n ?? '0', 10);
}

export async function getMonthlyTokenLimit(userId: number): Promise<number | null> {
  const row = await queryOne<{ monthly_token_limit: number | null }>(
    `SELECT monthly_token_limit FROM users WHERE id = $1`,
    [userId]
  );
  return row?.monthly_token_limit ?? null;
}
