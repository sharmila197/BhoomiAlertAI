import { RiskLevel, ShapContribution, Recommendation } from '../types';

export interface CalculatedRisk {
  riskScore: number;
  delayProbability: number;
  riskLevel: RiskLevel;
  expectedDelayMonths: number;
  riskFactors: string[];
  recommendations: Recommendation[];
  shapContributions: ShapContribution[];
  explanation: string;
}

/**
 * Calculates project risk score (0-100) using the modular multi-factor risk weighting formula:
 *
 * Risk Score =
 *   0.30 × Compensation Risk +
 *   0.20 × Legal Risk +
 *   0.15 × Approval Risk +
 *   0.15 × R&R Risk +
 *   0.10 × Documentation Risk +
 *   0.10 × Stakeholder Risk
 *
 * Delay Probability (%) = Risk Score
 * Risk Level:
 *   0–39  = LOW
 *   40–69 = MEDIUM
 *   70–100 = HIGH
 */
export function calculateProjectRisk(data: {
  compensationProgress?: number;
  legalDisputes?: number;
  approvalProgress?: number;
  rrProgress?: number;
  documentationProgress?: number;
  stakeholderResponsiveness?: number;
  acquisitionProgress?: number | null;
  district?: string;
  projectName?: string;
  projectId?: string;
}): CalculatedRisk {
  const compProg = Math.max(0, Math.min(100, Number(data.compensationProgress ?? 50)));
  const legalCount = Math.max(0, Number(data.legalDisputes ?? 0));
  const appProg = Math.max(0, Math.min(100, Number(data.approvalProgress ?? 50)));
  const rrProg = Math.max(0, Math.min(100, Number(data.rrProgress ?? 50)));
  const docProg = Math.max(0, Math.min(100, Number(data.documentationProgress ?? 50)));
  const stakeResp = Math.max(0, Math.min(100, Number(data.stakeholderResponsiveness ?? 50)));

  // 1. Invert progress/responsiveness to risk (100% progress = 0% risk)
  const compensationRisk = 100 - compProg;
  const legalRisk = Math.min(100, legalCount * 6); // 16+ cases = ~100 risk
  const approvalRisk = 100 - appProg;
  const rrRisk = 100 - rrProg;
  const documentationRisk = 100 - docProg;
  const stakeholderRisk = 100 - stakeResp;

  // 2. Weighted formula
  const weightedScore =
    0.30 * compensationRisk +
    0.20 * legalRisk +
    0.15 * approvalRisk +
    0.15 * rrRisk +
    0.10 * documentationRisk +
    0.10 * stakeholderRisk;

  const rawScore = Math.round(Math.max(5, Math.min(99, weightedScore)));
  const delayProbability = rawScore;

  // 3. Classification (0-39 LOW, 40-69 MEDIUM, 70-100 HIGH)
  let riskLevel: RiskLevel = 'LOW';
  if (rawScore >= 70) {
    riskLevel = 'HIGH';
  } else if (rawScore >= 40) {
    riskLevel = 'MEDIUM';
  }

  // 4. Expected Delay Months
  let expectedDelayMonths = 0;
  if (rawScore >= 80) expectedDelayMonths = Math.round(5 + (rawScore - 80) * 0.25);
  else if (rawScore >= 70) expectedDelayMonths = Math.round(3 + (rawScore - 70) * 0.2);
  else if (rawScore >= 40) expectedDelayMonths = Math.round(1 + (rawScore - 40) * 0.07);
  else expectedDelayMonths = 0;

  // 5. Dynamic SHAP Feature Contributions
  const shapContributions: ShapContribution[] = [
    {
      factor: 'Pending Compensation',
      percentage: Math.round(0.30 * compensationRisk),
      description: `${100 - compProg}% of statutory compensation remaining to be disbursed.`,
    },
    {
      factor: 'Legal Disputes',
      percentage: Math.round(0.20 * legalRisk),
      description: `${legalCount} pending civil court stay petitions and title objections.`,
    },
    {
      factor: 'Statutory Approval Lag',
      percentage: Math.round(0.15 * approvalRisk),
      description: `${100 - appProg}% departmental clearances and NOCs pending.`,
    },
    {
      factor: 'R&R Resettlement Progress',
      percentage: Math.round(0.15 * rrRisk),
      description: `${100 - rrProg}% rehabilitation entitlements pending execution.`,
    },
    {
      factor: 'Documentation Verification',
      percentage: Math.round(0.10 * documentationRisk),
      description: `${100 - docProg}% cadastral title and survey records unverified.`,
    },
    {
      factor: 'Stakeholder Responsiveness',
      percentage: Math.round(0.10 * stakeholderRisk),
      description: `${100 - stakeResp}% landowner objection and grievance index.`,
    },
  ].sort((a, b) => b.percentage - a.percentage);

  // 6. Risk Factors List
  const riskFactors: string[] = [];
  if (compensationRisk > 40) riskFactors.push(`Compensation Backlog (${100 - compProg}% Unpaid)`);
  if (legalCount > 3) riskFactors.push(`Active Court Litigation (${legalCount} Cases)`);
  if (approvalRisk > 35) riskFactors.push(`Pending Inter-Departmental Approvals (${100 - appProg}%)`);
  if (rrRisk > 40) riskFactors.push(`R&R Housing & Resettlement Delay`);
  if (documentationRisk > 40) riskFactors.push(`Cadastral Survey & Patta Incomplete`);
  if (riskFactors.length === 0) riskFactors.push(`Normal Progress — Low Operational Bottlenecks`);

  // 7. Dynamic Recommendations
  const recommendations: Recommendation[] = [];
  const pName = data.projectName || data.projectId || 'Project';

  if (legalCount >= 5) {
    recommendations.push({
      id: `rec-legal-${Date.now()}`,
      title: `Convene Fast-Track Lok Adalat for ${legalCount} Court Disputes`,
      priority: 'Critical',
      department: 'Special DRO (Land Acquisition)',
      suggestedDeadline: '15-09-2026',
      description: `Organize special revenue judicial hearings to settle disputed compensation awards under Section 64.`,
    });
  }

  if (compProg < 60) {
    recommendations.push({
      id: `rec-comp-${Date.now()}`,
      title: `Organize Direct DBT Compensation Camps in ${data.district || 'District'}`,
      priority: 'Critical',
      department: 'Revenue & Treasury Division',
      suggestedDeadline: '20-09-2026',
      description: `Deploy dedicated revenue officers for direct bank transfer disbursement to boost compensation from ${compProg}%.`,
    });
  }

  if (appProg < 70) {
    recommendations.push({
      id: `rec-app-${Date.now()}`,
      title: `Escalate Inter-Departmental Clearances with Joint Secretary`,
      priority: 'High',
      department: 'State Infrastructure Steering Committee',
      suggestedDeadline: '25-09-2026',
      description: `Expedite forest, highway, and railway overbridge permissions for ${pName}.`,
    });
  }

  if (docProg < 70) {
    recommendations.push({
      id: `rec-doc-${Date.now()}`,
      title: `Deploy Joint Cadastral Survey & Patta Verification Teams`,
      priority: 'High',
      department: 'Survey & Land Records',
      suggestedDeadline: '30-09-2026',
      description: `Complete digital field measurement book (FMB) digitization for remaining land parcels.`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: `rec-routine-${Date.now()}`,
      title: `Maintain Scheduled Milestone Monitoring`,
      priority: 'Low',
      department: 'Project Monitoring Unit (PMU)',
      suggestedDeadline: '15-10-2026',
      description: `All land acquisition parameters are currently tracking within acceptable variance thresholds.`,
    });
  }

  // 8. Natural Language Explanation
  let explanation = '';
  const topFactor = shapContributions[0];
  if (rawScore >= 70) {
    explanation = `High risk of completion delay (${delayProbability}%) driven primarily by ${topFactor.factor.toLowerCase()} (${topFactor.percentage}% contribution). Estimated schedule slippage of ${expectedDelayMonths} months requires immediate administrative intervention.`;
  } else if (rawScore >= 40) {
    explanation = `Moderate delay risk (${delayProbability}%) primarily influenced by ${topFactor.factor.toLowerCase()}. Target milestone acceleration recommended to avoid critical critical-path slippage.`;
  } else {
    explanation = `Project is tracking with low delay risk (${delayProbability}%). Acquisition documentation, statutory approvals, and compensation disbursements are proceeding on schedule.`;
  }

  return {
    riskScore: rawScore,
    delayProbability,
    riskLevel,
    expectedDelayMonths,
    riskFactors,
    recommendations,
    shapContributions,
    explanation,
  };
}
