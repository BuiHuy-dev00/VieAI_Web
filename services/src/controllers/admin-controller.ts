import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Delete,
  Route,
  Tags,
  Path,
  Body,
  Query,
  Security,
  Request,
  Response,
  SuccessResponse,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { createError } from '../middleware/error-handler';
import type { ErrorResponse } from '../types/api-types';
import type { ItemResponse, UpdateItemRequest } from '../types/item-types';
import type {
  AdminUserListResponse,
  AdminUserDetail,
  AdminTokenUsageResponse,
  AdminChatSessionRow,
  AdminMessagesResponse,
  AdminUserListRow,
  AdminPatchUserBody,
  AdminExtendItemBody,
  AdminItemCatalogEntry,
  AdminCreateItemFromTemplateBody,
  AdminCreateUserBody,
} from '../types/admin-types';
import {
  adminListUsers,
  adminGetUser,
  adminGetTokenUsage,
  adminListSessions,
  adminGetSessionMessages,
  adminPatchUser,
  adminExtendItemDays,
  adminUpdateUserItem,
  adminGetItemCatalog,
  adminCreateItemFromTemplate,
  adminDeleteUserItem,
  adminCreateUser,
  adminDeleteUser,
} from '../services/admin-service';

@Route('api/admin')
@Tags('Admin')
export class AdminController extends Controller {
  /**
   * Mẫu dịch vụ có thể thêm cho user (vd. ChatGPT GO / PLUS / PRO)
   */
  @Get('item-catalog')
  @Security('jwt_admin')
  public async getItemCatalog(): Promise<AdminItemCatalogEntry[]> {
    return adminGetItemCatalog();
  }

  /**
   * Danh sách tất cả người dùng (phân trang)
   */
  @Get('users')
  @Security('jwt_admin')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Response<ErrorResponse>(403, 'Forbidden')
  public async listUsers(
    @Query() page?: number,
    @Query() limit?: number
  ): Promise<AdminUserListResponse> {
    return adminListUsers(page ?? 1, limit ?? 20);
  }

  /**
   * Tạo tài khoản mới (email + mật khẩu + tên; có thể gán gói dịch vụ từ catalog)
   */
  @Post('users')
  @Security('jwt_admin')
  @SuccessResponse(201, 'Created')
  @Response<ErrorResponse>(400, 'Bad request')
  @Response<ErrorResponse>(409, 'Conflict')
  public async createUser(@Body() body: AdminCreateUserBody): Promise<AdminUserListRow> {
    const row = await adminCreateUser({
      email: body.email,
      password: body.password,
      name: body.name,
      templateId: body.templateId,
      expiryDays: body.expiryDays,
    });
    this.setStatus(201);
    return row;
  }

  /**
   * Chi tiết một user: dịch vụ (items), tổng token
   */
  @Get('users/{userId}')
  @Security('jwt_admin')
  @Response<ErrorResponse>(404, 'Not found')
  public async getUser(@Path() userId: number): Promise<AdminUserDetail> {
    const u = await adminGetUser(userId);
    if (!u) {
      this.setStatus(404);
      throw createError('Không tìm thấy người dùng', 404);
    }
    return u;
  }

  /**
   * Token theo ngày (biểu đồ)
   */
  @Get('users/{userId}/token-usage')
  @Security('jwt_admin')
  public async getTokenUsage(
    @Path() userId: number,
    @Query() days?: number
  ): Promise<AdminTokenUsageResponse> {
    return adminGetTokenUsage(userId, days ?? 30);
  }

  @Get('users/{userId}/sessions')
  @Security('jwt_admin')
  public async listSessions(@Path() userId: number): Promise<AdminChatSessionRow[]> {
    return adminListSessions(userId);
  }

