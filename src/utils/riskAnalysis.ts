import { RiskLevel, ShapContribution, Recommendation, Stage } from '../types';

export interface RiskCalculationInputs {
  documentationProgress?: number;
  approvalProgress?: number;
  compensationProgress?: number;
  acquisitionProgress?: number | null;
  legalDisputes?: number;
  rrProgress?: number;
  stakeholderResponsiveness?: number;
  currentStage?: Stage | string;
  landRequired?: number;
  landAcquired?: number;
  compensationPaid?: number;
  compensationPending?: number;
  totalCompensation?: number;
  delayMonths?: number;
}

export interface RiskAnalysisOutput {
  riskScore: number; // 0-100
  riskLevel: RiskLevel; // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  expectedDelayMonths: number;
  shapContributions: ShapContribution[];
  riskFactors: string[];
  recommendations: Recommendation[];
  explanation: string;
  stageProgression: {
    planning: number;
    documentation: number;
    compensation: number;
    rrPossession: number;
  };
}

/**
 * Transparent Frontend Risk Calculation based on actual project fields.
 * Formula:
 * - Compensation Pending Risk: 30%
 * - Legal Disputes Risk: 20%
 * - Approval Delay Risk: 15%
 * - R&R Execution Risk: 15%
 * - Documentation Incompleteness: 10%
 * - Stakeholder Friction: 10%
 */
