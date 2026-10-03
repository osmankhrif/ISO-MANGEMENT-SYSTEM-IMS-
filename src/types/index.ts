export type UserRole =
  | 'Administrator'
  | 'Audit Manager'
  | 'Lead Auditor'
  | 'Auditor'
  | 'Department Manager'
  | 'Viewer';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: string;
  active: boolean;
  createdAt: string;
}

export interface Auditor {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  position: string;
  isLead: boolean;
  qualification: string;
  training: string;
  experienceYears: number;
  competencyLevel: 'Trainee' | 'Competent' | 'Senior' | 'Lead' | 'Expert';
  standardsQualified: string[]; // e.g. ["ISO 9001", "ISO 14001", "ISO 45001"]
  auditHours: number;
  numberOfAudits: number;
  performanceRating: number; // 1 to 5
  notes?: string;
}

export interface Standard {
  id: string;
  code: string; // e.g. "ISO 9001:2015"
  title: string;
  revisionYear: string;
  issuingBody: string; // "ISO", "API", "Internal", "Regulatory"
  description: string;
  category: 'Quality' | 'HSE' | 'Energy' | 'Asset' | 'Operational' | 'Legal';
  isActive: boolean;
  clauses?: Clause[];
}

export interface Clause {
  id: string;
  standardId: string;
  clauseNumber: string; // e.g. "4.1", "9.2.1"
  title: string;
  description: string;
  parentClauseId?: string;
  requirements?: Requirement[];
}