  @Get('users/{userId}/sessions/{sessionId}/messages')
  @Security('jwt_admin')
  @Response<ErrorResponse>(404, 'Not found')
  public async getSessionMessages(
    @Path() userId: number,
    @Path() sessionId: string
  ): Promise<AdminMessagesResponse> {
    const data = await adminGetSessionMessages(userId, sessionId);
    if (!data) {
      this.setStatus(404);
      throw createError('Không tìm thấy phiên chat', 404);
    }
    return data;
  }

  /**
   * Khóa / mở tài khoản, đặt giới hạn token/tháng
   */
  @Patch('users/{userId}')
  @Security('jwt_admin')
  @Response<ErrorResponse>(400, 'Bad request')
  @Response<ErrorResponse>(404, 'Not found')
  public async patchUser(
    @Request() req: ExpressRequest,
    @Path() userId: number,
    @Body() body: AdminPatchUserBody
  ): Promise<AdminUserListRow> {
    const actorId = req.user!.userId;
    const row = await adminPatchUser(userId, body, actorId);
    if (!row) {
      this.setStatus(404);
      throw createError('Không tìm thấy người dùng', 404);
    }
    return row;
  }

  /**
   * Cộng thêm ngày sử dụng cho một dịch vụ (item)
   */
  @Post('users/{userId}/items/{itemId}/extend-days')
  @Security('jwt_admin')
  @Response<ErrorResponse>(404, 'Not found')
  public async extendItem(
    @Path() userId: number,
    @Path() itemId: string,
    @Body() body: AdminExtendItemBody
  ): Promise<ItemResponse> {
    const item = await adminExtendItemDays(userId, itemId, body.days);
    if (!item) {
      this.setStatus(404);
      throw createError('Không tìm thấy dịch vụ', 404);
    }
    return item;
  }

  /**
   * Cập nhật dịch vụ (tên, hạn, trạng thái, …)
   */
  @Put('users/{userId}/items/{itemId}')
  @Security('jwt_admin')
  @Response<ErrorResponse>(404, 'Not found')
  public async updateItem(
    @Path() userId: number,
    @Path() itemId: string,
    @Body() body: UpdateItemRequest
  ): Promise<ItemResponse> {
    const item = await adminUpdateUserItem(userId, itemId, body);
    if (!item) {
      this.setStatus(404);
      throw createError('Không tìm thấy dịch vụ', 404);
    }
    return item;
  }

  /**
   * Thêm dịch vụ cho user từ mẫu (catalog)
   */
  @Post('users/{userId}/items')
  @Security('jwt_admin')
  @SuccessResponse(201, 'Created')
  @Response<ErrorResponse>(400, 'Bad request')
  @Response<ErrorResponse>(409, 'Already exists')
  public async createUserItem(
    @Path() userId: number,
    @Body() body: AdminCreateItemFromTemplateBody
  ): Promise<ItemResponse> {
    const item = await adminCreateItemFromTemplate(userId, body.templateId, body.expiryDays);
    this.setStatus(201);
    return item;
  }

  /**
   * Xóa một dịch vụ (item) của user
   */
  @Delete('users/{userId}/items/{itemId}')
  @Security('jwt_admin')
  @SuccessResponse(204, 'Deleted')
  @Response<ErrorResponse>(404, 'Not found')
  public async deleteUserItem(@Path() userId: number, @Path() itemId: string): Promise<void> {
    const ok = await adminDeleteUserItem(userId, itemId);
    if (!ok) {
      this.setStatus(404);
      throw createError('Không tìm thấy dịch vụ', 404);
    }
    this.setStatus(204);
  }

  /**
   * Xóa tài khoản người dùng (không xóa admin / chính mình)
   */
  @Delete('users/{userId}')
  @Security('jwt_admin')
  @SuccessResponse(204, 'Deleted')
  @Response<ErrorResponse>(400, 'Bad request')
  @Response<ErrorResponse>(404, 'Not found')
  public async deleteUser(@Request() req: ExpressRequest, @Path() userId: number): Promise<void> {
    await adminDeleteUser(userId, req.user!.userId);
    this.setStatus(204);
  }
}
