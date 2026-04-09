import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Tags,
  Body,
  Path,
  Query,
  Security,
  Response,
  Request,
  SuccessResponse,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import {
  listItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  renewItem,
} from '../services/item-service';
import type {
  ItemResponse,
  ItemListResponse,
  CreateItemRequest,
  UpdateItemRequest,
  ItemCategory,
  ItemStatus,
} from '../types/item-types';
import type { ErrorResponse } from '../types/api-types';
import { createError } from '../middleware/error-handler';

// ============================================
// Item Controller - tsoa
// ============================================

@Route('api/items')
@Tags('Items')
export class ItemController extends Controller {

  /**
   * Danh sách gói dịch vụ của **tài khoản đang đăng nhập** (không trả item của user khác).
   */
  @Get()
  @Security('jwt')
  public async listItems(
    @Request() request: ExpressRequest,
    @Query() category?: ItemCategory,
    @Query() status?: ItemStatus,
    @Query() page?: number,
    @Query() limit?: number
  ): Promise<ItemListResponse> {
    const userId = request.user!.userId;
    return await listItems({ category, status, page, limit, userId });
  }

  /**
   * Get a single item by ID (public)
   * @param id Item ID
   */
  @Get('{id}')
  @Response<ErrorResponse>(404, 'Item not found')
  public async getItem(@Path() id: string): Promise<ItemResponse> {
    const item = await getItemById(id);

    if (!item) {
      this.setStatus(404);
      throw createError('Item not found', 404);
    }

    return item;
  }

  /**
   * Create a new subscription item
   */
  @Post()
  @Security('jwt')
  @SuccessResponse(201, 'Item created')
  @Response<ErrorResponse>(400, 'Invalid input')
  @Response<ErrorResponse>(401, 'Unauthorized')
  public async createItem(
    @Request() request: ExpressRequest,
    @Body() body: CreateItemRequest
  ): Promise<ItemResponse> {
    const userId = request.user!.userId;
    const item = await createItem(userId, body);
    this.setStatus(201);
    return item;
  }

  /**
   * Renew subscription: extends expiry by 30 days (owner only).
   */
  @Post('{id}/renew')
  @Security('jwt')
  @SuccessResponse(200, 'Item renewed')
  @Response<ErrorResponse>(400, 'Renew not available')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Response<ErrorResponse>(404, 'Item not found')
  public async renewSubscription(
    @Request() request: ExpressRequest,
    @Path() id: string
  ): Promise<ItemResponse> {
    const userId = request.user!.userId;
    return await renewItem(id, userId);
  }

  /**
   * Update an existing item
   * @param id Item ID
   */
  @Put('{id}')
  @Security('jwt')
  @Response<ErrorResponse>(400, 'Invalid input')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Response<ErrorResponse>(404, 'Item not found')
  public async updateItem(
    @Request() request: ExpressRequest,
    @Path() id: string,
    @Body() body: UpdateItemRequest
  ): Promise<ItemResponse> {
    const userId = request.user!.userId;
    const item = await updateItem(id, userId, body);

    if (!item) {
      this.setStatus(404);
      throw createError('Item not found', 404);
    }

    return item;
  }

  /**
   * Delete an item
   * @param id Item ID
   */
  @Delete('{id}')
  @Security('jwt')
  @SuccessResponse(204, 'Item deleted')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Response<ErrorResponse>(404, 'Item not found')
  public async deleteItem(
    @Request() request: ExpressRequest,
    @Path() id: string
  ): Promise<void> {
    const userId = request.user!.userId;
    const deleted = await deleteItem(id, userId);

    if (!deleted) {
      this.setStatus(404);
      throw createError('Item not found', 404);
    }

    this.setStatus(204);
  }
}
