/**
 * Authentication & Authorization Type Definitions
 *
 * Supports:
 * - Email/password Login
 * - Google OAuth2
 * - JWT access/refresh tokens
 */

// ============================================
// Database Models
// ============================================

export interface User {
  id: number;
  email: string;
  password_hash?: string;
  provider: 'email' | 'google';
  provider_id?: string;
  name?: string;
  avatar_url?: string;
  email_verified: boolean;
  created_at: Date;
  /** Quản trị viên — chỉ đăng nhập trang admin */
  is_admin?: boolean;
  /** Khóa tài khoản — không đăng nhập / không gọi API */
  account_locked?: boolean;
  /** Giới hạn token/tháng (null = không giới hạn) */
  monthly_token_limit?: number | null;
}

export interface UserPublic {
  id: number;
  email: string;
  provider: 'email' | 'google';
  name?: string;
  avatar_url?: string;
  email_verified: boolean;
  created_at: Date;
  is_admin: boolean;
  account_locked: boolean;
  monthly_token_limit: number | null;
}

export interface RefreshToken {
  id: string;
  user_id: number;
  token_hash: string;
  jti: string;
  expires_at: Date;
  revoked_at?: Date;
  created_at: Date;
}

// ============================================
// JWT Payload Types
// ============================================

export interface AccessTokenPayload {
  userId: number;
  email: string;
  type: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: number;
  jti: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

// ============================================
// API Response Types
// ============================================

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserPublic;
  tokens: TokenPair;
}

// ============================================
// OAuth2 Types
// ============================================

export interface GoogleUserPayload {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

// ============================================
// Request Body Types
// ============================================

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

// ============================================
// Express Request Extension
// ============================================

export interface AuthenticatedUser {
  userId: number;
  email: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
