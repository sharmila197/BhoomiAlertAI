export type UserRole =
  | 'CALA'
  | 'PROJECT_DIRECTOR'
  | 'REVENUE_OFFICER'
  | 'LEGAL_OFFICER'
  | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserRecord {
  id: string;
  official_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  department: string;
  state: string;
  district: string;
  status: UserStatus;
  created_at: string;
  last_login: string | null;
}

export type SafeUser = Omit<UserRecord, 'password_hash'>;

export interface DistrictRecord {
  id: string;
  name: string;
  state: string;
  status: string;
}

export interface ProjectRecord {
  id: string;
  project_code: string;
  project_name: string;
  authority: string;
  state: string;
  district: string;
  corridor: string;
  current_stage: string;
  status: string;
}

export interface ParcelRecord {
  id: string;
  parcel_code: string;
  project_id: string;
  district: string;
  village: string;
  current_stage: string;
  risk_score: number | null;
  risk_level: string;
  predicted_delay_days: number | null;
  litigation_status: string;
  compensation_status: string;
  documentation_status: string;
  survey_status: string;
}

export interface ProjectAssignmentRecord {
  id: string;
  user_id: string;
  project_id: string;
  assigned_at: string;
}

export interface ParcelAssignmentRecord {
  id: string;
  user_id: string;
  parcel_id: string;
  assigned_at: string;
}

export interface AuditLogRecord {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  timestamp: string;
  ip_address: string;
  session_metadata: string;
}

export interface JwtPayload {
  userId: string;
  officialId: string;
  role: UserRole;
  district: string;
  state: string;
  iat?: number;
  exp?: number;
}

// Phase 4 Types
export type InterventionStatus =
  | 'RECOMMENDED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ESCALATED'
  | 'CANCELLED';

export type InterventionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type InterventionType =
  | 'LEGAL_REVIEW'
  | 'COMPENSATION_REVIEW'
  | 'DOCUMENTATION_VERIFICATION'
  | 'SURVEY_REVERIFICATION'
  | 'ADMINISTRATIVE_ESCALATION'
  | 'RNR_REVIEW';

export interface PredictionRecord {
  id: string;
  parcel_id: string;
  project_id: string;
  risk_score: number | null;
  risk_level: string;
  predicted_delay_days: number | null;
  factors: string | null;
  explanation: string | null;
  model_type: string;
  created_at: string;
}

export interface InterventionRecord {
  id: string;
  intervention_code: string;
  parcel_id: string;
  project_id: string;
  prediction_id: string | null;
  intervention_type: InterventionType;
  title: string;
  description: string;
  priority: InterventionPriority;
  responsible_department: string;
  responsible_role: string;
  recommended_action: string;
  status: InterventionStatus;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  due_date: string | null;
  completed_at: string | null;
  rejection_reason: string | null;
  completion_notes: string | null;
  delay_avoided_days: number | null;
  outcome_indicator: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  parcel_code?: string;
  village?: string;
  district?: string;
  project_name?: string;
  project_code?: string;
  creator_name?: string;
  approver_name?: string;
  risk_score?: number;
  risk_level?: string;
  predicted_delay_days?: number;
  current_stage?: string;
  is_overdue?: boolean;
}

export interface InterventionEventRecord {
  id: string;
  intervention_id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string;
  performed_by: string;
  note: string | null;
  created_at: string;
  performer_name?: string;
  performer_role?: string;
  performer_official_id?: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  intervention_id: string | null;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

