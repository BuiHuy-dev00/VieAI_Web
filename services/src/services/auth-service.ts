import { OAuth2Client } from 'google-auth-library';
import { query, queryOne } from '../config/db';
import type {
  User,
  UserPublic,
  RefreshToken,
  GoogleUserPayload,
  AuthResponse,
} from '../types/auth-types';
import {
  generateTokenPair,
  verifyRefreshToken,
  hashToken,
  getRefreshExpiration,
} from '../utils/jwt-utils';
import {
  hashPassword,
  comparePassword,
  validatePassword,
} from '../utils/password-utils';
import { createError } from '../middleware/error-handler';

// ============================================
// Google OAuth Client
// ============================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Warn if Google OAuth not configured (fail-fast at runtime when used)
if (!GOOGLE_CLIENT_ID && process.env.NODE_ENV === 'production') {
  console.warn('GOOGLE_CLIENT_ID not set - Google OAuth will fail');
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert User to UserPublic (remove sensitive fields)
 */
function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    email_verified: user.email_verified,
    provider: user.provider,
    created_at: user.created_at,
    is_admin: Boolean(user.is_admin),
    account_locked: Boolean(user.account_locked),
    monthly_token_limit: user.monthly_token_limit ?? null,
  };
}

/**
 * Store refresh token in database
 */
async function storeRefreshToken(
  userId: number,
  refreshToken: string,
  jti: string
): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshExpiration();

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, jti, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, jti, expiresAt]
  );
}

/**
 * Revoke refresh token by jti
 */
async function revokeRefreshToken(jti: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE jti = $1`,
    [jti]
  );
}

/**
 * Check if refresh token is valid (not revoked, not expired)
 */
async function isRefreshTokenValid(jti: string): Promise<boolean> {
  const token = await queryOne<RefreshToken>(
    `SELECT * FROM refresh_tokens
     WHERE jti = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [jti]
  );
  return token !== null;
}

// ============================================
// Auth Service Functions
// ============================================

/**
 * Register new user with email/password
 */
