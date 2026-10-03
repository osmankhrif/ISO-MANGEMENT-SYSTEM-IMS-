export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auditors (
  id TEXT PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  is_lead INTEGER NOT NULL DEFAULT 0,
  qualification TEXT NOT NULL,
  training TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 0,
  competency_level TEXT NOT NULL,
  standards_qualified TEXT NOT NULL, -- JSON array
  audit_hours REAL NOT NULL DEFAULT 0,
  number_of_audits INTEGER NOT NULL DEFAULT 0,
  performance_rating REAL NOT NULL DEFAULT 4.0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS standards (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  revision_year TEXT NOT NULL,
  issuing_body TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS clauses (
  id TEXT PRIMARY KEY,
  standard_id TEXT NOT NULL,
  clause_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  parent_clause_id TEXT,
  FOREIGN KEY (standard_id) REFERENCES standards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  clause_id TEXT NOT NULL,
  requirement_code TEXT NOT NULL,
  title TEXT NOT NULL,
  requirement_text TEXT NOT NULL,
  evidence_guidance TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'Medium',
  FOREIGN KEY (clause_id) REFERENCES clauses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_programs (
  id TEXT PRIMARY KEY,
  program_year INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Approved',
  approval_status TEXT NOT NULL DEFAULT 'Approved',
  approved_by TEXT,
  approved_at TEXT,
  total_planned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  audit_number TEXT UNIQUE NOT NULL,
  program_id TEXT NOT NULL,
  title TEXT NOT NULL,
  audit_type TEXT NOT NULL,
  department TEXT NOT NULL,
  area TEXT NOT NULL,
  site TEXT,
  process TEXT NOT NULL,
  standard_ids TEXT NOT NULL, -- JSON array
  criteria TEXT NOT NULL,
  lead_auditor_id TEXT NOT NULL,
  team_auditor_ids TEXT NOT NULL, -- JSON array
  planned_start_date TEXT NOT NULL,
  planned_end_date TEXT NOT NULL,
  actual_start_date TEXT,
  actual_end_date TEXT,
  risk_likelihood INTEGER NOT NULL DEFAULT 3,
  risk_consequence INTEGER NOT NULL DEFAULT 3,
  risk_score INTEGER NOT NULL DEFAULT 9,
  risk_level TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Planned',
  priority TEXT NOT NULL DEFAULT 'Medium',
  scope TEXT NOT NULL,
  objectives TEXT NOT NULL,
  special_instructions TEXT,
  previous_findings_summary TEXT,
  known_risks TEXT,
  executive_summary TEXT,
  conclusion TEXT,
  approved_by TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (program_id) REFERENCES audit_programs(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_auditor_id) REFERENCES auditors(id)
);

CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  audit_id TEXT,
  standard_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  department TEXT NOT NULL,
  process TEXT NOT NULL,
  is_template INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE SET NULL,
  FOREIGN KEY (standard_id) REFERENCES standards(id)
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL,
  requirement_id TEXT,
  clause_number TEXT NOT NULL,
  standard_code TEXT NOT NULL,
  requirement TEXT NOT NULL,
  question TEXT NOT NULL,
  evidence_required TEXT NOT NULL,
  department TEXT NOT NULL,
  process TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'Medium',
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_responses (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL,
  checklist_item_id TEXT NOT NULL,
  response_value TEXT NOT NULL, -- 'Conforming' | 'Nonconforming' | 'Observation' | 'Opportunity for Improvement' | 'Not Applicable'
  auditor_notes TEXT,
  objective_evidence TEXT,
  interview_notes TEXT,
  evaluated_by TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(id) ON DELETE CASCADE,
  UNIQUE(audit_id, checklist_item_id)
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  finding_number TEXT UNIQUE NOT NULL,
  audit_id TEXT NOT NULL,
  checklist_item_id TEXT,
  date_identified TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Major Nonconformity' | 'Minor Nonconformity' | 'Observation' | 'Opportunity for Improvement'
  department TEXT NOT NULL,
  process TEXT NOT NULL,
  standard_code TEXT NOT NULL,
  clause_number TEXT NOT NULL,
  requirement_text TEXT NOT NULL,
  description TEXT NOT NULL,
  objective_evidence TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'Medium',
  responsible_person TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  closure_date TEXT,
  closed_by TEXT,
  is_repeat INTEGER NOT NULL DEFAULT 0,
  root_cause_summary TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  affected_procedures_json TEXT, -- JSON array of ProcedureLink
  affected_risks_json TEXT, -- JSON array of RiskLink
  affected_competencies_json TEXT, -- JSON array of CompetenceLink
  insurance_loss_prevention_json TEXT, -- JSON object of InsuranceLossPrevention
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS corrective_actions (
  id TEXT PRIMARY KEY,
  finding_id TEXT UNIQUE NOT NULL,
  problem_statement TEXT NOT NULL,
  immediate_correction TEXT NOT NULL,
  root_cause_method TEXT NOT NULL, -- '5 Why' | 'Fishbone' | 'Fault Tree' | 'Other'
  root_cause_details TEXT NOT NULL,
  five_whys TEXT, -- JSON array
  fishbone_json TEXT, -- JSON object
  corrective_action_plan TEXT NOT NULL,
  responsible_person TEXT NOT NULL,
  target_date TEXT NOT NULL,
  required_resources TEXT NOT NULL,
  completion_date TEXT,
  evidence_description TEXT,
  
  -- DECISION 1: Implementation Verification
  implementation_decision TEXT, -- 'Pending' | 'Implemented & Validated' | 'Rejected - Incomplete'
  implementation_reviewer TEXT,
  implementation_date TEXT,
  implementation_evidence TEXT,

  -- DECISION 2: Sustained Effectiveness Evaluation
  effectiveness_decision TEXT, -- 'Pending' | 'Verified Effective (Sustained)' | 'Ineffective (Recurrence Observed)'
  effectiveness_reviewer TEXT,
  effectiveness_date TEXT,
  effectiveness_evidence TEXT,
  evaluation_window_days INTEGER DEFAULT 60,

  -- Cross-System Enterprise Impact & Traceability
  affected_procedures_json TEXT,
  affected_risks_json TEXT,
  affected_competencies_json TEXT,
  insurance_loss_prevention_json TEXT,

  -- Legacy fields
  effectiveness_verification TEXT,
  verified_by TEXT,
  verification_date TEXT,
  closure_decision TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY,
  finding_id TEXT NOT NULL,
  audit_id TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  actual_date TEXT,
  conducted_by TEXT NOT NULL,
  verification_notes TEXT NOT NULL,
  effectiveness_result TEXT NOT NULL,
  decision TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE,
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_data_base64 TEXT,
  mime_type TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'Rev 1.0',
  owner TEXT NOT NULL,
  confidentiality TEXT NOT NULL DEFAULT 'Confidential',
  related_audit_id TEXT,
  related_finding_id TEXT,
  related_capa_id TEXT,
  related_checklist_item_id TEXT,
  description TEXT,
  uploaded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  link_module TEXT,
  link_id TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_trail (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_identifier TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_audits_program ON audits(program_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_findings_audit ON findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_capa_finding ON corrective_actions(finding_id);
CREATE INDEX IF NOT EXISTS idx_responses_audit ON audit_responses(audit_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_cl ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_table ON audit_trail(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
`;
