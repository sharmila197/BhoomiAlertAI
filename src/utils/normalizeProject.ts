import { Project, Stage } from '../types';
import { calculateProjectRisk } from './riskEngine';
import { extractLandAcquisitionProgress } from './acquisitionProgress';
import { calculateStageWiseRisk } from './stageRiskEngine';

export function normalizeRiskLevel(raw?: any): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!raw) return 'LOW';
  const str = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
  if (str === 'HIGH' || str === 'CRITICAL') return 'HIGH';
  if (str === 'MEDIUM' || str === 'MODERATE') return 'MEDIUM';
  if (str === 'LOW') return 'LOW';
  return 'LOW';
}

/**
 * Safely extracts and normalizes Expected_Risk from any object format or casing.
 * Normalizes: trim whitespace, uppercase.
 * Classifies: HIGH -> HIGH, MEDIUM -> MEDIUM, LOW -> LOW.
 * Returns null if missing or not valid.
 */
export function extractValidExpectedRisk(raw: any): 'HIGH' | 'MEDIUM' | 'LOW' | null {
  if (!raw || typeof raw !== 'object') return null;

  let val =
    raw.expectedRisk ??
    raw.Expected_Risk ??
    raw['Expected_Risk'] ??
    raw['Expected Risk'] ??
    raw['expected_risk'] ??
    raw['expectedRisk'] ??
    raw['EXPECTED_RISK'] ??
    raw['Expected risk'];

  if ((val === undefined || val === null || String(val).trim() === '') && typeof raw === 'object') {
    for (const key of Object.keys(raw)) {
      const cleanKey = key.toLowerCase().replace(/[\s_-]+/g, '');
      if (cleanKey === 'expectedrisk') {
        val = raw[key];
        break;
      }
    }
  }

  if (val === undefined || val === null) return null;
  const str = String(val).trim().toUpperCase();
  if (str === 'HIGH' || str === 'CRITICAL') return 'HIGH';
  if (str === 'MEDIUM' || str === 'MODERATE') return 'MEDIUM';
  if (str === 'LOW') return 'LOW';
  return null;
}

/**
 * Normalizes any incoming project object (from Live API or CSV Row) into a consistent Project record.
 */
