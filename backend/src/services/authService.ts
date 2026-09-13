import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { getDb } from '../db/index.js';
import { SafeUser, UserRecord } from '../types/index.js';
import { auditService } from './auditService.js';

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const authService = {
  async login(officialId: string, plainPassword: string, ipAddress: string, userAgent?: string) {
    if (!officialId || !plainPassword) {
      throw new AuthError('Official ID and Password are required.', 400);
    }

    const cleanOfficialId = officialId.trim();
    const db = await getDb();

    // Query user by official_id
    const userResult = await db.query(
      'SELECT * FROM users WHERE official_id = $1',
      [cleanOfficialId]
    );

    if (userResult.rows.length === 0) {
      await auditService.log({
        action: 'failed_login',
        entityType: 'AUTH',
        ipAddress,
        sessionMetadata: { reason: 'UNKNOWN_OFFICIAL_ID', attemptedId: cleanOfficialId, userAgent },
      });
      throw new AuthError('Invalid Official ID or Password.', 401);
    }

    const user: UserRecord = userResult.rows[0];

    // Status check
    if (user.status !== 'ACTIVE') {
      await auditService.log({
        userId: user.id,
        action: 'failed_login',
        entityType: 'AUTH',
        ipAddress,
        sessionMetadata: { reason: 'ACCOUNT_INACTIVE', officialId: cleanOfficialId },
      });
      throw new AuthError('Account is inactive. Please contact system administrator.', 403);
    }

    // Bcrypt comparison
    const isPasswordValid = await bcrypt.compare(plainPassword, user.password_hash);
    if (!isPasswordValid) {
      await auditService.log({
        userId: user.id,
        action: 'failed_login',
        entityType: 'AUTH',
        ipAddress,
        sessionMetadata: { reason: 'INVALID_CREDENTIALS', officialId: cleanOfficialId },
      });
      throw new AuthError('Invalid Official ID or Password.', 401);
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        officialId: user.official_id,
        role: user.role,
        district: user.district,
        state: user.state,
      },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN as any }
    );

    // Audit log
    await auditService.log({
      userId: user.id,
      action: 'login',
      entityType: 'AUTH',
      ipAddress,
      sessionMetadata: { role: user.role, district: user.district, userAgent },
    });

    // Sanitized user object without password_hash
    const safeUser: SafeUser = {
      id: user.id,
      official_id: user.official_id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      state: user.state,
      district: user.district,
      status: user.status,
      created_at: user.created_at,
      last_login: new Date().toISOString(),
    };

    return {
      token,
      user: safeUser,
    };
  },

  async logout(user: SafeUser, ipAddress: string) {
    await auditService.log({
      userId: user.id,
      action: 'logout',
      entityType: 'AUTH',
      ipAddress,
      sessionMetadata: { role: user.role },
    });
    return { success: true, message: 'Logged out successfully.' };
  },

  async getCurrentUser(userId: string): Promise<SafeUser> {
    const db = await getDb();
    const result = await db.query(
      `SELECT id, official_id, name, email, role, department, state, district, status, created_at, last_login
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AuthError('User not found.', 404);
    }

    return result.rows[0];
  },
};
