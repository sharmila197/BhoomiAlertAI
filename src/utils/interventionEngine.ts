import { Project } from '../types';

export interface ProjectInterventionItem {
  id: string;
  projectId: string;
  projectName: string;
  district: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  mainIssue: string;
  recommendedAction: string;
  delayDays: number;
  progress: number | null;
  courtCases: number;
  pendingCompensationDays: number;
}

/**
 * Evaluates a single project against the 8 Intervention Rules.
 * Returns a ProjectInterventionItem if any rule triggers, or null otherwise.
 */
export function evaluateProjectIntervention(project: Project): ProjectInterventionItem | null {
  const triggeredActions: string[] = [];
  const triggeredIssues: string[] = [];

  const rawProg =
    project.landAcquisitionProgressPercent !== undefined &&
    project.landAcquisitionProgressPercent !== null
      ? project.landAcquisitionProgressPercent
      : project.acquisitionProgress;
  const progress: number | null =
    rawProg !== null && rawProg !== undefined && !isNaN(rawProg) ? rawProg : null;

  const courtCases = project.courtCases ?? project.legalDisputes ?? 0;
  const compStatus = String(project.compensationStatus || project.status || '').trim();
  const compStatusLower = compStatus.toLowerCase();
  const pendingDays = project.pendingCompensationDays ?? 0;
  const rrStatus = String(project.rrStatus || '').trim().toLowerCase();
  const docStatus = String(project.documentationStatus || '').trim().toLowerCase();
  const surveyStatus = String(project.surveyStatus || '').trim().toLowerCase();
  const delayedStr = String(project.delayed || '').trim().toLowerCase();
  const delayDays = project.delayDays ?? 0;

  // RULE 1 — LAND ACQUISITION: Land_Acquisition_Progress_Percent < 60
  // ONLY trigger if progress is a genuine numeric value. Missing live PPPIN data must NOT be treated as 0 or low progress!
  if (progress !== null && progress < 60) {
    triggeredActions.push('Prioritize land acquisition review and accelerate pending parcel acquisition.');
    triggeredIssues.push('Low land acquisition progress');
  }

  // RULE 2 — COURT CASES: Court_Cases > 0
  if (courtCases > 0) {
    triggeredActions.push('Review pending legal disputes and initiate appropriate dispute-resolution action.');
    triggeredIssues.push(courtCases === 1 ? '1 court case' : `${courtCases} court cases`);
  }

  // RULE 3 — COMPENSATION: Compensation_Status = "Pending" OR "Disputed"
  if (['pending', 'disputed'].includes(compStatusLower)) {
    triggeredActions.push("Review compensation status and expedite Collector's Award / compensation resolution.");
    triggeredIssues.push(`Compensation ${compStatusLower === 'pending' ? 'pending' : 'disputed'}`);
  }

  // RULE 4 — PENDING COMPENSATION: Pending_Compensation_Days > 60
  if (pendingDays > 60) {
    triggeredActions.push('Prioritize pending compensation cases and track resolution timeline.');
    triggeredIssues.push(`Compensation pending ${pendingDays} days`);
  }

  // RULE 5 — R&R: R_and_R_Status = "Delayed" OR "Stalled" OR "Pending"
  if (['delayed', 'stalled', 'pending'].includes(rrStatus)) {
    triggeredActions.push('Review R&R implementation and expedite pending rehabilitation and resettlement activities.');
    triggeredIssues.push(`R&R ${rrStatus}`);
  }

  // RULE 6 — DOCUMENTATION: Documentation_Status = "Incomplete" OR "Pending"
  if (['incomplete', 'pending'].includes(docStatus)) {
    triggeredActions.push('Complete pending land-acquisition documentation and verify required records.');
    triggeredIssues.push(`Documentation ${docStatus}`);
  }

  // RULE 7 — SURVEY: Survey_Status = "Delayed" OR "Pending"
  if (['delayed', 'pending'].includes(surveyStatus)) {
    triggeredActions.push('Expedite land survey activities and resolve pending survey issues.');
    triggeredIssues.push(`Survey ${surveyStatus}`);
  }

  // RULE 8 — DELAY: Delayed = "Yes" AND Delay_Days > 0
  if ((delayedStr === 'yes' || delayedStr === 'true' || delayDays > 0) && delayDays > 0) {
    triggeredActions.push('Review the project timeline and initiate corrective action for the identified delay.');
    triggeredIssues.push(`Delayed by ${delayDays} days`);
  }

  // If no rules triggered, no intervention needed
  if (triggeredActions.length === 0) {
    return null;
  }

  // Normalize risk level
  const rL = (project.riskLevel || 'LOW').toUpperCase();
  const normalizedRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
    rL === 'HIGH' || rL === 'CRITICAL' ? 'HIGH' : rL === 'MEDIUM' || rL === 'MODERATE' ? 'MEDIUM' : 'LOW';

  // Format main issue cleanly
  let mainIssue = '';
  if (triggeredIssues.length === 1) {
    mainIssue = triggeredIssues[0];
  } else if (triggeredIssues.length === 2) {
    mainIssue = `${triggeredIssues[0]} + ${triggeredIssues[1]}`;
  } else {
    mainIssue = `${triggeredIssues[0]} + ${triggeredIssues[1]} (+${triggeredIssues.length - 2} more)`;
  }

  return {
    id: `int-${project.id}`,
    projectId: project.id,
    projectName: project.name || project.projectName || `Project ${project.id}`,
    district: project.district || 'Tamil Nadu',
    riskLevel: normalizedRiskLevel,
    mainIssue,
    recommendedAction: triggeredActions[0], // Highest priority triggered action
    delayDays,
    progress,
    courtCases,
    pendingCompensationDays: pendingDays,
  };
}

