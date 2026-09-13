import { getDb } from '../db/index.js';
import { SafeUser } from '../types/index.js';

export const parcelService = {
  async getParcelById(parcelId: string) {
    const db = await getDb();
    const result = await db.query(
      `SELECT pcl.*, prj.project_name, prj.project_code, prj.authority
       FROM parcels pcl
       JOIN projects prj ON pcl.project_id = prj.id
       WHERE pcl.id = $1 OR pcl.parcel_code = $1`,
      [parcelId]
    );
    return result.rows[0] || null;
  },

  async getParcelsForUser(user: SafeUser, projectId?: string) {
    const db = await getDb();

    // SUPER_ADMIN can view all parcels
    if (user.role === 'SUPER_ADMIN' || user.district === 'ALL') {
      let query = `
        SELECT pcl.*, prj.project_name, prj.project_code
        FROM parcels pcl
        JOIN projects prj ON pcl.project_id = prj.id
      `;
      const params: any[] = [];
      if (projectId) {
        query += ' WHERE pcl.project_id = $1 OR prj.project_code = $1';
        params.push(projectId);
      }
      query += ' ORDER BY pcl.parcel_code ASC';
      const result = await db.query(query, params);
      return result.rows;
    }

    // District officers can only access parcels in their jurisdiction
    let query = `
      SELECT pcl.*, prj.project_name, prj.project_code,
        CASE WHEN pa.id IS NOT NULL THEN true ELSE false END as is_assigned
      FROM parcels pcl
      JOIN projects prj ON pcl.project_id = prj.id
      LEFT JOIN parcel_assignments pa ON pa.parcel_id = pcl.id AND pa.user_id = $2
      WHERE LOWER(pcl.district) = LOWER($1)
    `;
    const params: any[] = [user.district, user.id];

    if (projectId) {
      query += ' AND (pcl.project_id = $3 OR prj.project_code = $3)';
      params.push(projectId);
    }

    query += ' ORDER BY pcl.parcel_code ASC';
    const result = await db.query(query, params);
    return result.rows;
  },
};
