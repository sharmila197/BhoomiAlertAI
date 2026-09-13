import { getDb } from '../db/index.js';
import crypto from 'crypto';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'viewed_project'
  | 'viewed_parcel'
  | 'unauthorized_access_attempt'
  | 'intervention_generated'
  | 'intervention_viewed'
  | 'intervention_approved'
  | 'intervention_rejected'
  | 'intervention_dispatched'
  | 'intervention_status_updated'
  | 'intervention_escalated'
  | 'intervention_completed';

export interface AuditParams {
  userId?: string | null;
  action: AuditAction | string;
  entityType: 'AUTH' | 'PROJECT' | 'PARCEL' | 'INTERVENTION' | 'SYSTEM' | string;
  entityId?: string | null;
  ipAddress: string;
  sessionMetadata?: Record<string, any> | string;
  dbClient?: any;
}

export const auditService = {
  async log(params: AuditParams): Promise<void> {
    try {
      const db = params.dbClient || (await getDb());
      const id = `aud-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const metadata =
        typeof params.sessionMetadata === 'object'
          ? JSON.stringify(params.sessionMetadata)
          : params.sessionMetadata || null;

      await db.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, timestamp, ip_address, session_metadata)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)`,
        [
          id,
          params.userId || null,
          params.action,
          params.entityType,
          params.entityId || null,
          params.ipAddress || '127.0.0.1',
          metadata,
        ]
      );
    } catch (err: any) {
      console.error('Audit logging error:', err?.message);
    }
  },

  async getRecentLogs(limit = 50) {
    const db = await getDb();
    const result = await db.query(
      `SELECT a.*, u.official_id, u.name as user_name, u.role as user_role
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.timestamp DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },
};