export interface Requirement {
  id: string;
  clauseId: string;
  requirementCode: string;
  title: string;
  requirementText: string;
  evidenceGuidance: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface AuditProgram {
  id: string;
  programYear: number;
  title: string;
  description: string;
  status: 'Draft' | 'Approved' | 'In Progress' | 'Completed' | 'Archived';
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  approvedAt?: string;
  totalPlanned: number;
  audits?: Audit[];
}

export type AuditType =
  | 'Internal Audit'
  | 'Process Audit'
  | 'Compliance Audit'
  | 'HSE Audit'
  | 'Quality Audit'
  | 'Environmental Audit'
  | 'Operational Audit'
  | 'Contractor Audit'
  | 'Follow-Up Audit'
  | 'Management System Audit';

export type AuditStatus = 'Planned' | 'In Progress' | 'Under Review' | 'Completed' | 'Cancelled';
export type AuditPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export const PLANT_SITES = [
  'Baytown Refinery Complex',
  'Beaumont Olefins & Aromatics Plant',
  'Pasadena Bulk Chemical Terminal',
  'Mont Belvieu Gas Fractionation & Cogen',
  'Corpus Christi Marine Terminal & Storage',
] as const;

export type PlantSite = (typeof PLANT_SITES)[number];

export interface Audit {
  id: string;
  auditNumber: string; // e.g. "AUD-2026-001"
  programId: string;
  title: string;
  auditType: AuditType;
  department: string;
  area: string; // e.g. "Refinery Unit 4 (CDU)", "Tank Farm B", "Offshore Jetty"
  site?: string; // e.g. "Baytown Refinery Complex"
  process: string; // e.g. "Hydrocracking Process", "Hazardous Waste Management"
  standardIds: string[]; // e.g. ["ISO 9001", "ISO 14001"]
  criteria: string;
  leadAuditorId: string;
  teamAuditorIds: string[];
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  riskLikelihood: number; // 1 to 5
  riskConsequence: number; // 1 to 5
  riskScore: number; // 1 to 25
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  status: AuditStatus;
  priority: AuditPriority;
  scope: string;
  objectives: string;
  specialInstructions?: string;
  previousFindingsSummary?: string;
  knownRisks?: string;
  executiveSummary?: string;
  conclusion?: string;
  approvedBy?: string;
  isDemo?: boolean;
}

export type ChecklistResponse =
  | 'Conforming'
  | 'Nonconforming'
  | 'Observation'
  | 'Opportunity for Improvement'
  | 'Not Applicable';

export interface Checklist {
  id: string;
  auditId?: string;
  standardId: string;
  title: string;
  description: string;
  department: string;
  process: string;
  isTemplate: boolean;
  items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  requirementId?: string;
  clauseNumber: string;
  standardCode: string;
  requirement: string;
  question: string;
  evidenceRequired: string;
  department: string;
  process: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  sortOrder: number;
}

export interface AuditResponseRecord {
  id: string;
  auditId: string;
  checklistItemId: string;
  responseValue: ChecklistResponse;
  auditorNotes: string;
  objectiveEvidence: string;
  interviewNotes?: string;
  evaluatedBy: string;
  evaluatedAt: string;
}

export type FindingCategory =
  | 'Major Nonconformity'
  | 'Minor Nonconformity'
  | 'Observation'
  | 'Opportunity for Improvement';

export type FindingStatus =
  | 'Open'
  | 'Under Investigation'
  | 'Corrective Action Submitted'
  | 'Verification Pending'
  | 'Closed'
  | 'Rejected';

export interface ProcedureLink {
  id: string;
  code: string; // e.g. "SOP-PR-04"
  title: string; // e.g. "High-Pressure Flange Make-up & Torqueing"
  currentRevision: string; // e.g. "Rev 2.1"
  revisionRequired: boolean;
  targetRevision?: string; // e.g. "Rev 3.0"
  status: 'Current' | 'Needs Revision' | 'In Revision' | 'Approved';
  owner: string;
}

export interface RiskLink {
  id: string;
  riskCode: string; // e.g. "RSK-OPS-014"
  riskTitle: string; // e.g. "Primary Containment Loss at Crude Column"
  category: 'Operational' | 'Environmental' | 'Occupational Health & Safety' | 'Regulatory';
  preLikelihood: number; // 1-5
  preConsequence: number; // 1-5
  preRiskScore: number; // 1-25
  residualLikelihood: number; // 1-5
  residualConsequence: number; // 1-5
  residualRiskScore: number; // 1-25
  riskRegisterUpdated: boolean;
  reviewedBy?: string;
}

export interface CompetenceLink {
  id: string;
  targetRoleOrPerson: string; // e.g. "Hydrocracking Unit Field Operators"
  requiredCompetency: string; // e.g. "API 570 Hot Torque Verification Protocol"
  gapIdentified: string; // e.g. "Torque sequence not verified by cross-check"
  reTrainingRequired: boolean;
  trainingDueDate?: string;
  completionDate?: string;
  signoffStatus: 'Required' | 'Scheduled' | 'Completed' | 'Verified';
  trainerOrVerifier?: string;
}

export interface InsuranceLossPrevention {
  exposureCategory: 'Business Interruption' | 'Asset Physical Damage' | 'Fire & Explosion Hazard' | 'Environmental Impairment' | 'Statutory Liability';
  financialExposureBracket: 'Negligible (<$10k)' | 'Low ($10k-$50k)' | 'Moderate ($50k-$250k)' | 'Severe ($250k-$1M)' | 'Catastrophic (>$1M)';
  businessInterruptionRiskDays: number;
  underwriterWarrantyImpact: boolean;
  lossControlRecommendation: string;
  underwritingAuditStatus: 'Open Risk Item' | 'Mitigation Verified' | 'Endorsed by Surveyor';
}

export interface Finding {
  id: string;
  findingNumber: string; // e.g. "NC-2026-004"
  auditId: string;
  checklistItemId?: string;
  dateIdentified: string;
  category: FindingCategory;
  department: string;
  process: string;
  standardCode: string;
  clauseNumber: string;
  requirementText: string;
  description: string;
  objectiveEvidence: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  responsiblePerson: string;
  dueDate: string;
  status: FindingStatus;
  closureDate?: string;
  closedBy?: string;
  isRepeat: boolean;
  rootCauseSummary?: string;
  isDemo?: boolean;
  affectedProcedures?: ProcedureLink[];
  affectedRisks?: RiskLink[];
  affectedCompetencies?: CompetenceLink[];
  insuranceLossPrevention?: InsuranceLossPrevention;
}

export type RootCauseMethod = '5 Why' | 'Fishbone' | 'Fault Tree' | 'Other';

export interface CorrectiveAction {
  id: string;
  findingId: string;
  problemStatement: string;
  immediateCorrection: string;
  rootCauseMethod: RootCauseMethod;
  rootCauseDetails: string;
  fiveWhys?: string[]; // Array of 5 why questions & answers
  fishboneJson?: {
    manpower: string[];
    machine: string[];
    method: string[];
    material: string[];
    measurement: string[];
    environment: string[];
  };
  correctiveActionPlan: string;
  responsiblePerson: string;
  targetDate: string;
  requiredResources: string;
  completionDate?: string;
  evidenceDescription?: string;

