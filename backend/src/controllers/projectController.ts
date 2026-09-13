import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { projectService } from '../services/projectService.js';
import { auditService } from '../services/auditService.js';

export const projectController = {
  async getProjectById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const project = (req as any).project; // Attached by requireProjectJurisdiction middleware

      await auditService.log({
        userId: user.id,
        action: 'viewed_project',
        entityType: 'PROJECT',
        entityId: project.id,
        ipAddress: req.ip || '127.0.0.1',
        sessionMetadata: { projectCode: project.project_code, district: project.district },
      });

      const detailed = await projectService.getProjectById(project.id);

      res.status(200).json({
        success: true,
        data: detailed || project,
      });
    } catch (err: any) {
      console.error('getProjectById error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve project details.',
      });
    }
  },

  async getProjectStageRisk(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const project = (req as any).project || (await projectService.getProjectById(req.params.id));
      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found.' });
        return;
      }

      // Check fields for Planning, Land Acquisition, and Compensation
      const cost = Number(project.estimated_cost_cr || project.cost || 0);
      const sector = project.sector || project.project_type || 'Infrastructure';
      const planningScore = Math.min(95, Math.max(15, (cost > 1000 ? 65 : 45)));

      const hasLandAcqData = project.acquisition_progress !== undefined && project.acquisition_progress !== null;
      const hasCompData = project.compensation_progress !== undefined && project.compensation_progress !== null;

      const stageRisk = {
        projectId: project.project_code || project.id,
        projectName: project.name || project.project_name,
        overallCoverage: (hasLandAcqData && hasCompData) ? 'COMPLETE' : 'INCOMPLETE',
        assessedCount: 1 + (hasLandAcqData ? 1 : 0) + (hasCompData ? 1 : 0),
        totalStages: 3,
        planning: {
          stage: 'Planning',
          status: 'ASSESSED',
          riskLevel: planningScore >= 70 ? 'HIGH' : planningScore >= 40 ? 'MEDIUM' : 'LOW',
          delayProbability: planningScore,
          factors: [`Corridor sector (${sector})`, `Project scale (${cost} Cr)`],
          recommendation: 'Complete pending inter-departmental statutory clearances and joint cadastral verification.',
          shapContributions: [
            { factor: 'Sector Complexity', percentage: 40, isPositive: true, description: `Alignment within ${sector}.` },
            { factor: 'Capital Outlay', percentage: 35, isPositive: cost > 1000, description: `Budget scale ${cost} Cr.` },
          ],
        },
        landAcquisition: hasLandAcqData
          ? {
              stage: 'Land Acquisition',
              status: 'ASSESSED',
              riskLevel: Number(project.acquisition_progress) < 50 ? 'HIGH' : 'MEDIUM',
              delayProbability: Math.round(100 - Number(project.acquisition_progress)),
              factors: [`Land acquisition progress at ${project.acquisition_progress}%`],
              recommendation: 'Convene Special CALA Review under DRO/Collector.',
              shapContributions: [],
            }
          : {
              stage: 'Land Acquisition',
              status: 'INSUFFICIENT_DATA',
              riskLevel: 'NOT ASSESSED',
              delayProbability: null,
              factors: [
                'Not Assessed — Insufficient Stage Data',
                'Land-specific records (Acquisition Progress %, Court Cases) are unavailable.',
              ],
              recommendation: 'Upload departmental land acquisition survey records to activate stage prediction.',
              shapContributions: [],
            },
        compensation: hasCompData
          ? {
              stage: 'Compensation',
              status: 'ASSESSED',
              riskLevel: Number(project.compensation_progress) < 50 ? 'HIGH' : 'MEDIUM',
              delayProbability: Math.round(100 - Number(project.compensation_progress)),
              factors: [`Compensation disbursement at ${project.compensation_progress}%`],
              recommendation: 'Expedite direct bank transfer (DBT) disbursement.',
              shapContributions: [],
            }
          : {
              stage: 'Compensation',
              status: 'INSUFFICIENT_DATA',
              riskLevel: 'NOT ASSESSED',
              delayProbability: null,
              factors: [
                'Not Assessed — Insufficient Stage Data',
                'Compensation status and disbursement records are unavailable.',
              ],
              recommendation: 'Upload verified compensation disbursement schedules to activate stage prediction.',
              shapContributions: [],
            },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(stageRisk);
    } catch (err: any) {
      console.error('getProjectStageRisk error:', err);
      res.status(500).json({ success: false, message: 'Failed to evaluate stage risk.' });
    }
  },

  async getProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const projects = await projectService.getProjectsForUser(user);

      res.status(200).json({
        success: true,
        count: projects.length,
        jurisdiction: user.district,
        data: projects,
      });
    } catch (err: any) {
      console.error('getProjects error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve projects.',
      });
    }
  },
};
