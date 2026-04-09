import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/db';
import { createError } from '../middleware/error-handler';
import type {
  Item,
  ItemResponse,
  ItemListResponse,
  CreateItemRequest,
  UpdateItemRequest,
  ListItemsQuery,
} from '../types/item-types';

// ============================================
// Database Row Type
// ============================================

interface ItemRow {
  id: string;
  name: string;
  icon_url: string;
  home_url: string | null;
  description: string | null;
  expiry_date: Date | null;
  status: string;
  category: string;
  available_actions: string[]; // JSONB auto-parsed by pg driver
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Helper Functions
// ============================================

function mapRowToResponse(row: ItemRow): ItemResponse {
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

// ============================================
// Service Functions
// ============================================

export async function listItems(
  filters: ListItemsQuery = {}
): Promise<ItemListResponse> {
  const { category, status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`category = $${paramIndex++}`);
    params.push(category);
  }

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (filters.userId != null) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(filters.userId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM items ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count || '0', 10);

  // Get items with pagination
  params.push(limit, offset);
  const rows = await query<ItemRow>(
    `SELECT * FROM items ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  return {
    items: rows.map(mapRowToResponse),
    total,
    page,
    limit,
  };
}

export async function getItemById(id: string): Promise<ItemResponse | null> {
  const row = await queryOne<ItemRow>(
    'SELECT * FROM items WHERE id = $1',
    [id]
  );

  return row ? mapRowToResponse(row) : null;
}

export async function createItem(
  userId: number,
  data: CreateItemRequest
): Promise<ItemResponse> {
  const id = uuidv4();
  const now = new Date();

  const row = await queryOne<ItemRow>(
    `INSERT INTO items (id, name, icon_url, home_url, description, expiry_date, status, category, available_actions, user_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      id,
      data.name,
      data.icon_url,
      data.home_url || null,
      data.description || null,
      data.expiry_date ? new Date(data.expiry_date) : null,
      data.status,
      data.category,
      JSON.stringify(data.available_actions),
      userId,
      now,
      now,
    ]
  );

  return mapRowToResponse(row!);
}

export async function updateItem(
  id: string,
  userId: number,
  data: UpdateItemRequest
): Promise<ItemResponse | null> {
  // Check if item exists and belongs to user
  const existing = await queryOne<ItemRow>(
    'SELECT * FROM items WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (!existing) return null;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(data.name);
  }
  if (data.icon_url !== undefined) {
    updates.push(`icon_url = $${paramIndex++}`);
    params.push(data.icon_url);
  }
  if (data.home_url !== undefined) {
    updates.push(`home_url = $${paramIndex++}`);
    params.push(data.home_url);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(data.description);
  }
  if (data.expiry_date !== undefined) {
    updates.push(`expiry_date = $${paramIndex++}`);
    params.push(data.expiry_date ? new Date(data.expiry_date) : null);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(data.status);
  }
  if (data.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    params.push(data.category);
  }
  if (data.available_actions !== undefined) {
    updates.push(`available_actions = $${paramIndex++}`);
    params.push(JSON.stringify(data.available_actions));
  }

  if (updates.length === 0) return mapRowToResponse(existing);

  updates.push(`updated_at = $${paramIndex++}`);
  params.push(new Date());

  params.push(id, userId);

  const row = await queryOne<ItemRow>(
    `UPDATE items SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
     RETURNING *`,
    params
  );

  return row ? mapRowToResponse(row) : null;
}

export async function deleteItem(id: string, userId: number): Promise<boolean> {
  const result = await query(
    'DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return result.length > 0;
}

/** Extend subscription by `days` (default 30) from current expiry or today, whichever is later. */
export async function renewItem(
  id: string,
  userId: number,
  days = 30
): Promise<ItemResponse> {
  const existing = await queryOne<ItemRow>(
    'SELECT * FROM items WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  if (!existing) {
    throw createError('Item not found', 404);
  }

  const actions = (existing.available_actions ?? []) as string[];
  if (!actions.includes('renew')) {
    throw createError('Renew is not available for this item', 400);
  }

  const now = new Date();
  const current = existing.expiry_date ? new Date(existing.expiry_date) : now;
  const base = current > now ? current : now;
  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + days);

  const row = await queryOne<ItemRow>(
    `UPDATE items
     SET expiry_date = $1, updated_at = $2, status = 'active'
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [newExpiry, new Date(), id, userId]
  );

  if (!row) {
    throw createError('Failed to renew item', 500);
  }

  return mapRowToResponse(row);
}
