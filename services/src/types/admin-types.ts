/**
 * Admin API — quản lý người dùng (chỉ is_admin)
 */

import type { ItemResponse } from './item-types';

export interface AdminUserListRow {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
  is_admin: boolean;
  account_locked: boolean;
  monthly_token_limit: number | null;
}

export interface AdminUserListResponse {
  users: AdminUserListRow[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserDetail extends AdminUserListRow {
  items: ItemResponse[];
  /** Tổng token đã dùng (theo messages.tokens_used) */
  tokens_used_total: number;
  /** Token trong tháng hiện tại */
  tokens_used_this_month: number;
}

export interface AdminTokenDayPoint {
  day: string;
  tokens: number;
}

export interface AdminTokenUsageResponse {
  days: AdminTokenDayPoint[];
  total_in_range: number;
}

export interface AdminPatchUserBody {
  account_locked?: boolean;
  /** null = bỏ giới hạn */
  monthly_token_limit?: number | null;
}

export interface AdminExtendItemBody {
  /** Số ngày cộng thêm vào hạn hiện tại (hoặc từ hôm nay nếu chưa có hạn) */
  days: number;
}

export interface AdminChatSessionRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AdminMessageRow {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  attachments?: unknown;
  tokens_used?: number;
  created_at: string;
}

export interface AdminMessagesResponse {
  session: AdminChatSessionRow;
  messages: AdminMessageRow[];
}

/** Một mẫu dịch vụ admin có thể gán cho user */
export interface AdminItemCatalogEntry {
  id: string;
  name: string;
  description?: string;
}

export interface AdminCreateItemFromTemplateBody {
  templateId: string;
  /** Số ngày từ hôm nay tới hạn (mặc định 30) */
  expiryDays?: number;
}

/** Admin tạo user mới (có thể gán luôn một gói ChatGPT từ catalog) */
export interface AdminCreateUserBody {
  email: string;
  password: string;
  name?: string;
  /** Tuỳ chọn — mẫu từ /item-catalog */
  templateId?: string;
  /** Ngày hiệu lực tính từ hôm nay (mặc định 30) */
  expiryDays?: number;
}
