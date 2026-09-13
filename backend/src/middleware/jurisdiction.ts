import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { getDb } from '../db/index.js';
import { auditService } from '../services/auditService.js';

/**
 * Middleware ensuring the authenticated user is authorized to access the specific project by ID or project_code.
 * - SUPER_ADMIN has full state-wide jurisdiction (ALL districts).
 * - District-level officers (CALA, PROJECT_DIRECTOR, REVENUE_OFFICER, LEGAL_OFFICER)
 *   can ONLY access projects matching their assigned district and/or specific project assignments.
 * - Any cross-jurisdiction attempt (e.g. CALA Erode querying Salem) is denied with HTTP 403 / 404
 *   and recorded in the audit log as an unauthorized access attempt.
 */
export async function requireProjectJurisdiction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const projectIdOrCode = req.params.id;
  if (!projectIdOrCode) {
    res.status(400).json({ success: false, message: 'Project identifier is required.' });
    return;
  }

  const db = await getDb();
  const projResult = await db.query(
    'SELECT * FROM projects WHERE id = $1 OR project_code = $1',
    [projectIdOrCode]
  );

  if (projResult.rows.length === 0) {
    res.status(404).json({ success: false, message: 'Project not found.' });
    return;
  }

  const project = projResult.rows[0];

  // 1. SUPER_ADMIN has access to all records
  if (user.role === 'SUPER_ADMIN' || user.district === 'ALL') {
    (req as any).project = project;
    next();
    return;
  }

  // 2. Strict district matching
  const isSameDistrict = user.district.toLowerCase() === project.district.toLowerCase();

  // 3. Assignment verification
  const assignResult = await db.query(
    'SELECT * FROM project_assignments WHERE user_id = $1 AND project_id = $2',
    [user.id, project.id]
  );
  const isAssigned = assignResult.rows.length > 0;

  // Authorization policy: User must match district, and for specialized roles (CALA), can be checked against assignments
  if (!isSameDistrict) {
    await auditService.log({
      userId: user.id,
      action: 'unauthorized_access_attempt',
      entityType: 'PROJECT',
      entityId: project.id,
      ipAddress: req.ip || '127.0.0.1',
      sessionMetadata: {
        reason: 'CROSS_DISTRICT_VIOLATION',
        userDistrict: user.district,
        projectDistrict: project.district,
        requestedId: projectIdOrCode,
      },
    });

    res.status(403).json({
      success: false,
      message: `Access denied. You do not have jurisdiction over projects in district '${project.district}'.`,
    });
    return;
  }

  (req as any).project = project;
  (req as any).isAssigned = isAssigned;
  next();
}

/**
 * Middleware ensuring the authenticated user is authorized to access the specific parcel.
 * Blocks IDOR attacks where a user changes parcel ID in the URL.
 */
export async function requireParcelJurisdiction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const parcelIdOrCode = req.params.parcelId || req.params.id;
  if (!parcelIdOrCode) {
    res.status(400).json({ success: false, message: 'Parcel identifier is required.' });
    return;
  }

  const db = await getDb();
  const parcelResult = await db.query(
    `SELECT p.*, prj.project_name, prj.project_code
     FROM parcels p
     JOIN projects prj ON p.project_id = prj.id
     WHERE p.id = $1 OR p.parcel_code = $1`,
    [parcelIdOrCode]
  );

  if (parcelResult.rows.length === 0) {
    res.status(404).json({ success: false, message: 'Parcel not found.' });
    return;
  }

  const parcel = parcelResult.rows[0];

  // 1. SUPER_ADMIN has access to all records
  if (user.role === 'SUPER_ADMIN' || user.district === 'ALL') {
    (req as any).parcel = parcel;
    next();
    return;
  }

  // 2. Strict district matching
  const isSameDistrict = user.district.toLowerCase() === parcel.district.toLowerCase();

  if (!isSameDistrict) {
    await auditService.log({
      userId: user.id,
      action: 'unauthorized_access_attempt',
      entityType: 'PARCEL',
      entityId: parcel.id,
      ipAddress: req.ip || '127.0.0.1',
      sessionMetadata: {
        reason: 'CROSS_DISTRICT_IDOR_VIOLATION',
        userDistrict: user.district,
        parcelDistrict: parcel.district,
        requestedId: parcelIdOrCode,
      },
    });

    res.status(403).json({
      success: false,
      message: `Access denied. You do not have jurisdiction over parcels in district '${parcel.district}'.`,
    });
    return;
  }

  (req as any).parcel = parcel;
  next();
}
