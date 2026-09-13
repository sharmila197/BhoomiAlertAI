import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { newDb } from 'pg-mem';
import { ENV } from '../config/env.js';
import { getSeedData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DbAdapter {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }>;
  isMem: boolean;
}

let dbInstance: DbAdapter | null = null;

export async function initDb(): Promise<DbAdapter> {
  if (dbInstance) return dbInstance;

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Try real PostgreSQL if DATABASE_URL is configured
  if (ENV.DATABASE_URL) {
    try {
      console.log('Connecting to PostgreSQL database at:', ENV.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
      const pool = new pg.Pool({
        connectionString: ENV.DATABASE_URL,
        ssl: ENV.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      });

      // Probe connection
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        console.log('Successfully connected to external PostgreSQL database.');

        // Run DDL schema
        await client.query(schemaSql);
        console.log('PostgreSQL schema applied successfully.');

        dbInstance = {
          query: (text: string, params?: any[]) => pool.query(text, params),
          isMem: false,
        };

        await seedDbIfEmpty(dbInstance);
        return dbInstance;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('Could not connect to PostgreSQL via DATABASE_URL:', err?.message);
      console.log('Falling back to local in-memory PostgreSQL engine (pg-mem)...');
    }
  }

  // Fallback to in-memory PostgreSQL engine
  console.log('Initializing in-memory PostgreSQL engine (pg-mem)...');
  const memDb = newDb();

  // Handle CURRENT_TIMESTAMP and common PG extensions
  memDb.public.registerFunction({
    name: 'now',
    returns: memDb.public.getType('timestamp with time zone'),
    implementation: () => new Date(),
  });

  const adapter = memDb.adapters.createPg();
  const pool = new adapter.Pool();

  // Execute schema
  await pool.query(schemaSql);
  console.log('In-memory PostgreSQL schema applied successfully.');

  dbInstance = {
    query: (text: string, params?: any[]) => pool.query(text, params),
    isMem: true,
  };

  await seedDbIfEmpty(dbInstance);
  return dbInstance;
}

async function seedDbIfEmpty(db: DbAdapter) {
  const usersCheck = await db.query('SELECT COUNT(*) as count FROM users');
  const userCount = parseInt(usersCheck.rows[0]?.count || '0', 10);

  if (userCount === 0) {
    console.log('Seeding initial prototype database records...');
    const seed = await getSeedData();

    // 1. Districts
    for (const d of seed.districts) {
      await db.query(
        'INSERT INTO districts (id, name, state, status) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [d.id, d.name, d.state, d.status]
      );
    }

    // 2. Users
    for (const u of seed.users) {
      await db.query(
        `INSERT INTO users (id, official_id, name, email, password_hash, role, department, state, district, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
         ON CONFLICT (official_id) DO NOTHING`,
        [u.id, u.official_id, u.name, u.email, u.password_hash, u.role, u.department, u.state, u.district, u.status]
      );
    }

    // 3. Projects
    for (const p of seed.projects) {
      await db.query(
        `INSERT INTO projects (id, project_code, project_name, authority, state, district, corridor, current_stage, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (project_code) DO NOTHING`,
        [p.id, p.project_code, p.project_name, p.authority, p.state, p.district, p.corridor, p.current_stage, p.status]
      );
    }

    // 4. Parcels
    for (const pcl of seed.parcels) {
      await db.query(
        `INSERT INTO parcels (id, parcel_code, project_id, district, village, current_stage, risk_score, risk_level, predicted_delay_days, litigation_status, compensation_status, documentation_status, survey_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (parcel_code) DO NOTHING`,
        [
          pcl.id,
          pcl.parcel_code,
          pcl.project_id,
          pcl.district,
          pcl.village,
          pcl.current_stage,
          pcl.risk_score,
          pcl.risk_level,
          pcl.predicted_delay_days,
          pcl.litigation_status,
          pcl.compensation_status,
          pcl.documentation_status,
          pcl.survey_status,
        ]
      );
    }

    // 5. Project Assignments
    for (const pa of seed.projectAssignments) {
      await db.query(
        `INSERT INTO project_assignments (id, user_id, project_id, assigned_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, project_id) DO NOTHING`,
        [pa.id, pa.user_id, pa.project_id]
      );
    }

    // 6. Parcel Assignments
    for (const pca of seed.parcelAssignments) {
      await db.query(
        `INSERT INTO parcel_assignments (id, user_id, parcel_id, assigned_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, parcel_id) DO NOTHING`,
        [pca.id, pca.user_id, pca.parcel_id]
      );
    }

    // 7. Predictions
    if (seed.predictions) {
      for (const pr of seed.predictions) {
        await db.query(
          `INSERT INTO predictions (id, parcel_id, project_id, risk_score, risk_level, predicted_delay_days, factors, explanation, model_type, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO NOTHING`,
          [pr.id, pr.parcel_id, pr.project_id, pr.risk_score, pr.risk_level, pr.predicted_delay_days, pr.factors, pr.explanation, pr.model_type]
        );
      }
    }

    // 8. Interventions
    if (seed.interventions) {
      for (const inv of seed.interventions) {
        await db.query(
          `INSERT INTO interventions (
            id, intervention_code, parcel_id, project_id, prediction_id, intervention_type, title, description,
            priority, responsible_department, responsible_role, recommended_action, status, created_by,
            approved_by, approved_at, due_date, completed_at, rejection_reason, completion_notes, delay_avoided_days, outcome_indicator,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO NOTHING`,
          [
            inv.id, inv.intervention_code, inv.parcel_id, inv.project_id, inv.prediction_id, inv.intervention_type, inv.title, inv.description,
            inv.priority, inv.responsible_department, inv.responsible_role, inv.recommended_action, inv.status, inv.created_by,
            inv.approved_by, inv.approved_at, inv.due_date, inv.completed_at, inv.rejection_reason, inv.completion_notes, inv.delay_avoided_days, inv.outcome_indicator
          ]
        );
      }
    }

    // 9. Intervention Events
    if (seed.interventionEvents) {
      for (const evt of seed.interventionEvents) {
        await db.query(
          `INSERT INTO intervention_events (id, intervention_id, event_type, previous_status, new_status, performed_by, note, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO NOTHING`,
          [evt.id, evt.intervention_id, evt.event_type, evt.previous_status, evt.new_status, evt.performed_by, evt.note]
        );
      }
    }

    // 10. Notifications
    if (seed.notifications) {
      for (const n of seed.notifications) {
        await db.query(
          `INSERT INTO notifications (id, user_id, intervention_id, title, message, notification_type, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO NOTHING`,
          [n.id, n.user_id, n.intervention_id, n.title, n.message, n.notification_type, n.is_read]
        );
      }
    }

    console.log('Database seeding completed successfully.');
  }
}

export async function getDb(): Promise<DbAdapter> {
  if (!dbInstance) {
    return await initDb();
  }
  return dbInstance;
}
