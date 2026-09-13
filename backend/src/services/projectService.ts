import { getDb } from '../db/index.js';
import { SafeUser } from '../types/index.js';

export const projectService = {
  async getProjectById(projectId: string) {
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM projects WHERE id = $1 OR project_code = $1',
      [projectId]
    );
    if (result.rows.length === 0) return null;
    const project = result.rows[0];

    const parcelCountRes = await db.query(
      'SELECT COUNT(*) as count FROM parcels WHERE project_id = $1',
      [project.id]
    );
    const assignCountRes = await db.query(
      'SELECT COUNT(*) as count FROM project_assignments WHERE project_id = $1',
      [project.id]
    );

    return {
      ...project,
      parcel_count: parseInt(parcelCountRes.rows[0]?.count || '0', 10),
      assigned_officers_count: parseInt(assignCountRes.rows[0]?.count || '0', 10),
    };
  },

  async getProjectsForUser(user: SafeUser) {
    const db = await getDb();

    // SUPER_ADMIN can view all projects across all districts
    if (user.role === 'SUPER_ADMIN' || user.district === 'ALL') {
      const result = await db.query(
        'SELECT * FROM projects ORDER BY project_code ASC'
      );
      return result.rows;
    }

    // District-based filtering for district officers
    const result = await db.query(
      'SELECT * FROM projects WHERE LOWER(district) = LOWER($1) ORDER BY project_code ASC',
      [user.district]
    );
    return result.rows;
  },
};