  // --- DECISION 1: Implementation Verification (Action physically put in place) ---
  implementationDecision?: 'Pending' | 'Implemented & Validated' | 'Rejected - Incomplete';
  implementationReviewer?: string;
  implementationDate?: string;
  implementationEvidence?: string; // Physical work order #, certificate, photo tag, MOC ID

  // --- DECISION 2: Sustained Effectiveness Evaluation (Recurrence prevented over time) ---
  effectivenessDecision?: 'Pending' | 'Verified Effective (Sustained)' | 'Ineffective (Recurrence Observed)';
  effectivenessReviewer?: string; // Independent Lead Auditor / Quality Director
  effectivenessDate?: string;
  effectivenessEvidence?: string; // Re-audit run data, sample batch pass, zero recurrence proof
  evaluationWindowDays?: 30 | 60 | 90 | 120; // Observation evaluation window

  // Legacy fields kept for backward compatibility
  effectivenessVerification?: string;
  verifiedBy?: string;
  verificationDate?: string;
  closureDecision?: 'Effective - Close Finding' | 'Ineffective - Reopen Action' | 'Pending Review';

  // --- CROSS-ENTERPRISE IMPACT & TRACEABILITY CASCADE ---
  affectedProcedures?: ProcedureLink[];
  affectedRisks?: RiskLink[];
  affectedCompetencies?: CompetenceLink[];
  insuranceLossPrevention?: InsuranceLossPrevention;

  status: 'Draft' | 'Submitted' | 'Under Verification' | 'Verified Effective' | 'Rejected';
}

export interface FollowUpRecord {
  id: string;
  findingId: string;
  auditId: string;
  scheduledDate: string;
  actualDate?: string;
  conductedBy: string;
  verificationNotes: string;
  effectivenessResult: 'Effective' | 'Partially Effective' | 'Ineffective';
  decision: 'Close Finding' | 'Require Additional Action' | 'Re-audit';
  createdAt: string;
}

export interface DocumentEvidence {
  id: string;
  name: string;
  fileType: 'pdf' | 'word' | 'excel' | 'image' | 'text' | 'other';
  fileSize: number; // in bytes
  fileDataBase64?: string; // stored base64 or object URL
  mimeType: string;
  revision: string;
  owner: string;
  confidentiality: 'Public' | 'Internal' | 'Confidential' | 'Strictly Restricted';
  relatedAuditId?: string;
  relatedFindingId?: string;
  relatedCapaId?: string;
  relatedChecklistItemId?: string;
  description: string;
  uploadedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  linkModule?: string;
  linkId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditTrailLog {
  id: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'VERIFY' | 'CLOSE' | 'BACKUP' | 'RESTORE';
  tableName: string;
  recordId: string;
  recordIdentifier: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface SystemSettings {
  companyName: string;
  facilityName: string;
  companyLogoBase64?: string;
  address: string;
  defaultLeadAuditor: string;
  autoBackupIntervalHours: number;
  lastBackupDate?: string;
  riskMatrixThresholds: {
    low: number; // 1-6
    medium: number; // 7-12
    high: number; // 13-19
    critical: number; // 20-25
  };
  customReportDisclaimer: string;
  offlineMode: boolean;
}

export interface DashboardMetrics {
  totalAudits: number;
  plannedAudits: number;
  auditsInProgress: number;
  completedAudits: number;
  openFindings: number;
  criticalFindings: number;
  overdueCorrectiveActions: number;
  closedFindings: number;
  correctiveActionEffectiveness: number; // percentage
  auditCompletionRate: number; // percentage
  findingsByDepartment: { department: string; count: number; critical: number }[];
  findingsBySeverity: { category: FindingCategory; count: number; color: string }[];
  monthlyAuditTrend: { month: string; planned: number; completed: number }[];
  recurringFindingsCount: number;
}