export function calculateRisk(inputs: RiskCalculationInputs): RiskAnalysisOutput {
  const docProg = Math.max(0, Math.min(100, inputs.documentationProgress ?? 75));
  const apprProg = Math.max(0, Math.min(100, inputs.approvalProgress ?? 70));
  
  // If compensationProgress is not directly provided, derive from paid / total if available
  let compProg = inputs.compensationProgress;
  if (compProg === undefined || compProg === null) {
    if (inputs.totalCompensation && inputs.totalCompensation > 0) {
      compProg = Math.round(((inputs.compensationPaid || 0) / inputs.totalCompensation) * 100);
    } else {
      compProg = (inputs.acquisitionProgress !== null && inputs.acquisitionProgress !== undefined)
        ? inputs.acquisitionProgress
        : 60;
    }
  }
  compProg = Math.max(0, Math.min(100, compProg));

  const legalDisputes = Math.max(0, inputs.legalDisputes ?? 0);
  const rrProg = Math.max(0, Math.min(100, inputs.rrProgress ?? 65));
  const stakeholderResp = Math.max(0, Math.min(100, inputs.stakeholderResponsiveness ?? 70));

  // Risk components (0 to 100 where 100 = highest risk)
  const compensationRisk = 100 - compProg;
  const legalRisk = Math.min(100, Math.round(legalDisputes * 5));
  const approvalRisk = 100 - apprProg;
  const rrRisk = 100 - rrProg;
  const docRisk = 100 - docProg;
  const stakeholderRisk = 100 - stakeholderResp;

  const weightedScore =
    0.30 * compensationRisk +
    0.20 * legalRisk +
    0.15 * approvalRisk +
    0.15 * rrRisk +
    0.10 * docRisk +
    0.10 * stakeholderRisk;

  const riskScore = Math.max(5, Math.min(98, Math.round(weightedScore)));

  // Risk Classification: HIGH, MEDIUM, LOW
  let riskLevel: RiskLevel = 'LOW';
  if (riskScore >= 70) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 40) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  const expectedDelayMonths = Number((riskScore * 0.06).toFixed(1));

  // Identify Major Risk Factors
  const riskFactors: string[] = [];
  if (compProg < 60) riskFactors.push('Compensation disbursement bottleneck');
  if (legalDisputes >= 6) riskFactors.push(`Active legal disputes (${legalDisputes} cases)`);
  if (apprProg < 65) riskFactors.push('Statutory clearance delay');
  if (rrProg < 60) riskFactors.push('Slow R&R resettlement progress');
  if (docProg < 70) riskFactors.push('Incomplete digital land records');
  if (stakeholderResp < 65) riskFactors.push('Low landowner consensus');
  if (riskFactors.length === 0) riskFactors.push('Standard execution schedule');

  // Calculate Factor Importance (SHAP-style)
  const totalWeighted =
    0.30 * compensationRisk +
    0.20 * legalRisk +
    0.15 * approvalRisk +
    0.15 * rrRisk +
    0.10 * docRisk +
    0.10 * stakeholderRisk || 1;

  const shapContributions: ShapContribution[] = [
    {
      factor: 'Compensation Disbursement',
      percentage: Math.round(((0.30 * compensationRisk) / totalWeighted) * riskScore),
      isPositive: compProg < 75,
      impactCategory: compProg < 50 ? 'High' : compProg < 75 ? 'Medium' : 'Low',
      description: `Compensation progress is at ${compProg}%, representing a ${compensationRisk}% pending shortfall.`,
    },
    {
      factor: 'Legal & Court Petitions',
      percentage: Math.round(((0.20 * legalRisk) / totalWeighted) * riskScore),
      isPositive: legalDisputes > 3,
      impactCategory: legalDisputes > 10 ? 'High' : legalDisputes > 4 ? 'Medium' : 'Low',
      description: `${legalDisputes} active legal petitions and dispute suits pending before revenue arbitration.`,
    },
    {
      factor: 'Statutory Approvals',
      percentage: Math.round(((0.15 * approvalRisk) / totalWeighted) * riskScore),
      isPositive: apprProg < 75,
      impactCategory: apprProg < 60 ? 'High' : 'Medium',
      description: `Inter-departmental approvals completed at ${apprProg}%.`,
    },
    {
      factor: 'R&R Package Progress',
      percentage: Math.round(((0.15 * rrRisk) / totalWeighted) * riskScore),
      isPositive: rrProg < 70,
      impactCategory: rrProg < 55 ? 'High' : 'Medium',
      description: `Rehabilitation & Resettlement completion is currently ${rrProg}%.`,
    },
    {
      factor: 'Land Title Records',
      percentage: Math.round(((0.10 * docRisk) / totalWeighted) * riskScore),
      isPositive: docProg < 75,
      impactCategory: docProg < 60 ? 'High' : 'Low',
      description: `Digital patta verification and land title audit progress is ${docProg}%.`,
    },
    {
      factor: 'Stakeholder Responsiveness',
      percentage: Math.round(((0.10 * stakeholderRisk) / totalWeighted) * riskScore),
      isPositive: stakeholderResp < 70,
      impactCategory: stakeholderResp < 60 ? 'Medium' : 'Low',
      description: `Grievance disposal and public hearing attendance index is ${stakeholderResp}%.`,
    },
  ];

  // Derive Actionable Recommendations
  const recommendations: Recommendation[] = [];
  let rIndex = 1;

  if (compProg < 65) {
    recommendations.push({
      id: `rec-comp-${rIndex}`,
      priorityOrder: rIndex++,
      priority: riskScore >= 70 ? 'Critical' : 'High',
      title: 'Convene Fast-Track Compensation Settlement Camp',
      description: 'Expedite direct bank disbursement for undisputed parcels to secure early physical possession.',
      department: 'Special DRO (Land Acquisition)',
      suggestedDeadline: '15-09-2026',
      status: 'In Progress',
    });
  }

  if (legalDisputes >= 5) {
    recommendations.push({
      id: `rec-legal-${rIndex}`,
      priorityOrder: rIndex++,
      priority: legalDisputes > 10 ? 'Critical' : 'High',
      title: 'Refer Disputed Parcels to Special Lok Adalat',
      description: `Assign ${legalDisputes} unresolved title cases for mediation through District Legal Services Authority.`,
      department: 'District Collectorate Legal Cell',
      suggestedDeadline: '20-09-2026',
      status: 'Pending',
    });
  }

  if (apprProg < 75) {
    recommendations.push({
      id: `rec-appr-${rIndex}`,
      priorityOrder: rIndex++,
      priority: 'High',
      title: 'Escalate Pending Inter-Department Clearances',
      description: 'Fast-track environmental and utility relocation approvals via state infrastructure portal.',
      department: 'Infrastructure Directorate',
      suggestedDeadline: '25-09-2026',
      status: 'Pending',
    });
  }

  if (rrProg < 65) {
    recommendations.push({
      id: `rec-rr-${rIndex}`,
      priorityOrder: rIndex++,
      priority: 'Medium',
      title: 'Accelerate R&R Housing & Rehabilitation Sites',
      description: 'Increase monitoring of alternative housing and resettlement site handover to affected families.',
      department: 'Rehabilitation Sub-Division',
      suggestedDeadline: '30-09-2026',
      status: 'Pending',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: `rec-gen-${rIndex}`,
      priorityOrder: rIndex++,
      priority: 'Low',
      title: 'Maintain Routine Milestone Monitoring',
      description: 'Proceed with scheduled milestone audits and fortnightly inter-departmental reviews.',
      department: 'District Monitoring Cell',
      suggestedDeadline: '30-09-2026',
      status: 'Pending',
    });
  }

  // Explanation
  let explanation = '';
  if (riskScore >= 85) {
    explanation = `CRITICAL DELAY RISK (${riskScore}%): Immediate administrative intervention is required. Primary bottlenecks: ${riskFactors.join(', ')}.`;
  } else if (riskScore >= 70) {
    explanation = `HIGH DELAY RISK (${riskScore}%): Significant delay probability driven by ${riskFactors.slice(0, 3).join(', ')}. Prioritize compensation and legal clearance.`;
  } else if (riskScore >= 40) {
    explanation = `MODERATE DELAY RISK (${riskScore}%): Project progress is ongoing with manageable dependencies in ${riskFactors.slice(0, 2).join(' and ')}.`;
  } else {
    explanation = `LOW DELAY RISK (${riskScore}%): Statutory stages and acquisition milestones are progressing on schedule.`;
  }

  const stageProgression = {
    planning: Math.min(95, Math.round(riskScore * 0.65)),
    documentation: Math.min(95, Math.round(riskScore * 0.82)),
    compensation: riskScore,
    rrPossession: Math.min(98, Math.round(riskScore * 1.05)),
  };

  return {
    riskScore,
    riskLevel,
    expectedDelayMonths,
    shapContributions,
    riskFactors,
    recommendations,
    explanation,
    stageProgression,
  };
}
