import { Router } from 'express';
import { parcelController } from '../controllers/parcelController.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireParcelJurisdiction } from '../middleware/jurisdiction.js';

const router = Router();

router.get('/', authenticateUser, parcelController.getParcels);
router.get('/:id', authenticateUser, requireParcelJurisdiction, parcelController.getParcelById);

export default router;
