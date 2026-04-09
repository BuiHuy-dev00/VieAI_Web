import { Request } from 'express';
import { verifyAccessToken } from '../utils/jwt-utils';
import type { AuthenticatedUser } from '../types/auth-types';
import { createError } from './error-handler';
import { queryOne } from '../config/db';

type UserAuthRow = { account_locked: boolean; is_admin: boolean };

/**
 * tsoa Authentication Handler
 *
 * - `jwt`: Bearer token, user không bị khóa
 * - `jwt_admin`: Bearer token + user có is_admin = true
 */
export async function expressAuthentication(
  request: Request,
  securityName: string,
  _scopes?: string[]
): Promise<AuthenticatedUser> {
  const authHeader = request.headers.authorization;

  if (securityName === 'jwt' || securityName === 'jwt_admin') {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No token provided', 401);
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyAccessToken(token);

      const row = await queryOne<UserAuthRow>(
        `SELECT account_locked, COALESCE(is_admin, FALSE) AS is_admin FROM users WHERE id = $1`,
        [payload.userId]
      );
      if (!row) {
        throw createError('User not found', 401);
      }
      if (row.account_locked) {
        throw createError('Tài khoản đã bị khóa', 403);
      }

      if (securityName === 'jwt_admin' && !row.is_admin) {
        throw createError('Forbidden', 403);
      }

      return {
        userId: payload.userId,
        email: payload.email,
      };
    } catch (err: any) {
      if (err?.statusCode) throw err;
      if (err.name === 'JsonWebTokenError') {
        throw createError('Invalid token', 401);
      } else if (err.name === 'TokenExpiredError') {
        throw createError('Token expired', 401);
      }
      throw err;
    }
  }

  throw new Error(`Unknown security scheme: ${securityName}`);
}