export async function register(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  // Validate password
  const validation = validatePassword(password);
  if (!validation.valid) {
    const error = new Error(validation.errors.join(', '));
    (error as any).statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim();

  // Check if email exists
  const existing = await queryOne<User>(
    'SELECT id FROM users WHERE email = $1',
    [normalizedEmail]
  );
  if (existing) {
    const error = new Error('Email already registered');
    (error as any).statusCode = 409;
    throw error;
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const user = await queryOne<User>(
    `INSERT INTO users (email, password_hash, name, provider, email_verified)
     VALUES ($1, $2, $3, 'email', FALSE)
     RETURNING *`,
    [normalizedEmail, passwordHash, name || null]
  );

  if (!user) {
    throw new Error('Failed to create user');
  }

  // Generate tokens
  const { accessToken, refreshToken, jti } = generateTokenPair(user.id, user.email);
  await storeRefreshToken(user.id, refreshToken, jti);

  return {
    user: toPublicUser(user),
    tokens: { accessToken, refreshToken },
  };
}

/**
 * Tạo user email/password (không phát token) — dùng cho admin thêm tài khoản.
 */
export async function registerUserWithoutSession(
  email: string,
  password: string,
  name?: string
): Promise<UserPublic> {
  const validation = validatePassword(password);
  if (!validation.valid) {
    throw createError(validation.errors.join(', '), 400);
  }

  const normalizedEmail = email.trim();

  const existing = await queryOne<User>('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing) {
    throw createError('Email đã được đăng ký', 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await queryOne<User>(
    `INSERT INTO users (email, password_hash, name, provider, email_verified)
     VALUES ($1, $2, $3, 'email', TRUE)
     RETURNING *`,
    [normalizedEmail, passwordHash, name || null]
  );

  if (!user) {
    throw createError('Không tạo được tài khoản', 500);
  }

  return toPublicUser(user);
}

/**
 * Login with email/password
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const normalizedEmail = email.trim();
  // Find user
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE email = $1',
    [normalizedEmail]
  );

  if (!user) {
    const error = new Error('Invalid email or password');
    (error as any).statusCode = 401;
    throw error;
  }

  // Check if user has password (not OAuth-only)
  if (!user.password_hash) {
    const error = new Error('Please login with Google');
    (error as any).statusCode = 401;
    throw error;
  }

  // Verify password
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    const error = new Error('Invalid email or password');
    (error as any).statusCode = 401;
    throw error;
  }

  if (user.account_locked) {
    const error = new Error('Tài khoản đã bị khóa');
    (error as any).statusCode = 403;
    throw error;
  }

  // Generate tokens
  const { accessToken, refreshToken, jti } = generateTokenPair(user.id, user.email);
  await storeRefreshToken(user.id, refreshToken, jti);

  return {
    user: toPublicUser(user),
    tokens: { accessToken, refreshToken },
  };
}

/**
 * Authenticate with Google ID token
 * Links to existing account if email matches
 */
export async function googleAuth(idToken: string): Promise<AuthResponse> {
  // Check if Google OAuth is configured
  if (!GOOGLE_CLIENT_ID) {
    const error = new Error('Google OAuth not configured');
    (error as any).statusCode = 503;
    throw error;
  }

  // Verify Google ID token
  let payload: GoogleUserPayload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const ticketPayload = ticket.getPayload();
    if (!ticketPayload || !ticketPayload.email) {
      throw new Error('Invalid token payload');
    }
    payload = {
      sub: ticketPayload.sub,
      email: ticketPayload.email,
      email_verified: ticketPayload.email_verified || false,
      name: ticketPayload.name,
      picture: ticketPayload.picture,
    };
  } catch (err) {
    const error = new Error('Invalid Google ID token');
    (error as any).statusCode = 401;
    throw error;
  }

  // Reject unverified emails
  if (!payload.email_verified) {
    const error = new Error('Google email not verified');
    (error as any).statusCode = 403;
    throw error;
  }

  // Find or create/link user
  const user = await linkOrCreateGoogleUser(payload);

  if (user.account_locked) {
    const error = new Error('Tài khoản đã bị khóa');
    (error as any).statusCode = 403;
    throw error;
  }

  // Generate tokens
  const { accessToken, refreshToken, jti } = generateTokenPair(user.id, user.email);
  await storeRefreshToken(user.id, refreshToken, jti);

  return {
    user: toPublicUser(user),
    tokens: { accessToken, refreshToken },
  };
}

/**
 * Link Google account to existing user or create new user
 */
async function linkOrCreateGoogleUser(payload: GoogleUserPayload): Promise<User> {
  // Check if user exists with this email
  const existing = await queryOne<User>(
    'SELECT * FROM users WHERE email = $1',
    [payload.email]
  );

  if (existing) {
    if (
      existing.provider === 'google' &&
      existing.provider_id &&
      existing.provider_id !== payload.sub
    ) {
      throw createError('This email is linked to a different Google account', 403);
    }

    // Link Google to existing account (if not already linked)
    if (!existing.provider_id) {
      const updated = await queryOne<User>(
        `UPDATE users SET
          provider = 'google',
          provider_id = $1,
          email_verified = TRUE,
          name = COALESCE(name, $2),
          avatar_url = COALESCE(avatar_url, $3)
         WHERE id = $4
         RETURNING *`,
        [payload.sub, payload.name, payload.picture, existing.id]
      );
      return updated || existing;
    }
    return existing;
  }

  // Create new user
  const newUser = await queryOne<User>(
    `INSERT INTO users (email, provider, provider_id, name, avatar_url, email_verified)
     VALUES ($1, 'google', $2, $3, $4, TRUE)
     RETURNING *`,
    [payload.email, payload.sub, payload.name || null, payload.picture || null]
  );

  if (!newUser) {
    throw new Error('Failed to create user');
  }

  return newUser;
}

/**
 * Refresh access token using refresh token
 * Implements token rotation (new refresh token issued)
 */
export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  // Verify refresh token signature
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    const error = new Error('Invalid refresh token');
    (error as any).statusCode = 401;
    throw error;
  }

  // Check if token is valid in database
  const isValid = await isRefreshTokenValid(decoded.jti);
  if (!isValid) {
    const error = new Error('Refresh token revoked or expired');
    (error as any).statusCode = 401;
    throw error;
  }

  // Get user
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE id = $1',
    [decoded.userId]
  );
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 401;
    throw error;
  }

  if (user.account_locked) {
    const error = new Error('Tài khoản đã bị khóa');
    (error as any).statusCode = 403;
    throw error;
  }

  // Revoke old refresh token
  await revokeRefreshToken(decoded.jti);

  // Generate new token pair (rotation)
  const { accessToken, refreshToken: newRefreshToken, jti } = generateTokenPair(user.id, user.email);
  await storeRefreshToken(user.id, newRefreshToken, jti);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout by revoking refresh token
 */
export async function logout(refreshToken: string): Promise<void> {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    await revokeRefreshToken(decoded.jti);
  } catch (err) {
    // Silent fail - token already invalid or expired
  }
}

/**
 * Get user by ID (for /me endpoint)
 */
export async function getUserById(userId: number): Promise<UserPublic | null> {
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );
  return user ? toPublicUser(user) : null;
}

/**
 * Cleanup expired refresh tokens (call periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await query<{ count: number }>(
    `DELETE FROM refresh_tokens WHERE expires_at < NOW() RETURNING id`
  );
  return result.length;
}

/** Thu hồi mọi refresh token của user (khi admin khóa tài khoản). */
export async function revokeAllRefreshTokensForUser(userId: number): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}
