-- PostgreSQL Schema for Land Acquisition Delay Prediction System (SIH1624)
-- Phase 1 Foundation

CREATE TABLE IF NOT EXISTS districts (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  official_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('CALA', 'PROJECT_DIRECTOR', 'REVENUE_OFFICER', 'LEGAL_OFFICER', 'SUPER_ADMIN')),
  department VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) PRIMARY KEY,
  project_code VARCHAR(50) UNIQUE NOT NULL,
  project_name VARCHAR(200) NOT NULL,
  authority VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  corridor VARCHAR(200) NOT NULL,
  current_stage VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS'
);

CREATE TABLE IF NOT EXISTS parcels (
  id VARCHAR(64) PRIMARY KEY,
  parcel_code VARCHAR(50) UNIQUE NOT NULL,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  district VARCHAR(100) NOT NULL,
  village VARCHAR(100) NOT NULL,
  current_stage VARCHAR(50) NOT NULL,
  risk_score INTEGER,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'NOT_ASSESSED',
  predicted_delay_days INTEGER,
  litigation_status VARCHAR(50) NOT NULL DEFAULT 'NO_LITIGATION',
  compensation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  documentation_status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
  survey_status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED'
);

CREATE TABLE IF NOT EXISTS project_assignments (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, project_id)
);

CREATE TABLE IF NOT EXISTS parcel_assignments (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parcel_id VARCHAR(64) NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, parcel_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NOT NULL,
  session_metadata TEXT
);

-- Required Indexes
CREATE INDEX IF NOT EXISTS idx_users_official_id ON users(official_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_district ON users(district);
CREATE INDEX IF NOT EXISTS idx_projects_district ON projects(district);
CREATE INDEX IF NOT EXISTS idx_parcels_district ON parcels(district);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_parcel_assignments_user ON parcel_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_parcel_assignments_parcel ON parcel_assignments(parcel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- Phase 3 & 4: Predictions & Intervention Management
-- ============================================================

CREATE TABLE IF NOT EXISTS predictions (
  id VARCHAR(64) PRIMARY KEY,
  parcel_id VARCHAR(64) NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  risk_score INTEGER,
  risk_level VARCHAR(20) NOT NULL,
  predicted_delay_days INTEGER,
  factors TEXT,
  explanation TEXT,
  model_type VARCHAR(50) DEFAULT 'DEMO_RULE_ENGINE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interventions (
  id VARCHAR(64) PRIMARY KEY,
  intervention_code VARCHAR(50) UNIQUE NOT NULL,
  parcel_id VARCHAR(64) NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prediction_id VARCHAR(64) REFERENCES predictions(id) ON DELETE SET NULL,
  intervention_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  responsible_department VARCHAR(100) NOT NULL,
  responsible_role VARCHAR(50) NOT NULL,
  recommended_action TEXT NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('RECOMMENDED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED', 'CANCELLED')),
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  approved_by VARCHAR(64) REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  completion_notes TEXT,
  delay_avoided_days INTEGER,
  outcome_indicator VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS intervention_events (
  id VARCHAR(64) PRIMARY KEY,
  intervention_id VARCHAR(64) NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  previous_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  performed_by VARCHAR(64) NOT NULL REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  intervention_id VARCHAR(64) REFERENCES interventions(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Phase 4 Indexes
CREATE INDEX IF NOT EXISTS idx_predictions_parcel ON predictions(parcel_id);
CREATE INDEX IF NOT EXISTS idx_interventions_parcel ON interventions(parcel_id);
CREATE INDEX IF NOT EXISTS idx_interventions_project ON interventions(project_id);
CREATE INDEX IF NOT EXISTS idx_interventions_prediction ON interventions(prediction_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_priority ON interventions(priority);
CREATE INDEX IF NOT EXISTS idx_interventions_department ON interventions(responsible_department);
CREATE INDEX IF NOT EXISTS idx_interventions_due_date ON interventions(due_date);
CREATE INDEX IF NOT EXISTS idx_intervention_events_intervention ON intervention_events(intervention_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_intervention ON notifications(intervention_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

