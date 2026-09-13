export type Stage =
  | 'Planning'
  | 'Notification'
  | 'Documentation'
  | 'Approval'
  | 'Compensation'
  | 'Legal / R&R'
  | 'Possession'
  | 'Completed'
  | 'Completion';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_ASSESSED' | 'NOT ASSESSED' | 'CRITICAL';

export interface ShapContribution {
  factor: string;
  percentage: number;
  isPositive?: boolean; // true = increases risk (pushes higher), false = mitigates risk
  impactCategory?: 'High' | 'Medium' | 'Low';
  description: string;
}

export interface Recommendation {
  id: string;
  priorityOrder?: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  department: string;
  suggestedDeadline: string;
  status?: 'Pending' | 'In Progress' | 'Completed' | 'Escalated';
}

export interface ProjectCoordinates {
  lat: number;
  lng: number;
  locationName?: string;
}

export type StageRiskStatus = 'ASSESSED' | 'INSUFFICIENT_DATA';

export interface StageRiskAssessment {
  stage: 'Planning' | 'Land Acquisition' | 'Compensation';
  status: StageRiskStatus;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT ASSESSED';
  delayProbability: number | null; // null if insufficient data, never 0
  factors: string[];
  recommendation: string;
  shapContributions: ShapContribution[];
  insufficientDataReason?: string;
  dataCoverage: {
    availableFields: string[];
    missingFields: string[];
  };
}

export interface ProjectStageRiskResponse {
  projectId: string;
  projectName: string;
  overallCoverage: 'COMPLETE' | 'INCOMPLETE';
  assessedCount: number;
  totalStages: number;
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT ASSESSED';
  overallDelayProbability: number | null;
  planning: StageRiskAssessment;
  landAcquisition: StageRiskAssessment;
  compensation: StageRiskAssessment;
  timestamp: string;
}

export interface Project {
  id: string;
  projectId: string;
  name: string;
  projectName: string;
  district: string;
  taluk?: string;
  village?: string;
  state: string;
  projectType: string;
  status: string;
  currentStage: Stage;

  // Land metrics
  landRequired: number; // in hectares
  landAcquired: number; // in hectares
  landArea: number; // in hectares
  acquisitionProgress: number | null; // 0-100 % or null if unavailable (Not Available)

  // Financial / Compensation metrics
  compensation: number; // Total amount
  compensationPaid: number;
  compensationPending: number;
  compensationProgress: number; // 0-100 %

  // Operational metrics
  affectedFamilies: number;
  documentationProgress: number; // 0-100 %
  approvalProgress: number; // 0-100 %
  legalDisputes: number; // count
  rrProgress: number; // Rehabilitation & Resettlement 0-100 %
  stakeholderResponsiveness: number; // 0-100 %

  // Schedule & Risk
  plannedCompletion: string;
  expectedCompletion: string;
  sanctionedDate?: string;
  delayDate?: string;
  delayDays?: number;
  expectedDelayMonths?: number | null;
  delayProbability: number | null; // 0-100 % or null if not assessed
  riskScore: number | null; // 0-100 % or null if not assessed
  riskLevel: RiskLevel;
  expectedRisk?: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  hasRiskAssessment: boolean; // true if genuine land acquisition risk data exists
  riskFactors: string[];
  recommendations: Recommendation[];
  shapContributions: ShapContribution[];
  stageProgression?: {
    planning: number;
    documentation: number;
    compensation: number;
    rrPossession: number;
  };
  explanation: string;

  // PPP & Institutional attributes
  sector?: string;
  subSector?: string;
  pppModel?: string;
  authority?: string;
  projectAuthority?: string;
  estimatedCostCr?: number;
  totalProjectCost?: number;
  awardDate?: string;
  dateOfAward?: string;
  recommendation?: string;
  dataSource?: string;

  // GIS Coordinates (null if unavailable)
  coordinates: ProjectCoordinates | null;
  lastUpdated: string;

  // Operational metrics & Intervention indicators
  landAcquisitionProgressPercent?: number | null;
  courtCases?: number;
  compensationStatus?: string;
  pendingCompensationDays?: number;
  rrStatus?: string;
  documentationStatus?: string;
  surveyStatus?: string;
  delayed?: string | boolean;
  hasExplicitCompensationAmount?: boolean;
  stageRisk?: ProjectStageRiskResponse;
  rawRecord?: Record<string, any>;
}

export interface Intervention {
  id: string;
  projectId: string;
  projectName: string;
  action: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  department: string;
  assignedTo: string;
  deadline: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Escalated' | 'OPEN' | 'ESCALATED' | 'COMPLETED';
  createdAt: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  projectId: string;
  projectName?: string;
  action: string;
  source?: string;
  user: string;
  previousRisk: string | number;
  newRisk: string | number;
  timestamp: string;
  status?: string;
  details?: string;
}

export interface User {
  name: string;
  email: string;
  role: string;
  department: string;
  district: string;
  avatarUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  projectId?: string;
  timestamp: string;
  type: 'success' | 'error' | 'info' | 'warning';
  read: boolean;
}

