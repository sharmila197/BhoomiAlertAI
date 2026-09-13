import { Router } from 'express';
import { projectController } from '../controllers/projectController.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireProjectJurisdiction } from '../middleware/jurisdiction.js';

const router = Router();

router.get('/', authenticateUser, projectController.getProjects);
router.get('/:id/stage-risk', authenticateUser, requireProjectJurisdiction, projectController.getProjectStageRisk);
router.get('/:id', authenticateUser, requireProjectJurisdiction, projectController.getProjectById);

export default router;
