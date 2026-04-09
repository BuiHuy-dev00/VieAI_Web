import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

// ============================================
// Environment Configuration
// ============================================

// Validate required secrets in production
const NODE_ENV = process.env.NODE_ENV || 'development';
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (NODE_ENV === 'production' && (!ACCESS_SECRET || !REFRESH_SECRET)) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in production');
}

// Use dev defaults only in development
const EFFECTIVE_ACCESS_SECRET = ACCESS_SECRET || 'dev-access-secret-change-me-32chars';
const EFFECTIVE_REFRESH_SECRET = REFRESH_SECRET || 'dev-refresh-secret-change-me-32chars';
const ACCESS_EXPIRES = (process.env.JWT_ACCESS_EXPIRES || '24h') as string;
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES || '7d') as string;

// ============================================
// Token Generation
// ============================================

/**
 * Generate access token (short-lived, for API auth)
 */
export function generateAccessToken(userId: number, email: string): string {
  const payload = { userId, email };
  return jwt.sign(payload, EFFECTIVE_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as any);
}

/**
 * Generate refresh token with unique jti (for rotation tracking)
 */
export function generateRefreshToken(userId: number): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const payload = { userId, jti };
  const token = jwt.sign(payload, EFFECTIVE_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as any);
  return { token, jti };
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(
  userId: number,
  email: string
): { accessToken: string; refreshToken: string; jti: string } {
  const accessToken = generateAccessToken(userId, email);
  const { token: refreshToken, jti } = generateRefreshToken(userId);
  return { accessToken, refreshToken, jti };
}

// ============================================
// Token Verification
// ============================================

export interface AccessTokenPayload extends JwtPayload {
  userId: number;
  email: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  userId: number;
  jti: string;
}

/**
 * Verify access token and return payload
 * @throws JsonWebTokenError if invalid
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, EFFECTIVE_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Verify refresh token and return payload
 * @throws JsonWebTokenError if invalid
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, EFFECTIVE_REFRESH_SECRET) as RefreshTokenPayload;
}

// ============================================
// Token Hashing (for DB storage)
// ============================================

/**
 * Hash refresh token using SHA-256 (RFC 6819 compliant)
 * Suitable for high-entropy tokens, faster than bcrypt
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify token against stored hash
 */
export function verifyTokenHash(token: string, storedHash: string): boolean {
  const hash = hashToken(token);
  const a = Buffer.from(hash, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

// ============================================
// Expiration Helpers
// ============================================

/**
 * Calculate refresh token expiration date
 */
export function getRefreshExpiration(): Date {
  const ms = parseExpiry(REFRESH_EXPIRES);
  return new Date(Date.now() + ms);
}

/**
 * Parse expiry string (e.g., '15m', '7d') to milliseconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}
