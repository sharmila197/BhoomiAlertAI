import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { parcelService } from '../services/parcelService.js';
import { auditService } from '../services/auditService.js';

export const parcelController = {
  async getParcelById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const parcel = (req as any).parcel; // Attached by requireParcelJurisdiction middleware

      await auditService.log({
        userId: user.id,
        action: 'viewed_parcel',
        entityType: 'PARCEL',
        entityId: parcel.id,
        ipAddress: req.ip || '127.0.0.1',
        sessionMetadata: { parcelCode: parcel.parcel_code, district: parcel.district },
      });

      const detailed = await parcelService.getParcelById(parcel.id);

      res.status(200).json({
        success: true,
        data: detailed || parcel,
      });
    } catch (err: any) {
      console.error('getParcelById error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve parcel details.',
      });
    }
  },

  async getParcels(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const projectId = req.query.projectId as string | undefined;
      const parcels = await parcelService.getParcelsForUser(user, projectId);

      res.status(200).json({
        success: true,
        count: parcels.length,
        jurisdiction: user.district,
        data: parcels,
      });
    } catch (err: any) {
      console.error('getParcels error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve parcels.',
      });
    }
  },
};
