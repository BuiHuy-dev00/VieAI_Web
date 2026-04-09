/**
 * Item Types for Subscription Items API
 */

// ============================================
// Item Enums
// ============================================

export type ItemStatus = 'active' | 'expired' | 'pending';
export type ItemCategory = 'ai_chatbot' | 'working' | 'study' | 'automation' | 'addon';
export type ItemAction = 'open' | 'renew' | 'activate' | 'upgrade';

// ============================================
// Item Entity
// ============================================

export interface Item {
  id: string;
  name: string;
  icon_url: string;
  home_url?: string;
  description?: string;
  expiry_date?: Date;
  status: ItemStatus;
  category: ItemCategory;
  available_actions: ItemAction[];
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Request Types
// ============================================

export interface CreateItemRequest {
  /** Item name (e.g., "Claude Pro") */
  name: string;
  /** Icon URL */
  icon_url: string;
  /** Home URL of the service */
  home_url?: string;
  /** Optional description */
  description?: string;
  /** Subscription expiry date */
  expiry_date?: string;
  /** Item status */
  status: ItemStatus;
  /** Item category */
  category: ItemCategory;
  /** Available actions for this item */
  available_actions: ItemAction[];
}

export interface UpdateItemRequest {
  name?: string;
  icon_url?: string;
  home_url?: string;
  description?: string;
  expiry_date?: string;
  status?: ItemStatus;
  category?: ItemCategory;
  available_actions?: ItemAction[];
}

export interface ListItemsQuery {
  /** Filter by category */
  category?: ItemCategory;
  /** Filter by status */
  status?: ItemStatus;
  /** Page number */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Chỉ lấy item của user này (từ JWT — không nhận từ query client) */
  userId?: number;
}

// ============================================
// Response Types
// ============================================

export interface ItemResponse {
  id: string;
  name: string;
  icon_url: string;
  home_url?: string;
  description?: string;
  expiry_date?: string;
  status: ItemStatus;
  category: ItemCategory;
  available_actions: ItemAction[];
  /** Owner user id (for UI: show renew only when matches current user) */
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface ItemListResponse {
  items: ItemResponse[];
  total: number;
  page: number;
  limit: number;
}
