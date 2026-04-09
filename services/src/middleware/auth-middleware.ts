import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt-utils';
import { createError } from './error-handler';
import { queryOne } from '../config/db';

// ============================================
// Auth Middleware
// ============================================

/**
 * Require valid access token in Authorization header
 * Attaches decoded payload to req.user
 * @throws 401 if token missing or invalid; 403 if account locked
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No token provided', 401);
    }

    const token = authHeader.substring(7);

    const payload = verifyAccessToken(token);

    const row = await queryOne<{ account_locked: boolean }>(
      `SELECT account_locked FROM users WHERE id = $1`,
      [payload.userId]
    );
    if (!row) {
      throw createError('User not found', 401);
    }
    if (row.account_locked) {
      throw createError('Tài khoản đã bị khóa', 403);
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (err: any) {
    if (err?.statusCode) {
      next(err);
      return;
    }
    if (err.name === 'JsonWebTokenError') {
      next(createError('Invalid token', 401));
    } else if (err.name === 'TokenExpiredError') {
      next(createError('Token expired', 401));
    } else {
      next(err);
    }
  }
}

/**
 * Optional auth - doesn't fail if no token
 * Attaches user to req.user if valid token present
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (err) {
    // Invalid token - continue without user
    next();
  }
}
