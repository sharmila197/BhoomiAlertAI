import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { auditService } from '../services/auditService.js';

const router = Router();

router.get('/', authenticateUser, requireRole('SUPER_ADMIN'), async (_req: AuthenticatedRequest, res: Response) => {
  const logs = await auditService.getRecentLogs(100);
  res.status(200).json({
    success: true,
    data: logs,
  });
});

export default router;