/**
 * Generates prioritized project interventions for an entire dataset.
 * Priority ranking:
 * 1. HIGH RISK -> MEDIUM RISK -> LOW RISK
 * 2. Higher Delay_Days
 * 3. Lower Land_Acquisition_Progress_Percent
 * 4. Higher Court_Cases
 * 5. Higher Pending_Compensation_Days
 *
 * Caps at maximum 20 items.
 */
export function generateProjectInterventions(projects: Project[], maxItems: number = 20): ProjectInterventionItem[] {
  const interventions: ProjectInterventionItem[] = [];

  for (const p of projects) {
    const item = evaluateProjectIntervention(p);
    if (item) {
      interventions.push(item);
    }
  }

  const riskRank = (r: 'HIGH' | 'MEDIUM' | 'LOW') => {
    if (r === 'HIGH') return 3;
    if (r === 'MEDIUM') return 2;
    if (r === 'LOW') return 1;
    return 0;
  };

  interventions.sort((a, b) => {
    // 1. Risk Level
    const rDiff = riskRank(b.riskLevel) - riskRank(a.riskLevel);
    if (rDiff !== 0) return rDiff;

    // 2. Higher Delay Days
    const dDiff = (b.delayDays || 0) - (a.delayDays || 0);
    if (dDiff !== 0) return dDiff;

    // 3. Lower Land Acquisition Progress (valid percentages sorted ascending; unavailable placed last)
    if (a.progress !== null && b.progress !== null) {
      const pDiff = a.progress - b.progress;
      if (pDiff !== 0) return pDiff;
    } else if (a.progress !== null && b.progress === null) {
      return -1;
    } else if (a.progress === null && b.progress !== null) {
      return 1;
    }

    // 4. Higher Court Cases
    const cDiff = (b.courtCases || 0) - (a.courtCases || 0);
    if (cDiff !== 0) return cDiff;

    // 5. Higher Pending Compensation Days
    const pcDiff = (b.pendingCompensationDays || 0) - (a.pendingCompensationDays || 0);
    return pcDiff;
  });

  return interventions.slice(0, maxItems);
}
