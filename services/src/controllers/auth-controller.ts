import {
  Controller,
  Get,
  Post,
  Route,
  Tags,
  Body,
  Security,
  Response,
  Request,
  SuccessResponse,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import {
  register,
  login,
  googleAuth,
  refreshTokens,
  logout,
  getUserById,
} from '../services/auth-service';
import type {
  AuthResponse,
  UserPublic,
  TokenPair,
  RegisterRequest,
  LoginRequest,
  GoogleAuthRequest,
  RefreshRequest,
} from '../types/auth-types';
import type { ErrorResponse } from '../types/api-types';
import { createError } from '../middleware/error-handler';

// ============================================
// Auth Controller - tsoa
// ============================================

@Route('api/auth')
@Tags('Auth')
export class AuthController extends Controller {

  /**
   * Register a new user with email and password
   */
  @Post('register')
  @SuccessResponse(201, 'User registered successfully')
  @Response<ErrorResponse>(400, 'Invalid input')
  @Response<ErrorResponse>(409, 'Email already exists')
  public async register(
    @Body() body: RegisterRequest
  ): Promise<AuthResponse> {
    const result = await register(body.email, body.password, body.name);
    this.setStatus(201);
    return result;
  }

  /**
   * Login with email and password
   */
  @Post('login')
  @Response<ErrorResponse>(400, 'Invalid credentials')
  @Response<ErrorResponse>(401, 'Unauthorized')
  public async login(
    @Body() body: LoginRequest
  ): Promise<AuthResponse> {
    return await login(body.email, body.password);
  }

  /**
   * Authenticate with Google ID token
   */
  @Post('google')
  @Response<ErrorResponse>(400, 'Invalid Google token')
  public async googleAuth(
    @Body() body: GoogleAuthRequest
  ): Promise<AuthResponse> {
    return await googleAuth(body.idToken);
  }

  /**
   * Refresh access token using refresh token
   */
  @Post('refresh')
  @Response<ErrorResponse>(400, 'Invalid refresh token')
  @Response<ErrorResponse>(401, 'Token expired or revoked')
  public async refresh(
    @Body() body: RefreshRequest
  ): Promise<TokenPair> {
    return await refreshTokens(body.refreshToken);
  }

  /**
   * Logout and revoke refresh token
   */
  @Post('logout')
  @Response<ErrorResponse>(400, 'Invalid refresh token')
  public async logout(
    @Body() body: RefreshRequest
  ): Promise<{ message: string }> {
    await logout(body.refreshToken);
    return { message: 'Logged out successfully' };
  }

  /**
   * Get current authenticated user profile
   * @summary Get current user
   */
  @Get('me')
  @Security('jwt')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Response<ErrorResponse>(404, 'User not found')
  public async me(
    @Request() request: ExpressRequest
  ): Promise<UserPublic> {
    // request.user is set by expressAuthentication in tsoa-auth.ts
    const userId = request.user!.userId;
    const user = await getUserById(userId);

    if (!user) {
      this.setStatus(404);
      throw createError('User not found', 404);
    }

    return user;
  }
}