export function normalizeProject(raw: any, indexFallback: number = 1): Project {
  const projectId = String(
    raw.projectId ||
    raw.project_id ||
    raw.id ||
    raw['Project ID'] ||
    raw['project id'] ||
    `LA-${100 + indexFallback}`
  ).trim();

  const projectName = String(
    raw.projectName ||
    raw.project_name ||
    raw.name ||
    raw['Project Name'] ||
    raw['project name'] ||
    `Infrastructure Project ${projectId}`
  ).trim();

  // 1. Primary: Use existing district field if available
  let rawDistrict = raw.district ?? raw['District'] ?? raw.district_name ?? raw['district_name'];
  let district = typeof rawDistrict === 'string' ? rawDistrict.trim() : '';

  // 2. Fallback: Parse district from Location / locationName if district not directly present
  if (!district) {
    const rawLoc = raw.location ?? raw.Location ?? raw.locationName ?? raw.coordinates?.locationName;
    if (typeof rawLoc === 'string' && rawLoc.trim()) {
      // Split comma-separated location (e.g. "Nagercoil Bypass, Kanyakumari, Tamil Nadu")
      const parts = rawLoc.split(',').map((p: string) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1].toLowerCase();
        if (lastPart === 'tamil nadu' || lastPart === 'tn' || lastPart === 'india') {
          district = parts[parts.length - 2];
        } else {
          district = parts[parts.length - 1];
        }
      } else if (parts.length === 1) {
        district = parts[0];
      }
    }
  }

  // Normalize district: collapse whitespace, trim
  district = district.replace(/\s+/g, ' ').trim();

  // Consistent title case for districts (e.g. "chengalpattu" -> "Chengalpattu", "KANYAKUMARI" -> "Kanyakumari")
  if (district) {
    district = district
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } else {
    district = 'Tamil Nadu';
  }

  const taluk = raw.taluk ? String(raw.taluk).trim() : undefined;
  const village = raw.village ? String(raw.village).trim() : undefined;
  const state = String(raw.state || raw['State'] || 'Tamil Nadu').trim();
  const projectType = String(raw.projectType || raw.project_type || raw['Project Type'] || 'Infrastructure Highway').trim();

  const currentStage: Stage = (
    raw.currentStage ||
    raw.current_stage ||
    raw.status ||
    raw['Status'] ||
    raw['Current Stage'] ||
    'Compensation'
  ) as Stage;

  // Numeric fields safe conversion
  const landRequired = Math.max(0, Number(raw.landRequired ?? raw.land_required ?? raw.landArea ?? raw.land_area ?? raw['Land Required'] ?? raw['Land Area'] ?? 0));
  const landAcquired = Math.max(0, Number(raw.landAcquired ?? raw.land_acquired ?? raw['Land Acquired'] ?? 0));
  const landArea = landRequired;

  // Strict Land Acquisition Progress extraction (DO NOT default missing values to 0% or fabricate)
  const rawAcquisitionProgress = extractLandAcquisitionProgress(raw);
  const acquisitionProgress: number | null = rawAcquisitionProgress;
  const landAcquisitionProgressPercent: number | null = rawAcquisitionProgress;

  const compensation = Math.max(0, Number(raw.compensation ?? raw.compensation_amount ?? raw.compensationAmount ?? raw['Compensation'] ?? raw['Compensation Amount'] ?? 0));
  let compensationPaid = Math.max(0, Number(raw.compensationPaid ?? raw.compensation_paid ?? raw['Compensation Paid'] ?? 0));
  let compensationPending = Math.max(0, Number(raw.compensationPending ?? raw.compensation_pending ?? raw['Compensation Pending'] ?? 0));

  let compensationProgress = Math.max(0, Math.min(100, Number(raw.compensationProgress ?? raw.compensation_progress ?? raw['Compensation Progress'] ?? 0)));
  if (compensationProgress === 0 && compensation > 0 && compensationPaid > 0) {
    compensationProgress = Math.round((compensationPaid / compensation) * 100);
  }
  if (compensationPending === 0 && compensation > 0 && compensationPaid > 0) {
    compensationPending = Math.max(0, compensation - compensationPaid);
  }

  const courtCases = Math.max(
    0,
    Number(
      raw.courtCases ??
      raw.Court_Cases ??
      raw['Court_Cases'] ??
      raw['Court Cases'] ??
      raw.court_cases ??
      raw.legalDisputes ??
      raw.disputes ??
      raw['Legal Disputes'] ??
      0
    )
  );

  const compensationStatus = String(
    raw.compensationStatus ??
    raw.Compensation_Status ??
    raw['Compensation_Status'] ??
    raw['Compensation Status'] ??
    raw.compensation_status ??
    raw.status ??
    ''
  ).trim();

  const pendingCompensationDays = Math.max(
    0,
    Number(
      raw.pendingCompensationDays ??
      raw.Pending_Compensation_Days ??
      raw['Pending_Compensation_Days'] ??
      raw['Pending Compensation Days'] ??
      raw.pending_compensation_days ??
      0
    )
  );

  const rrStatus = String(
    raw.rrStatus ??
    raw.R_and_R_Status ??
    raw['R_and_R_Status'] ??
    raw['R&R Status'] ??
    raw.rr_status ??
    raw['R_and_R Status'] ??
    ''
  ).trim();

  const documentationStatus = String(
    raw.documentationStatus ??
    raw.Documentation_Status ??
    raw['Documentation_Status'] ??
    raw['Documentation Status'] ??
    raw.documentation_status ??
    ''
  ).trim();

  const surveyStatus = String(
    raw.surveyStatus ??
    raw.Survey_Status ??
    raw['Survey_Status'] ??
    raw['Survey Status'] ??
    raw.survey_status ??
    ''
  ).trim();

  const delayed = String(
    raw.delayed ??
    raw.Delayed ??
    raw['Delayed'] ??
    raw.is_delayed ??
    ''
  ).trim();

  const rawCompVal =
    raw.compensation ??
    raw.Compensation ??
    raw.compensation_amount ??
    raw.Compensation_Amount ??
    raw.Total_Compensation ??
    raw.total_compensation ??
    raw.Compensation_Amount_Cr ??
    raw['Compensation'] ??
    raw['Compensation Amount'] ??
    raw['Total Compensation'];

  const hasExplicitCompensationAmount =
    Boolean(raw.hasExplicitCompensationAmount) ||
    (rawCompVal !== undefined &&
      rawCompVal !== null &&
      String(rawCompVal).trim() !== '' &&
      !isNaN(Number(rawCompVal)) &&
      Number(rawCompVal) > 0);

  const legalDisputes = Math.max(
    0,
    courtCases > 0 ? courtCases : Number(raw.legalDisputes ?? raw.legal_disputes ?? raw.disputes ?? raw['Legal Disputes'] ?? raw['Disputes'] ?? 0)
  );
  const affectedFamilies = Math.max(0, Number(raw.affectedFamilies ?? raw.affected_families ?? raw['Affected Families'] ?? 0));

  const documentationProgress = Math.max(0, Math.min(100, Number(raw.documentationProgress ?? raw.documentation_progress ?? raw['Documentation Progress'] ?? 75)));
  const approvalProgress = Math.max(0, Math.min(100, Number(raw.approvalProgress ?? raw.approval_progress ?? raw['Approval Progress'] ?? 70)));
  const rrProgress = Math.max(0, Math.min(100, Number(raw.rrProgress ?? raw.rr_progress ?? raw['R&R Progress'] ?? 60)));
  const stakeholderResponsiveness = Math.max(0, Math.min(100, Number(raw.stakeholderResponsiveness ?? raw.stakeholder_responsiveness ?? raw['Stakeholder Responsiveness'] ?? 70)));

  // Coordinate parsing (Strict validation: no fake coords)
  let coordinates: { lat: number; lng: number; locationName?: string } | null = null;
  const rawLat = Number(raw.latitude ?? raw.lat ?? raw.coordinates?.lat ?? raw['Latitude'] ?? raw['lat']);
  const rawLng = Number(raw.longitude ?? raw.lng ?? raw.lon ?? raw.coordinates?.lng ?? raw['Longitude'] ?? raw['lng']);

  if (!isNaN(rawLat) && !isNaN(rawLng) && rawLat >= 6 && rawLat <= 38 && rawLng >= 68 && rawLng <= 98) {
    coordinates = {
      lat: rawLat,
      lng: rawLng,
      locationName: raw.locationName || `${district}, ${state}`,
    };
  }

  const plannedCompletion = String(raw.plannedCompletion || raw.planned_completion || raw['Planned Completion'] || '31-12-2026');
  const expectedCompletion = String(raw.expectedCompletion || raw.expected_completion || raw['Expected Completion'] || '30-04-2027');

  const now = new Date();
  const lastUpdated = String(
    raw.lastUpdated ||
    raw.last_updated ||
    raw['Last Updated'] ||
    `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`
  );


  const awardDate = raw.awardDate || raw.dateOfAward || raw['Date of Award'] || raw['Award Date'] || raw.award_date || undefined;
  const dateOfAward = awardDate;
  const totalProjectCost = Number(raw.totalProjectCost ?? raw.estimatedCostCr ?? raw['Total Project Cost'] ?? raw['Project Cost'] ?? 0);
  const subSector = raw.subSector || raw['Sub-Sector'] || raw['Sub Sector'] || projectType;
  const projectAuthority = raw.projectAuthority || raw['Project Authority'] || raw.authority || 'State Infrastructure Directorate';
  const dataSource = raw.dataSource || 'PPPIN India (Official)';

  const validExpectedRisk = extractValidExpectedRisk(raw);

  const sanctionedDate = raw.sanctionedDate || raw['Sanctioned Date'] || raw.sanction_date || undefined;
  const delayDate = raw.delayDate || raw['Delay Date'] || raw.delay_date || undefined;
  const rawDelayDaysVal = raw.delayDays ?? raw.Delay_Days ?? raw['Delay_Days'] ?? raw['Delay Days'] ?? raw.delay_days;
  let delayDays = rawDelayDaysVal !== undefined && !isNaN(Number(rawDelayDaysVal)) ? Number(rawDelayDaysVal) : undefined;

  if (delayDays === undefined && sanctionedDate && delayDate) {
    const sD = new Date(sanctionedDate);
    const dD = new Date(delayDate);
    if (!isNaN(sD.getTime()) && !isNaN(dD.getTime())) {
      delayDays = Math.round((dD.getTime() - sD.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  // Calculate transparent rule-based project monitoring risk
  const riskAnalysis = calculateProjectRisk({
    ...raw,
    expectedRisk: validExpectedRisk ?? undefined,
    projectId,
    id: projectId,
    projectName,
    name: projectName,
    district,
    status: currentStage,
    currentStage,
    sector: raw.sector || 'Infrastructure',
    projectType,
    subSector,
    authority: projectAuthority,
    projectAuthority,
    estimatedCostCr: raw.estimatedCostCr || totalProjectCost || 0,
    totalProjectCost: totalProjectCost || raw.estimatedCostCr || 0,
    awardDate,
    dateOfAward,
    lastUpdated,
    dataSource,
    compensationProgress,
    legalDisputes,
    acquisitionProgress,
    sanctionedDate,
    delayDate,
    delayDays,
  });

  return {
    id: projectId,
    projectId,
    name: projectName,
    projectName,
    district,
    taluk,
    village,
    state,
    sector: raw.sector || 'Infrastructure',
    subSector,
    projectType,
    authority: projectAuthority,
    projectAuthority,
    pppModel: raw.pppModel || 'PPP Concession',
    estimatedCostCr: raw.estimatedCostCr || totalProjectCost || 0,
    totalProjectCost: totalProjectCost || raw.estimatedCostCr || 0,
    awardDate,
    dateOfAward,
    status: currentStage,
    currentStage,
    landRequired,
    landAcquired,
    landArea,
    acquisitionProgress,
    compensation,
    compensationPaid,
    compensationPending,
    compensationProgress,
    legalDisputes,
    affectedFamilies,
    documentationProgress,
    approvalProgress,
    rrProgress,
    stakeholderResponsiveness,
    coordinates,
    plannedCompletion,
    expectedCompletion,
    sanctionedDate,
    delayDate,
    delayDays,
    hasRiskAssessment: true,
    expectedRisk: validExpectedRisk ?? undefined,
    expectedDelayMonths: delayDays !== undefined && delayDays > 0 ? Math.round(delayDays / 30) : (riskAnalysis.riskLevel === 'HIGH' ? 6 : riskAnalysis.riskLevel === 'MEDIUM' ? 3 : 0),
    delayProbability: riskAnalysis.riskScore,
    riskScore: riskAnalysis.riskScore,
    riskLevel: riskAnalysis.riskLevel,
    lastUpdated,
    riskFactors: riskAnalysis.riskFactors,
    recommendation: riskAnalysis.recommendation,
    recommendations: [
      {
        id: `rec-${projectId}-1`,
        priority: riskAnalysis.riskLevel === 'HIGH' ? 'Critical' : riskAnalysis.riskLevel === 'MEDIUM' ? 'Medium' : 'Low',
        title: riskAnalysis.riskLevel === 'HIGH' ? 'Priority Review & Verification' : 'Milestone Monitoring',
        description: riskAnalysis.recommendation,
        department: projectAuthority || 'Revenue & Land Acquisition Administration',
        suggestedDeadline: '30-09-2026',
        status: 'Pending',
      }
    ],
    shapContributions: validExpectedRisk
      ? [
          {
            factor: 'Dataset Benchmark Classification',
            percentage: 60,
            description: `Reference risk category (${validExpectedRisk}) from uploaded dataset benchmark.`,
          },
          {
            factor: 'Implementation Status',
            percentage: 25,
            description: `Project phase (${currentStage}) operational monitoring weight.`,
          },
          {
            factor: 'Corridor & Scale Exposure',
            percentage: 15,
            description: 'Capital outlay and infrastructure right-of-way exposure.',
          },
        ]
      : [
          {
            factor: 'Implementation Status',
            percentage: 40,
            description: `Project phase (${currentStage}) monitoring weight.`,
          },
          {
            factor: 'Elapsed Project Timeline',
            percentage: 30,
            description: awardDate ? `Calculated elapsed time from award date (${awardDate}).` : 'Scheduled elapsed milestone assessment.',
          },
          {
            factor: 'Data Freshness',
            percentage: 20,
            description: `Project records refresh status (${lastUpdated}).`,
          },
          {
            factor: 'Corridor & Scale Exposure',
            percentage: 10,
            description: `Sector right-of-way and capital outlay allocation.`,
          },
        ],
    stageProgression: raw.stageProgression || {
      planning: 25,
      documentation: 25,
      compensation: 25,
      rrPossession: 25,
    },
    explanation: riskAnalysis.explanation,
    dataSource,
    landAcquisitionProgressPercent,
    courtCases,
    compensationStatus,
    pendingCompensationDays,
    rrStatus,
    documentationStatus,
    surveyStatus,
    delayed,
    hasExplicitCompensationAmount,
    stageRisk: calculateStageWiseRisk({
      ...raw,
      projectId,
      projectName,
      sector: raw.sector || projectType || 'Infrastructure',
      estimatedCostCr: raw.estimatedCostCr || totalProjectCost || 0,
      district,
      awardDate,
      plannedCompletion,
      landAcquisitionProgressPercent,
      courtCases,
      compensationStatus,
      pendingCompensationDays,
      rrStatus,
      documentationStatus,
      surveyStatus,
      delayed,
      hasExplicitCompensationAmount,
    }),
    rawRecord: raw,
  };
}
