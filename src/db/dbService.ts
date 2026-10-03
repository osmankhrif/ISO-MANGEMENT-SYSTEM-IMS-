import { sqlite } from './sqliteEngine.ts';
import { SEED_DATA_SQL } from './seedData.ts';
import {
  Audit,
  Auditor,
  AuditProgram,
  AuditResponseRecord,
  AuditTrailLog,
  Checklist,
  ChecklistItem,
  CorrectiveAction,
  DashboardMetrics,
  DocumentEvidence,
  Finding,
  FollowUpRecord,
  NotificationItem,
  Standard,
  SystemSettings,
  User,
  PLANT_SITES,
} from '../types/index.ts';

export class DbService {
  // ===================== AUDIT TRAIL =====================
  static logAudit(
    userName: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'VERIFY' | 'CLOSE' | 'BACKUP' | 'RESTORE',
    tableName: string,
    recordId: string,
    recordIdentifier: string,
    previousValue?: string,
    newValue?: string
  ): void {
    const id = `tr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    sqlite.run(
      `INSERT INTO audit_trail (id, user_name, action, table_name, record_id, record_identifier, previous_value, new_value, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userName, action, tableName, recordId, recordIdentifier, previousValue || null, newValue || null, now]
    );
  }

  static getAuditTrail(limit = 100): AuditTrailLog[] {
    const rows = sqlite.query<any>(
      `SELECT id, user_name as userName, action, table_name as tableName, record_id as recordId,
              record_identifier as recordIdentifier, previous_value as previousValue, new_value as newValue,
              timestamp
       FROM audit_trail ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );
    return rows;
  }

  // ===================== DASHBOARD METRICS =====================
  static getDashboardMetrics(): DashboardMetrics {
    const totalAuditsRow = sqlite.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM audits');
    const plannedAuditsRow = sqlite.queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM audits WHERE status = 'Planned'");
    const inProgressRow = sqlite.queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM audits WHERE status = 'In Progress'");
    const completedRow = sqlite.queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM audits WHERE status = 'Completed'");

    const openFindingsRow = sqlite.queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM findings WHERE status != 'Closed' AND status != 'Rejected'");
    const criticalFindingsRow = sqlite.queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM findings WHERE risk_level = 'Critical' AND status != 'Closed'");
    const closedFindingsRow = sqlite.queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM findings WHERE status = 'Closed'");
    const recurringRow = sqlite.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM findings WHERE is_repeat = 1');

    // Overdue Corrective Actions: where target_date < current date and status != 'Verified Effective'
    const today = new Date().toISOString().split('T')[0];
    const overdueCapaRow = sqlite.queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM corrective_actions
       WHERE target_date < ? AND status != 'Verified Effective'`,
      [today]
    );

    // CA Effectiveness: percentage of completed CAPA verified as effective
    const totalVerifiedCapa = sqlite.queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM corrective_actions WHERE status = 'Verified Effective' OR closure_decision LIKE 'Effective%'"
    );
    const totalSubmittedCapa = sqlite.queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM corrective_actions WHERE status != 'Draft'"
    );
    const caEffectiveness = totalSubmittedCapa?.cnt && totalSubmittedCapa.cnt > 0
      ? Math.round(((totalVerifiedCapa?.cnt || 0) / totalSubmittedCapa.cnt) * 100)
      : 88;

    const totalAudits = totalAuditsRow?.cnt || 0;
    const completedAudits = completedRow?.cnt || 0;
    const completionRate = totalAudits > 0 ? Math.round((completedAudits / totalAudits) * 100) : 0;

    // Findings by Department
    const deptRows = sqlite.query<{ department: string; count: number; critical: number }>(
      `SELECT department, COUNT(*) as count,
              SUM(CASE WHEN risk_level = 'Critical' THEN 1 ELSE 0 END) as critical
       FROM findings
       GROUP BY department
       ORDER BY count DESC`
    );

    // Findings by Severity
    const severityRows = sqlite.query<{ category: string; count: number }>(
      `SELECT category, COUNT(*) as count FROM findings GROUP BY category`
    );

    const severityMap: Record<string, string> = {
      'Major Nonconformity': '#ef4444',
      'Minor Nonconformity': '#f59e0b',
      'Observation': '#3b82f6',
      'Opportunity for Improvement': '#10b981',
    };

    const findingsBySeverity = ['Major Nonconformity', 'Minor Nonconformity', 'Observation', 'Opportunity for Improvement'].map(cat => {
      const match = severityRows.find(r => r.category === cat);
      return {
        category: cat as any,
        count: match ? match.count : 0,
        color: severityMap[cat] || '#64748b',
      };
    });

    // Monthly Audit Trend (Jan - Dec 2026)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyAuditTrend = months.map((month, idx) => {
      const monthNumber = String(idx + 1).padStart(2, '0');
      const planned = sqlite.queryOne<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM audits WHERE planned_start_date LIKE '2026-${monthNumber}%'`
      )?.cnt || 0;
      const completed = sqlite.queryOne<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM audits WHERE actual_end_date LIKE '2026-${monthNumber}%' AND status = 'Completed'`
      )?.cnt || 0;
      return { month, planned, completed };
    });

    return {
      totalAudits,
      plannedAudits: plannedAuditsRow?.cnt || 0,
      auditsInProgress: inProgressRow?.cnt || 0,
      completedAudits,
      openFindings: openFindingsRow?.cnt || 0,
      criticalFindings: criticalFindingsRow?.cnt || 0,
      overdueCorrectiveActions: overdueCapaRow?.cnt || 0,
      closedFindings: closedFindingsRow?.cnt || 0,
      correctiveActionEffectiveness: caEffectiveness,
      auditCompletionRate: completionRate,
      findingsByDepartment: deptRows,
      findingsBySeverity,
      monthlyAuditTrend,
      recurringFindingsCount: recurringRow?.cnt || 0,
    };
  }

  // ===================== AUDITS =====================
  static deriveSite(area?: string, department?: string): string {
    const combined = `${area || ''} ${department || ''}`.toLowerCase();
    if (combined.includes('beaumont') || combined.includes('flare') || combined.includes('effluent') || combined.includes('aromatic') || combined.includes('sulfolane')) {
      return 'Beaumont Olefins & Aromatics Plant';
    }
    if (combined.includes('pasadena') || combined.includes('tank farm') || combined.includes('mogas') || combined.includes('laboratory') || combined.includes('truck') || combined.includes('rail') || combined.includes('offloading')) {
      return 'Pasadena Bulk Chemical Terminal';
    }
    if (combined.includes('mont belvieu') || combined.includes('boiler') || combined.includes('turbine') || combined.includes('steam') || combined.includes('cogen') || combined.includes('diesel') || combined.includes('substation') || combined.includes('generator')) {
      return 'Mont Belvieu Gas Fractionation & Cogen';
    }
    if (combined.includes('corpus') || combined.includes('marine') || combined.includes('jetty') || combined.includes('dock') || combined.includes('tanker') || combined.includes('berth')) {
      return 'Corpus Christi Marine Terminal & Storage';
    }
    return 'Baytown Refinery Complex';
  }

  static getPlantSites(): string[] {
    return [...PLANT_SITES];
  }

  static rescheduleAudit(id: string, plannedStartDate: string, plannedEndDate: string, userName: string): Audit | null {
    const audit = this.getAuditById(id);
    if (!audit) return null;
    sqlite.run('UPDATE audits SET planned_start_date = ?, planned_end_date = ? WHERE id = ?', [plannedStartDate, plannedEndDate, id]);
    this.logAudit(userName, 'UPDATE', 'audits', id, audit.auditNumber, `${audit.plannedStartDate} -> ${audit.plannedEndDate}`, `${plannedStartDate} -> ${plannedEndDate}`);
    return this.getAuditById(id);
  }

  static getAudits(filter?: { status?: string; auditType?: string; department?: string; site?: string; search?: string }): Audit[] {
    try {
      const countCheck = sqlite.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM audits');
      if (countCheck && countCheck.cnt < 14) {
        sqlite.exec(SEED_DATA_SQL);
      }
    } catch {
      // non-blocking fallback
    }

    let sql = `SELECT * FROM audits WHERE 1=1`;
    const params: any[] = [];

    if (filter?.status && filter.status !== 'All') {
      sql += ` AND status = ?`;
      params.push(filter.status);
    }
    if (filter?.auditType && filter.auditType !== 'All') {
      sql += ` AND audit_type = ?`;
      params.push(filter.auditType);
    }
    if (filter?.department && filter.department !== 'All') {
      sql += ` AND department = ?`;
      params.push(filter.department);
    }
    if (filter?.site && filter.site !== 'All') {
      sql += ` AND site = ?`;
      params.push(filter.site);
    }
    if (filter?.search) {
      sql += ` AND (title LIKE ? OR audit_number LIKE ? OR area LIKE ? OR process LIKE ? OR site LIKE ?)`;
      const term = `%${filter.search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ` ORDER BY planned_start_date ASC`;

    const rows = sqlite.query<any>(sql, params);
    return rows.map(r => ({
      id: r.id,
      auditNumber: r.audit_number,
      programId: r.program_id,
      title: r.title,
      auditType: r.audit_type,
      department: r.department,
      area: r.area,
      site: r.site || DbService.deriveSite(r.area, r.department),
      process: r.process,
      standardIds: JSON.parse(r.standard_ids || '[]'),
      criteria: r.criteria,
      leadAuditorId: r.lead_auditor_id,
      teamAuditorIds: JSON.parse(r.team_auditor_ids || '[]'),
      plannedStartDate: r.planned_start_date,
      plannedEndDate: r.planned_end_date,
      actualStartDate: r.actual_start_date || undefined,
      actualEndDate: r.actual_end_date || undefined,
      riskLikelihood: r.risk_likelihood,
      riskConsequence: r.risk_consequence,
      riskScore: r.risk_score,
      riskLevel: r.risk_level,
      status: r.status,
      priority: r.priority,
      scope: r.scope,
      objectives: r.objectives,
      specialInstructions: r.special_instructions || undefined,
      previousFindingsSummary: r.previous_findings_summary || undefined,
      knownRisks: r.known_risks || undefined,
      executiveSummary: r.executive_summary || undefined,
      conclusion: r.conclusion || undefined,
      approvedBy: r.approved_by || undefined,
      isDemo: Boolean(r.is_demo),
    }));
  }

  static getAuditById(id: string): Audit | null {
    const r = sqlite.queryOne<any>('SELECT * FROM audits WHERE id = ?', [id]);
    if (!r) return null;
    return {
      id: r.id,
      auditNumber: r.audit_number,
      programId: r.program_id,
      title: r.title,
      auditType: r.audit_type,
      department: r.department,
      area: r.area,
      site: r.site || DbService.deriveSite(r.area, r.department),
      process: r.process,
      standardIds: JSON.parse(r.standard_ids || '[]'),
      criteria: r.criteria,
      leadAuditorId: r.lead_auditor_id,
      teamAuditorIds: JSON.parse(r.team_auditor_ids || '[]'),
      plannedStartDate: r.planned_start_date,
      plannedEndDate: r.planned_end_date,
      actualStartDate: r.actual_start_date || undefined,
      actualEndDate: r.actual_end_date || undefined,
      riskLikelihood: r.risk_likelihood,
      riskConsequence: r.risk_consequence,
      riskScore: r.risk_score,
      riskLevel: r.risk_level,
      status: r.status,
      priority: r.priority,
      scope: r.scope,
      objectives: r.objectives,
      specialInstructions: r.special_instructions || undefined,
      previousFindingsSummary: r.previous_findings_summary || undefined,
      knownRisks: r.known_risks || undefined,
      executiveSummary: r.executive_summary || undefined,
      conclusion: r.conclusion || undefined,
      approvedBy: r.approved_by || undefined,
      isDemo: Boolean(r.is_demo),
    };
  }

  static saveAudit(audit: Partial<Audit>, userName: string): Audit {
    const isNew = !audit.id;
    const id = audit.id || `aud-${Date.now()}`;
    const auditNumber = audit.auditNumber || `AUD-2026-${Math.floor(100 + Math.random() * 900)}`;

    const riskScore = (audit.riskLikelihood || 3) * (audit.riskConsequence || 3);
    let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
    if (riskScore >= 20) riskLevel = 'Critical';
    else if (riskScore >= 12) riskLevel = 'High';
    else if (riskScore >= 6) riskLevel = 'Medium';
    else riskLevel = 'Low';

    const resolvedSite = audit.site || DbService.deriveSite(audit.area, audit.department);

    if (isNew) {
      sqlite.run(
        `INSERT INTO audits (
          id, audit_number, program_id, title, audit_type, department, area, site, process,
          standard_ids, criteria, lead_auditor_id, team_auditor_ids, planned_start_date, planned_end_date,
          actual_start_date, actual_end_date, risk_likelihood, risk_consequence, risk_score, risk_level,
          status, priority, scope, objectives, special_instructions, previous_findings_summary, known_risks,
          executive_summary, conclusion, approved_by, is_demo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          auditNumber,
          audit.programId || 'prg-2026',
          audit.title || 'Untitled Audit',
          audit.auditType || 'Internal Audit',
          audit.department || 'Refinery Operations',
          audit.area || '',
          resolvedSite,
          audit.process || '',
          JSON.stringify(audit.standardIds || ['ISO 9001']),
          audit.criteria || '',
          audit.leadAuditorId || 'aud-1',
          JSON.stringify(audit.teamAuditorIds || []),
          audit.plannedStartDate || new Date().toISOString().split('T')[0],
          audit.plannedEndDate || new Date().toISOString().split('T')[0],
          audit.actualStartDate || null,
          audit.actualEndDate || null,
          audit.riskLikelihood || 3,
          audit.riskConsequence || 3,
          riskScore,
          riskLevel,
          audit.status || 'Planned',
          audit.priority || 'Medium',
          audit.scope || '',
          audit.objectives || '',
          audit.specialInstructions || null,
          audit.previousFindingsSummary || null,
          audit.knownRisks || null,
          audit.executiveSummary || null,
          audit.conclusion || null,
          audit.approvedBy || null,
          audit.isDemo ? 1 : 0,
        ]
      );
      this.logAudit(userName, 'CREATE', 'audits', id, auditNumber, undefined, `Created audit ${audit.title}`);
    } else {
      const prev = this.getAuditById(id);
      sqlite.run(
        `UPDATE audits SET
          title = ?, audit_type = ?, department = ?, area = ?, site = ?, process = ?,
          standard_ids = ?, criteria = ?, lead_auditor_id = ?, team_auditor_ids = ?,
          planned_start_date = ?, planned_end_date = ?, actual_start_date = ?, actual_end_date = ?,
          risk_likelihood = ?, risk_consequence = ?, risk_score = ?, risk_level = ?,
          status = ?, priority = ?, scope = ?, objectives = ?, special_instructions = ?,
          previous_findings_summary = ?, known_risks = ?, executive_summary = ?, conclusion = ?, approved_by = ?
         WHERE id = ?`,
        [
          audit.title,
          audit.auditType,
          audit.department,
          audit.area,
          resolvedSite,
          audit.process,
          JSON.stringify(audit.standardIds || []),
          audit.criteria,
          audit.leadAuditorId,
          JSON.stringify(audit.teamAuditorIds || []),
          audit.plannedStartDate,
          audit.plannedEndDate,
          audit.actualStartDate || null,
          audit.actualEndDate || null,
          audit.riskLikelihood || 3,
          audit.riskConsequence || 3,
          riskScore,
          riskLevel,
          audit.status,
          audit.priority,
          audit.scope,
          audit.objectives,
          audit.specialInstructions || null,
          audit.previousFindingsSummary || null,
          audit.knownRisks || null,
          audit.executiveSummary || null,
          audit.conclusion || null,
          audit.approvedBy || null,
          id,
        ]
      );
      this.logAudit(userName, 'UPDATE', 'audits', id, auditNumber, JSON.stringify(prev), JSON.stringify(audit));
    }

    return this.getAuditById(id)!;
  }

  static deleteAudit(id: string, userName: string): void {
    const prev = this.getAuditById(id);
    if (!prev) return;
    sqlite.run('DELETE FROM audits WHERE id = ?', [id]);
    this.logAudit(userName, 'DELETE', 'audits', id, prev.auditNumber, JSON.stringify(prev), undefined);
  }

  // ===================== AUDIT PROGRAMS =====================
  static getAuditPrograms(): AuditProgram[] {
    const rows = sqlite.query<any>('SELECT * FROM audit_programs ORDER BY program_year DESC');
    return rows.map(r => ({
      id: r.id,
      programYear: r.program_year,
      title: r.title,
      description: r.description,
      status: r.status,
      approvalStatus: r.approval_status,
      approvedBy: r.approved_by || undefined,
      approvedAt: r.approved_at || undefined,
      totalPlanned: r.total_planned,
    }));
  }

  static saveAuditProgram(program: Partial<AuditProgram>, userName: string): AuditProgram {
    const isNew = !program.id;
    const id = program.id || `prg-${program.programYear || new Date().getFullYear()}`;

    if (isNew) {
      sqlite.run(
        `INSERT INTO audit_programs (id, program_year, title, description, status, approval_status, approved_by, approved_at, total_planned)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          program.programYear || new Date().getFullYear(),
          program.title || 'Annual Audit Program',
          program.description || '',
          program.status || 'Draft',
          program.approvalStatus || 'Pending',
          program.approvedBy || null,
          program.approvedAt || null,
          program.totalPlanned || 0,
        ]
      );
      this.logAudit(userName, 'CREATE', 'audit_programs', id, program.title || 'Audit Program');
    } else {
      sqlite.run(
        `UPDATE audit_programs SET
          program_year = ?, title = ?, description = ?, status = ?, approval_status = ?,
          approved_by = ?, approved_at = ?, total_planned = ?
         WHERE id = ?`,
        [
          program.programYear,
          program.title,
          program.description,
          program.status,
          program.approvalStatus,
          program.approvedBy || null,
          program.approvedAt || null,
          program.totalPlanned || 0,
          id,
        ]
      );
      this.logAudit(userName, 'UPDATE', 'audit_programs', id, program.title || 'Audit Program');
    }

    return this.getAuditPrograms().find(p => p.id === id)!;
  }

  // ===================== AUDITORS =====================
  static getAuditors(): Auditor[] {
    const rows = sqlite.query<any>('SELECT * FROM auditors ORDER BY name ASC');
    return rows.map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      name: r.name,
      email: r.email,
      department: r.department,
      position: r.position,
      isLead: Boolean(r.is_lead),
      qualification: r.qualification,
      training: r.training,
      experienceYears: r.experience_years,
      competencyLevel: r.competency_level,
      standardsQualified: JSON.parse(r.standards_qualified || '[]'),
      auditHours: r.audit_hours,
      numberOfAudits: r.number_of_audits,
      performanceRating: r.performance_rating,
      notes: r.notes || undefined,
    }));
  }

  static saveAuditor(auditor: Partial<Auditor>, userName: string): Auditor {
    const isNew = !auditor.id;
    const id = auditor.id || `aud-${Date.now()}`;
    const empId = auditor.employeeId || `EMP-${Math.floor(700 + Math.random() * 200)}`;

    if (isNew) {
      sqlite.run(
        `INSERT INTO auditors (
          id, employee_id, name, email, department, position, is_lead, qualification,
          training, experience_years, competency_level, standards_qualified, audit_hours,
          number_of_audits, performance_rating, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          empId,
          auditor.name || 'New Auditor',
          auditor.email || '',
          auditor.department || 'Operations',
          auditor.position || 'Auditor',
          auditor.isLead ? 1 : 0,
          auditor.qualification || 'Certified Auditor',
          auditor.training || 'ISO Auditing',
          auditor.experienceYears || 1,
          auditor.competencyLevel || 'Competent',
          JSON.stringify(auditor.standardsQualified || ['ISO 9001']),
          auditor.auditHours || 0,
          auditor.numberOfAudits || 0,
          auditor.performanceRating || 4.5,
          auditor.notes || null,
        ]
      );
      this.logAudit(userName, 'CREATE', 'auditors', id, auditor.name || 'Auditor');
    } else {
      sqlite.run(
        `UPDATE auditors SET
          employee_id = ?, name = ?, email = ?, department = ?, position = ?, is_lead = ?,
          qualification = ?, training = ?, experience_years = ?, competency_level = ?,
          standards_qualified = ?, audit_hours = ?, number_of_audits = ?, performance_rating = ?, notes = ?
         WHERE id = ?`,
        [
          auditor.employeeId,
          auditor.name,
          auditor.email,
          auditor.department,
          auditor.position,
          auditor.isLead ? 1 : 0,
          auditor.qualification,
          auditor.training,
          auditor.experienceYears,
          auditor.competencyLevel,
          JSON.stringify(auditor.standardsQualified || []),
          auditor.auditHours,
          auditor.numberOfAudits,
          auditor.performanceRating,
          auditor.notes || null,
          id,
        ]
      );
      this.logAudit(userName, 'UPDATE', 'auditors', id, auditor.name || 'Auditor');
    }

    return this.getAuditors().find(a => a.id === id)!;
  }

  static getAuditorById(id: string): Auditor | null {
    const auditors = this.getAuditors();
    return auditors.find(a => a.id === id) || null;
  }

  static updateAuditorName(id: string, newName: string, userName: string): Auditor | null {
    const auditor = this.getAuditorById(id);
    if (!auditor) return null;
    sqlite.run('UPDATE auditors SET name = ? WHERE id = ?', [newName.trim(), id]);
    this.logAudit(userName, 'UPDATE', 'auditors', id, auditor.name, auditor.name, newName.trim());
    return this.getAuditorById(id);
  }

  static deleteAuditor(id: string, userName: string): boolean {
    const auditor = this.getAuditorById(id);
    if (!auditor) return false;
    sqlite.run('DELETE FROM auditors WHERE id = ?', [id]);
    this.logAudit(userName, 'DELETE', 'auditors', id, auditor.name);
    return true;
  }

  // ===================== STANDARDS & CLAUSES =====================
  static getStandards(): Standard[] {
    const standards = sqlite.query<any>('SELECT * FROM standards ORDER BY code ASC');
    return standards.map(s => {
      const clauses = sqlite.query<any>(
        'SELECT * FROM clauses WHERE standard_id = ? ORDER BY clause_number ASC',
        [s.id]
      );
      return {
        id: s.id,
        code: s.code,
        title: s.title,
        revisionYear: s.revision_year,
        issuingBody: s.issuing_body,
        description: s.description,
        category: s.category,
        isActive: Boolean(s.is_active),
        clauses: clauses.map(c => {
          const reqs = sqlite.query<any>(
            'SELECT * FROM requirements WHERE clause_id = ? ORDER BY requirement_code ASC',
            [c.id]
          );
          return {
            id: c.id,
            standardId: c.standard_id,
            clauseNumber: c.clause_number,
            title: c.title,
            description: c.description,
            parentClauseId: c.parent_clause_id || undefined,
            requirements: reqs.map(r => ({
              id: r.id,
              clauseId: r.clause_id,
              requirementCode: r.requirement_code,
              title: r.title,
              requirementText: r.requirement_text,
              evidenceGuidance: r.evidence_guidance,
              riskLevel: r.risk_level,
            })),
          };
        }),
      };
    });
  }

  static saveStandard(standard: Partial<Standard>, userName: string): Standard {
    const isNew = !standard.id;
    const id = standard.id || `std-${Date.now()}`;
    if (isNew) {
      sqlite.run(
        `INSERT INTO standards (id, code, title, revision_year, issuing_body, description, category, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          standard.code || 'ISO Custom',
          standard.title || 'New Standard',
          standard.revisionYear || '2026',
          standard.issuingBody || 'ISO',
          standard.description || '',
          standard.category || 'Quality',
          standard.isActive !== false ? 1 : 0,
        ]
      );
      this.logAudit(userName, 'CREATE', 'standards', id, standard.code || 'Standard');
    } else {
      sqlite.run(
        `UPDATE standards SET code = ?, title = ?, revision_year = ?, issuing_body = ?, description = ?, category = ?, is_active = ?
         WHERE id = ?`,
        [
          standard.code,
          standard.title,
          standard.revisionYear,
          standard.issuingBody,
          standard.description,
          standard.category,
          standard.isActive ? 1 : 0,
          id,
        ]
      );
      this.logAudit(userName, 'UPDATE', 'standards', id, standard.code || 'Standard');
    }
    return this.getStandards().find(s => s.id === id)!;
  }

  static saveClause(standardId: string, clauseNumber: string, title: string, description: string, userName: string): void {
    const id = `cls-${Date.now()}`;
    sqlite.run(
      `INSERT INTO clauses (id, standard_id, clause_number, title, description) VALUES (?, ?, ?, ?, ?)`,
      [id, standardId, clauseNumber, title, description]
    );
    this.logAudit(userName, 'CREATE', 'clauses', id, clauseNumber);
  }

  static saveRequirement(clauseId: string, code: string, title: string, text: string, guidance: string, riskLevel: string, userName: string): void {
    const id = `req-${Date.now()}`;
    sqlite.run(
      `INSERT INTO requirements (id, clause_id, requirement_code, title, requirement_text, evidence_guidance, risk_level)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, clauseId, code, title, text, guidance, riskLevel]
    );
    this.logAudit(userName, 'CREATE', 'requirements', id, code);
  }

  // ===================== CHECKLISTS & ITEMS =====================
  static getChecklists(auditId?: string): Checklist[] {
    let sql = 'SELECT * FROM checklists';
    const params: any[] = [];
    if (auditId) {
      sql += ' WHERE audit_id = ? OR is_template = 1';
      params.push(auditId);
    }
    sql += ' ORDER BY title ASC';

    const rows = sqlite.query<any>(sql, params);
    return rows.map(c => {
      const items = sqlite.query<any>(
        'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC, clause_number ASC',
        [c.id]
      );
      return {
        id: c.id,
        auditId: c.audit_id || undefined,
        standardId: c.standard_id,
        title: c.title,
        description: c.description,
        department: c.department,
        process: c.process,
        isTemplate: Boolean(c.is_template),
        items: items.map(i => ({
          id: i.id,
          checklistId: i.checklist_id,
          requirementId: i.requirement_id || undefined,
          clauseNumber: i.clause_number,
          standardCode: i.standard_code,
          requirement: i.requirement,
          question: i.question,
          evidenceRequired: i.evidence_required,
          department: i.department,
          process: i.process,
          riskLevel: i.risk_level,
          sortOrder: i.sort_order,
        })),
      };
    });
  }

  static getChecklistById(id: string): Checklist | null {
    const c = sqlite.queryOne<any>('SELECT * FROM checklists WHERE id = ?', [id]);
    if (!c) return null;
    const items = sqlite.query<any>(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC, clause_number ASC',
      [c.id]
    );
    return {
      id: c.id,
      auditId: c.audit_id || undefined,
      standardId: c.standard_id,
      title: c.title,
      description: c.description,
      department: c.department,
      process: c.process,
      isTemplate: Boolean(c.is_template),
      items: items.map(i => ({
        id: i.id,
        checklistId: i.checklist_id,
        requirementId: i.requirement_id || undefined,
        clauseNumber: i.clause_number,
        standardCode: i.standard_code,
        requirement: i.requirement,
        question: i.question,
        evidenceRequired: i.evidence_required,
        department: i.department,
        process: i.process,
        riskLevel: i.risk_level,
        sortOrder: i.sort_order,
      })),
    };
  }

  static saveChecklist(checklist: Partial<Checklist>, userName: string): Checklist {
    const isNew = !checklist.id;
    const id = checklist.id || `chk-${Date.now()}`;

    if (isNew) {
      sqlite.run(
        `INSERT INTO checklists (id, audit_id, standard_id, title, description, department, process, is_template)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          checklist.auditId || null,
          checklist.standardId || 'std-1',
          checklist.title || 'New Checklist',
          checklist.description || '',
          checklist.department || 'Refinery Operations',
          checklist.process || '',
          checklist.isTemplate ? 1 : 0,
        ]
      );
      this.logAudit(userName, 'CREATE', 'checklists', id, checklist.title || 'Checklist');
    } else {
      sqlite.run(
        `UPDATE checklists SET audit_id = ?, standard_id = ?, title = ?, description = ?, department = ?, process = ?, is_template = ?
         WHERE id = ?`,
        [
          checklist.auditId || null,
          checklist.standardId,
          checklist.title,
          checklist.description,
          checklist.department,
          checklist.process,
          checklist.isTemplate ? 1 : 0,
          id,
        ]
      );
      this.logAudit(userName, 'UPDATE', 'checklists', id, checklist.title || 'Checklist');
    }

    // Save or update items if provided
    if (checklist.items && checklist.items.length > 0) {
      checklist.items.forEach((item, idx) => {
        const itemId = item.id || `item-${Date.now()}-${idx}`;
        sqlite.run(
          `INSERT OR REPLACE INTO checklist_items (id, checklist_id, requirement_id, clause_number, standard_code, requirement, question, evidence_required, department, process, risk_level, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            id,
            item.requirementId || null,
            item.clauseNumber || '1.0',
            item.standardCode || 'ISO 9001',
            item.requirement || '',
            item.question || '',
            item.evidenceRequired || '',
            item.department || checklist.department || 'Operations',
            item.process || checklist.process || '',
            item.riskLevel || 'Medium',
            item.sortOrder ?? idx + 1,
          ]
        );
      });
    }

    return this.getChecklistById(id)!;
  }

  static duplicateChecklist(sourceChecklistId: string, newTitle: string, targetAuditId?: string, userName: string = 'User'): Checklist {
    const src = this.getChecklistById(sourceChecklistId);
    if (!src) throw new Error('Source checklist not found');
    const newId = `chk-${Date.now()}`;
    const newItems = (src.items || []).map((it, idx) => ({
      ...it,
      id: `item-${Date.now()}-${idx}`,
      checklistId: newId,
    }));

    return this.saveChecklist({
      id: newId,
      auditId: targetAuditId,
      standardId: src.standardId,
      title: newTitle,
      description: `Duplicated from ${src.title}`,
      department: src.department,
      process: src.process,
      isTemplate: false,
      items: newItems,
    }, userName);
  }

  // ===================== AUDIT RESPONSES =====================
  static getAuditResponses(auditId: string): AuditResponseRecord[] {
    const rows = sqlite.query<any>('SELECT * FROM audit_responses WHERE audit_id = ?', [auditId]);
    return rows.map(r => ({
      id: r.id,
      auditId: r.audit_id,
      checklistItemId: r.checklist_item_id,
      responseValue: r.response_value,
      auditorNotes: r.auditor_notes || '',
      objectiveEvidence: r.objective_evidence || '',
      interviewNotes: r.interview_notes || undefined,
      evaluatedBy: r.evaluated_by,
      evaluatedAt: r.evaluated_at,
    }));
  }

  static saveAuditResponse(resp: Partial<AuditResponseRecord>, userName: string): AuditResponseRecord {
    const id = resp.id || `resp-${Date.now()}`;
    const now = new Date().toISOString();
    sqlite.run(
      `INSERT OR REPLACE INTO audit_responses (id, audit_id, checklist_item_id, response_value, auditor_notes, objective_evidence, interview_notes, evaluated_by, evaluated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        resp.auditId!,
        resp.checklistItemId!,
        resp.responseValue || 'Conforming',
        resp.auditorNotes || '',
        resp.objectiveEvidence || '',
        resp.interviewNotes || null,
        resp.evaluatedBy || userName,
        resp.evaluatedAt || now,
      ]
    );

    // If response is Nonconforming, check if finding already exists or needs notification
    if (resp.responseValue === 'Nonconforming') {
      this.createNotification(
        'Nonconformance Logged in Field',
        `An auditor logged a Nonconforming response for checklist item in audit ${resp.auditId}.`,
        'warning',
        'findings',
        resp.auditId
      );
    }

    return {
      id,
      auditId: resp.auditId!,
      checklistItemId: resp.checklistItemId!,
      responseValue: resp.responseValue || 'Conforming',
      auditorNotes: resp.auditorNotes || '',
      objectiveEvidence: resp.objectiveEvidence || '',
      interviewNotes: resp.interviewNotes,
      evaluatedBy: resp.evaluatedBy || userName,
      evaluatedAt: now,
    };
  }

  // ===================== FINDINGS & NONCONFORMITIES =====================
  static getFindings(filter?: { status?: string; category?: string; department?: string; auditId?: string; search?: string }): Finding[] {
    let sql = 'SELECT * FROM findings WHERE 1=1';
    const params: any[] = [];

    if (filter?.status && filter.status !== 'All') {
      sql += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.category && filter.category !== 'All') {
      sql += ' AND category = ?';
      params.push(filter.category);
    }
    if (filter?.department && filter.department !== 'All') {
      sql += ' AND department = ?';
      params.push(filter.department);
    }
    if (filter?.auditId) {
      sql += ' AND audit_id = ?';
      params.push(filter.auditId);
    }
    if (filter?.search) {
      sql += ' AND (finding_number LIKE ? OR description LIKE ? OR process LIKE ? OR responsible_person LIKE ?)';
      const term = `%${filter.search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY date_identified DESC, finding_number DESC';

    const rows = sqlite.query<any>(sql, params);
    return rows.map(r => ({
      id: r.id,
      findingNumber: r.finding_number,
      auditId: r.audit_id,
      checklistItemId: r.checklist_item_id || undefined,
      dateIdentified: r.date_identified,
      category: r.category,
      department: r.department,
      process: r.process,
      standardCode: r.standard_code,
      clauseNumber: r.clause_number,
      requirementText: r.requirement_text,
      description: r.description,
      objectiveEvidence: r.objective_evidence,
      riskLevel: r.risk_level,
      responsiblePerson: r.responsible_person,
      dueDate: r.due_date,
      status: r.status,
      closureDate: r.closure_date || undefined,
      closedBy: r.closed_by || undefined,
      isRepeat: Boolean(r.is_repeat),
      rootCauseSummary: r.root_cause_summary || undefined,
      isDemo: Boolean(r.is_demo),
      affectedProcedures: r.affected_procedures_json ? JSON.parse(r.affected_procedures_json) : undefined,
      affectedRisks: r.affected_risks_json ? JSON.parse(r.affected_risks_json) : undefined,
      affectedCompetencies: r.affected_competencies_json ? JSON.parse(r.affected_competencies_json) : undefined,
      insuranceLossPrevention: r.insurance_loss_prevention_json ? JSON.parse(r.insurance_loss_prevention_json) : undefined,
    }));
  }

  static getFindingById(id: string): Finding | null {
    const r = sqlite.queryOne<any>('SELECT * FROM findings WHERE id = ?', [id]);
    if (!r) return null;
    return {
      id: r.id,
      findingNumber: r.finding_number,
      auditId: r.audit_id,
      checklistItemId: r.checklist_item_id || undefined,
      dateIdentified: r.date_identified,
      category: r.category,
      department: r.department,
      process: r.process,
      standardCode: r.standard_code,
      clauseNumber: r.clause_number,
      requirementText: r.requirement_text,
      description: r.description,
      objectiveEvidence: r.objective_evidence,
      riskLevel: r.risk_level,
      responsiblePerson: r.responsible_person,
      dueDate: r.due_date,
      status: r.status,
      closureDate: r.closure_date || undefined,
      closedBy: r.closed_by || undefined,
      isRepeat: Boolean(r.is_repeat),
      rootCauseSummary: r.root_cause_summary || undefined,
      isDemo: Boolean(r.is_demo),
      affectedProcedures: r.affected_procedures_json ? JSON.parse(r.affected_procedures_json) : undefined,
      affectedRisks: r.affected_risks_json ? JSON.parse(r.affected_risks_json) : undefined,
      affectedCompetencies: r.affected_competencies_json ? JSON.parse(r.affected_competencies_json) : undefined,
      insuranceLossPrevention: r.insurance_loss_prevention_json ? JSON.parse(r.insurance_loss_prevention_json) : undefined,
    };
  }

  static saveFinding(finding: Partial<Finding>, userName: string): Finding {
    const isNew = !finding.id;
    const id = finding.id || `fnd-${Date.now()}`;
    const prefix = finding.category === 'Major Nonconformity' || finding.category === 'Minor Nonconformity'
      ? 'NC'
      : finding.category === 'Observation'
      ? 'OBS'
      : 'OFI';
    const findingNumber = finding.findingNumber || `${prefix}-2026-${Math.floor(100 + Math.random() * 900)}`;

    if (isNew) {
      sqlite.run(
        `INSERT INTO findings (
          id, finding_number, audit_id, checklist_item_id, date_identified, category, department,
          process, standard_code, clause_number, requirement_text, description, objective_evidence,
          risk_level, responsible_person, due_date, status, closure_date, closed_by, is_repeat, root_cause_summary, is_demo,
          affected_procedures_json, affected_risks_json, affected_competencies_json, insurance_loss_prevention_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          findingNumber,
          finding.auditId || 'aud-001',
          finding.checklistItemId || null,
          finding.dateIdentified || new Date().toISOString().split('T')[0],
          finding.category || 'Minor Nonconformity',
          finding.department || 'Refinery Operations',
          finding.process || '',
          finding.standardCode || 'ISO 9001',
          finding.clauseNumber || '8.1',
          finding.requirementText || '',
          finding.description || '',
          finding.objectiveEvidence || '',
          finding.riskLevel || 'Medium',
          finding.responsiblePerson || 'Operations Supervisor',
          finding.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          finding.status || 'Open',
          finding.closureDate || null,
          finding.closedBy || null,
          finding.isRepeat ? 1 : 0,
          finding.rootCauseSummary || null,
          finding.isDemo ? 1 : 0,
          finding.affectedProcedures ? JSON.stringify(finding.affectedProcedures) : null,
          finding.affectedRisks ? JSON.stringify(finding.affectedRisks) : null,
          finding.affectedCompetencies ? JSON.stringify(finding.affectedCompetencies) : null,
          finding.insuranceLossPrevention ? JSON.stringify(finding.insuranceLossPrevention) : null,
        ]
      );
      this.logAudit(userName, 'CREATE', 'findings', id, findingNumber, undefined, finding.description);

      // Auto-create initial CAPA shell for nonconformities
      if (finding.category?.includes('Nonconformity')) {
        this.saveCorrectiveAction({
          findingId: id,
          problemStatement: finding.description || '',
          immediateCorrection: '',
          rootCauseMethod: '5 Why',
          rootCauseDetails: '',
          correctiveActionPlan: '',
          responsiblePerson: finding.responsiblePerson || '',
          targetDate: finding.dueDate || '',
          requiredResources: '',
          status: 'Draft',
          affectedProcedures: finding.affectedProcedures,
          affectedRisks: finding.affectedRisks,
          affectedCompetencies: finding.affectedCompetencies,
          insuranceLossPrevention: finding.insuranceLossPrevention,
        }, userName);
      }
    } else {
      const prev = this.getFindingById(id);
      sqlite.run(
        `UPDATE findings SET
          category = ?, department = ?, process = ?, standard_code = ?, clause_number = ?,
          requirement_text = ?, description = ?, objective_evidence = ?, risk_level = ?,
          responsible_person = ?, due_date = ?, status = ?, closure_date = ?, closed_by = ?,
          is_repeat = ?, root_cause_summary = ?,
          affected_procedures_json = ?, affected_risks_json = ?, affected_competencies_json = ?, insurance_loss_prevention_json = ?
         WHERE id = ?`,
        [
          finding.category,
          finding.department,
          finding.process,
          finding.standardCode,
          finding.clauseNumber,
          finding.requirementText,
          finding.description,
          finding.objectiveEvidence,
          finding.riskLevel,
          finding.responsiblePerson,
          finding.dueDate,
          finding.status,
          finding.closureDate || null,
          finding.closedBy || null,
          finding.isRepeat ? 1 : 0,
          finding.rootCauseSummary || null,
          finding.affectedProcedures ? JSON.stringify(finding.affectedProcedures) : null,
          finding.affectedRisks ? JSON.stringify(finding.affectedRisks) : null,
          finding.affectedCompetencies ? JSON.stringify(finding.affectedCompetencies) : null,
          finding.insuranceLossPrevention ? JSON.stringify(finding.insuranceLossPrevention) : null,
          id,
        ]
      );
      this.logAudit(userName, 'UPDATE', 'findings', id, findingNumber, JSON.stringify(prev), JSON.stringify(finding));
    }

    return this.getFindingById(id)!;
  }

  // Strict Validation: Cannot close finding without TWO SEPARATE DECISIONS:
  // Decision 1: Has the action been implemented? (with reviewer & evidence)
  // Decision 2: Has it proved effective? (with lead auditor reviewer, timing & sustained evidence)
  static closeFinding(id: string, closedBy: string): { success: boolean; message: string; warnings?: string[] } {
    const finding = this.getFindingById(id);
    if (!finding) return { success: false, message: 'Finding not found' };

    const warnings: string[] = [];

    // For nonconformities, enforce the two separate decisions
    if (finding.category.includes('Nonconformity')) {
      const capa = this.getCorrectiveActionByFindingId(id);
      if (!capa) {
        return { success: false, message: 'Validation failed: Nonconformity requires a registered CAPA workflow record.' };
      }

      // DECISION 1: Implementation Check
      const isImplemented = capa.implementationDecision === 'Implemented & Validated' || (capa.completionDate && capa.evidenceDescription);
      if (!isImplemented) {
        return {
          success: false,
          message: 'Decision 1 Gate Blocked: Corrective action has NOT been validated as physically implemented. Operational reviewer must certify implementation with physical evidence before proceeding.',
        };
      }
      if (!capa.implementationEvidence && !capa.evidenceDescription) {
        return {
          success: false,
          message: 'Decision 1 Evidence Required: Physical implementation evidence (Work Order #, MOC reference, equipment tag, or calibration cert) must be attached.',
        };
      }

      // DECISION 2: Effectiveness Check
      const isEffective = capa.effectivenessDecision === 'Verified Effective (Sustained)' || capa.closureDecision === 'Effective - Close Finding';
      if (!isEffective) {
        return {
          success: false,
          message: 'Decision 2 Gate Blocked: Sustained effectiveness has NOT been certified by the Lead Auditor. The observation window must conclude without recurrence before final closure.',
        };
      }
      if (!capa.effectivenessEvidence && !capa.effectivenessVerification) {
        return {
          success: false,
          message: 'Decision 2 Evidence Required: Objective evidence of sustained effectiveness (re-audit sample, KPI run chart, zero recurrence check) must be recorded.',
        };
      }

      // Cross-System Impact Warnings
      if (capa.affectedProcedures) {
        const pendingProcedures = capa.affectedProcedures.filter(p => p.revisionRequired && (p.status === 'Needs Revision' || p.status === 'In Revision'));
        if (pendingProcedures.length > 0) {
          warnings.push(`Warning: ${pendingProcedures.length} affected procedure(s) (${pendingProcedures.map(p => p.code).join(', ')}) still require documentation updates.`);
        }
      }
      if (capa.affectedCompetencies) {
        const pendingTraining = capa.affectedCompetencies.filter(c => c.reTrainingRequired && c.signoffStatus !== 'Completed' && c.signoffStatus !== 'Verified');
        if (pendingTraining.length > 0) {
          warnings.push(`Warning: ${pendingTraining.length} competency retraining record(s) (${pendingTraining.map(c => c.targetRoleOrPerson).join(', ')}) are still awaiting completion.`);
        }
      }
    }

    const now = new Date().toISOString().split('T')[0];
    sqlite.run(
      `UPDATE findings SET status = 'Closed', closure_date = ?, closed_by = ? WHERE id = ?`,
      [now, closedBy, id]
    );

    this.logAudit(closedBy, 'CLOSE', 'findings', id, finding.findingNumber, finding.status, 'Closed');
    this.createNotification(
      'Finding Closed After Two-Tier Audit Signoff',
      `Finding ${finding.findingNumber} was successfully closed after physical implementation validation and certified sustained effectiveness by ${closedBy}.`,
      'success',
      'findings',
      id
    );

    return {
      success: true,
      message: `Finding ${finding.findingNumber} successfully verified and closed after two-tier signoff.`,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // ===================== CORRECTIVE ACTIONS =====================
  static getCorrectiveActions(): CorrectiveAction[] {
    const rows = sqlite.query<any>('SELECT * FROM corrective_actions');
    return rows.map(r => ({
      id: r.id,
      findingId: r.finding_id,
      problemStatement: r.problem_statement,
      immediateCorrection: r.immediate_correction,
      rootCauseMethod: r.root_cause_method,
      rootCauseDetails: r.root_cause_details,
      fiveWhys: r.five_whys ? JSON.parse(r.five_whys) : undefined,
      fishboneJson: r.fishbone_json ? JSON.parse(r.fishbone_json) : undefined,
      correctiveActionPlan: r.corrective_action_plan,
      responsiblePerson: r.responsible_person,
      targetDate: r.target_date,
      requiredResources: r.required_resources,
      completionDate: r.completion_date || undefined,
      evidenceDescription: r.evidence_description || undefined,
      
      // DECISION 1: Implementation
      implementationDecision: r.implementation_decision || undefined,
      implementationReviewer: r.implementation_reviewer || undefined,
      implementationDate: r.implementation_date || undefined,
      implementationEvidence: r.implementation_evidence || undefined,

      // DECISION 2: Effectiveness
      effectivenessDecision: r.effectiveness_decision || undefined,
      effectivenessReviewer: r.effectiveness_reviewer || undefined,
      effectivenessDate: r.effectiveness_date || undefined,
      effectivenessEvidence: r.effectiveness_evidence || undefined,
      evaluationWindowDays: r.evaluation_window_days || 60,

      // Cross-System Linkages
      affectedProcedures: r.affected_procedures_json ? JSON.parse(r.affected_procedures_json) : undefined,
      affectedRisks: r.affected_risks_json ? JSON.parse(r.affected_risks_json) : undefined,
      affectedCompetencies: r.affected_competencies_json ? JSON.parse(r.affected_competencies_json) : undefined,
      insuranceLossPrevention: r.insurance_loss_prevention_json ? JSON.parse(r.insurance_loss_prevention_json) : undefined,

      // Legacy fields
      effectivenessVerification: r.effectiveness_verification || undefined,
      verifiedBy: r.verified_by || undefined,
      verificationDate: r.verification_date || undefined,
      closureDecision: r.closure_decision || undefined,
      status: r.status,
    }));
  }

  static getCorrectiveActionByFindingId(findingId: string): CorrectiveAction | null {
    const r = sqlite.queryOne<any>('SELECT * FROM corrective_actions WHERE finding_id = ?', [findingId]);
    if (!r) return null;
    return {
      id: r.id,
      findingId: r.finding_id,
      problemStatement: r.problem_statement,
      immediateCorrection: r.immediate_correction,
      rootCauseMethod: r.root_cause_method,
      rootCauseDetails: r.root_cause_details,
      fiveWhys: r.five_whys ? JSON.parse(r.five_whys) : undefined,
      fishboneJson: r.fishbone_json ? JSON.parse(r.fishbone_json) : undefined,
      correctiveActionPlan: r.corrective_action_plan,
      responsiblePerson: r.responsible_person,
      targetDate: r.target_date,
      requiredResources: r.required_resources,
      completionDate: r.completion_date || undefined,
      evidenceDescription: r.evidence_description || undefined,
      
      // DECISION 1: Implementation
      implementationDecision: r.implementation_decision || undefined,
      implementationReviewer: r.implementation_reviewer || undefined,
      implementationDate: r.implementation_date || undefined,
      implementationEvidence: r.implementation_evidence || undefined,

      // DECISION 2: Effectiveness
      effectivenessDecision: r.effectiveness_decision || undefined,
      effectivenessReviewer: r.effectiveness_reviewer || undefined,
      effectivenessDate: r.effectiveness_date || undefined,
      effectivenessEvidence: r.effectiveness_evidence || undefined,
      evaluationWindowDays: r.evaluation_window_days || 60,

      // Cross-System Linkages
      affectedProcedures: r.affected_procedures_json ? JSON.parse(r.affected_procedures_json) : undefined,
      affectedRisks: r.affected_risks_json ? JSON.parse(r.affected_risks_json) : undefined,
      affectedCompetencies: r.affected_competencies_json ? JSON.parse(r.affected_competencies_json) : undefined,
      insuranceLossPrevention: r.insurance_loss_prevention_json ? JSON.parse(r.insurance_loss_prevention_json) : undefined,

      // Legacy fields
      effectivenessVerification: r.effectiveness_verification || undefined,
      verifiedBy: r.verified_by || undefined,
      verificationDate: r.verification_date || undefined,
      closureDecision: r.closure_decision || undefined,
      status: r.status,
    };
  }

  static saveCorrectiveAction(capa: Partial<CorrectiveAction>, userName: string): CorrectiveAction {
    const isNew = !capa.id;
    const id = capa.id || `capa-${Date.now()}`;

    // Harmonize status based on the two separate decisions
    let status = capa.status || 'Draft';
    if (capa.effectivenessDecision === 'Verified Effective (Sustained)' || capa.closureDecision === 'Effective - Close Finding') {
      status = 'Verified Effective';
    } else if (capa.effectivenessDecision === 'Ineffective (Recurrence Observed)' || capa.implementationDecision === 'Rejected - Incomplete') {
      status = 'Rejected';
    } else if (capa.implementationDecision === 'Implemented & Validated') {
      status = 'Under Verification';
    } else if (capa.completionDate || capa.implementationEvidence) {
      status = 'Submitted';
    }

    if (isNew) {
      sqlite.run(
        `INSERT INTO corrective_actions (
          id, finding_id, problem_statement, immediate_correction, root_cause_method,
          root_cause_details, five_whys, fishbone_json, corrective_action_plan, responsible_person,
          target_date, required_resources, completion_date, evidence_description,
          implementation_decision, implementation_reviewer, implementation_date, implementation_evidence,
          effectiveness_decision, effectiveness_reviewer, effectiveness_date, effectiveness_evidence, evaluation_window_days,
          affected_procedures_json, affected_risks_json, affected_competencies_json, insurance_loss_prevention_json,
          effectiveness_verification, verified_by, verification_date, closure_decision, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          capa.findingId!,
          capa.problemStatement || '',
          capa.immediateCorrection || '',
          capa.rootCauseMethod || '5 Why',
          capa.rootCauseDetails || '',
          capa.fiveWhys ? JSON.stringify(capa.fiveWhys) : null,
          capa.fishboneJson ? JSON.stringify(capa.fishboneJson) : null,
          capa.correctiveActionPlan || '',
          capa.responsiblePerson || '',
          capa.targetDate || '',
          capa.requiredResources || '',
          capa.completionDate || null,
          capa.evidenceDescription || null,
          capa.implementationDecision || 'Pending',
          capa.implementationReviewer || null,
          capa.implementationDate || null,
          capa.implementationEvidence || null,
          capa.effectivenessDecision || 'Pending',
          capa.effectivenessReviewer || null,
          capa.effectivenessDate || null,
          capa.effectivenessEvidence || null,
          capa.evaluationWindowDays || 60,
          capa.affectedProcedures ? JSON.stringify(capa.affectedProcedures) : null,
          capa.affectedRisks ? JSON.stringify(capa.affectedRisks) : null,
          capa.affectedCompetencies ? JSON.stringify(capa.affectedCompetencies) : null,
          capa.insuranceLossPrevention ? JSON.stringify(capa.insuranceLossPrevention) : null,
          capa.effectivenessVerification || null,
          capa.verifiedBy || null,
          capa.verificationDate || null,
          capa.closureDecision || null,
          status,
        ]
      );
      this.logAudit(userName, 'CREATE', 'corrective_actions', id, `CAPA for Finding ${capa.findingId}`);
    } else {
      sqlite.run(
        `UPDATE corrective_actions SET
          problem_statement = ?, immediate_correction = ?, root_cause_method = ?,
          root_cause_details = ?, five_whys = ?, fishbone_json = ?, corrective_action_plan = ?,
          responsible_person = ?, target_date = ?, required_resources = ?, completion_date = ?,
          evidence_description = ?,
          implementation_decision = ?, implementation_reviewer = ?, implementation_date = ?, implementation_evidence = ?,
          effectiveness_decision = ?, effectiveness_reviewer = ?, effectiveness_date = ?, effectiveness_evidence = ?, evaluation_window_days = ?,
          affected_procedures_json = ?, affected_risks_json = ?, affected_competencies_json = ?, insurance_loss_prevention_json = ?,
          effectiveness_verification = ?, verified_by = ?, verification_date = ?, closure_decision = ?, status = ?
         WHERE id = ?`,
        [
          capa.problemStatement,
          capa.immediateCorrection,
          capa.rootCauseMethod,
          capa.rootCauseDetails,
          capa.fiveWhys ? JSON.stringify(capa.fiveWhys) : null,
          capa.fishboneJson ? JSON.stringify(capa.fishboneJson) : null,
          capa.correctiveActionPlan,
          capa.responsiblePerson,
          capa.targetDate,
          capa.requiredResources,
          capa.completionDate || null,
          capa.evidenceDescription || null,
          capa.implementationDecision || 'Pending',
          capa.implementationReviewer || null,
          capa.implementationDate || null,
          capa.implementationEvidence || null,
          capa.effectivenessDecision || 'Pending',
          capa.effectivenessReviewer || null,
          capa.effectivenessDate || null,
          capa.effectivenessEvidence || null,
          capa.evaluationWindowDays || 60,
          capa.affectedProcedures ? JSON.stringify(capa.affectedProcedures) : null,
          capa.affectedRisks ? JSON.stringify(capa.affectedRisks) : null,
          capa.affectedCompetencies ? JSON.stringify(capa.affectedCompetencies) : null,
          capa.insuranceLossPrevention ? JSON.stringify(capa.insuranceLossPrevention) : null,
          capa.effectivenessVerification || null,
          capa.verifiedBy || null,
          capa.verificationDate || null,
          capa.closureDecision || null,
          status,
          id,
        ]
      );
      this.logAudit(userName, 'UPDATE', 'corrective_actions', id, `CAPA for Finding ${capa.findingId}`);
    }

    // Sync status to finding
    if (status === 'Submitted') {
      sqlite.run("UPDATE findings SET status = 'Corrective Action Submitted' WHERE id = ?", [capa.findingId]);
    } else if (status === 'Under Verification') {
      sqlite.run("UPDATE findings SET status = 'Verification Pending' WHERE id = ?", [capa.findingId]);
    }

    return this.getCorrectiveActionByFindingId(capa.findingId!)!;
  }

  // ===================== FOLLOW-UPS =====================
  static getFollowUps(): FollowUpRecord[] {
    const rows = sqlite.query<any>('SELECT * FROM follow_ups ORDER BY scheduled_date ASC');
    return rows.map(r => ({
      id: r.id,
      findingId: r.finding_id,
      auditId: r.audit_id,
      scheduledDate: r.scheduled_date,
      actualDate: r.actual_date || undefined,
      conductedBy: r.conducted_by,
      verificationNotes: r.verification_notes,
      effectivenessResult: r.effectiveness_result,
      decision: r.decision,
      createdAt: r.created_at,
    }));
  }

  static saveFollowUp(fu: Partial<FollowUpRecord>, userName: string): FollowUpRecord {
    const id = fu.id || `fu-${Date.now()}`;
    const now = new Date().toISOString();
    sqlite.run(
      `INSERT OR REPLACE INTO follow_ups (id, finding_id, audit_id, scheduled_date, actual_date, conducted_by, verification_notes, effectiveness_result, decision, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        fu.findingId!,
        fu.auditId!,
        fu.scheduledDate || new Date().toISOString().split('T')[0],
        fu.actualDate || null,
        fu.conductedBy || userName,
        fu.verificationNotes || '',
        fu.effectivenessResult || 'Effective',
        fu.decision || 'Close Finding',
        now,
      ]
    );

    this.logAudit(userName, 'VERIFY', 'follow_ups', id, `Follow-up verification for ${fu.findingId}`);
    return {
      id,
      findingId: fu.findingId!,
      auditId: fu.auditId!,
      scheduledDate: fu.scheduledDate || '',
      actualDate: fu.actualDate,
      conductedBy: fu.conductedBy || userName,
      verificationNotes: fu.verificationNotes || '',
      effectivenessResult: fu.effectivenessResult || 'Effective',
      decision: fu.decision || 'Close Finding',
      createdAt: now,
    };
  }

  // ===================== DOCUMENTS & EVIDENCE =====================
  static getDocuments(filter?: { relatedAuditId?: string; relatedFindingId?: string }): DocumentEvidence[] {
    let sql = 'SELECT * FROM documents WHERE 1=1';
    const params: any[] = [];
    if (filter?.relatedAuditId) {
      sql += ' AND related_audit_id = ?';
      params.push(filter.relatedAuditId);
    }
    if (filter?.relatedFindingId) {
      sql += ' AND related_finding_id = ?';
      params.push(filter.relatedFindingId);
    }
    sql += ' ORDER BY uploaded_at DESC';

    const rows = sqlite.query<any>(sql, params);
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      fileType: r.file_type,
      fileSize: r.file_size,
      fileDataBase64: r.file_data_base64 || undefined,
      mimeType: r.mime_type,
      revision: r.revision,
      owner: r.owner,
      confidentiality: r.confidentiality,
      relatedAuditId: r.related_audit_id || undefined,
      relatedFindingId: r.related_finding_id || undefined,
      relatedCapaId: r.related_capa_id || undefined,
      relatedChecklistItemId: r.related_checklist_item_id || undefined,
      description: r.description || '',
      uploadedAt: r.uploaded_at,
    }));
  }

  static saveDocument(doc: Partial<DocumentEvidence>, userName: string): DocumentEvidence {
    const id = doc.id || `doc-${Date.now()}`;
    const now = new Date().toISOString();
    sqlite.run(
      `INSERT INTO documents (
        id, name, file_type, file_size, file_data_base64, mime_type, revision, owner,
        confidentiality, related_audit_id, related_finding_id, related_capa_id, related_checklist_item_id,
        description, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        doc.name || 'document',
        doc.fileType || 'pdf',
        doc.fileSize || 0,
        doc.fileDataBase64 || '',
        doc.mimeType || 'application/octet-stream',
        doc.revision || 'Rev 1.0',
        doc.owner || userName,
        doc.confidentiality || 'Internal',
        doc.relatedAuditId || null,
        doc.relatedFindingId || null,
        doc.relatedCapaId || null,
        doc.relatedChecklistItemId || null,
        doc.description || '',
        now,
      ]
    );

    this.logAudit(userName, 'CREATE', 'documents', id, doc.name || 'Document');
    return this.getDocuments().find(d => d.id === id)!;
  }

  static deleteDocument(id: string, userName: string): void {
    const prev = sqlite.queryOne<any>('SELECT name FROM documents WHERE id = ?', [id]);
    sqlite.run('DELETE FROM documents WHERE id = ?', [id]);
    this.logAudit(userName, 'DELETE', 'documents', id, prev?.name || id);
  }

  // ===================== NOTIFICATIONS =====================
  static getNotifications(): NotificationItem[] {
    const rows = sqlite.query<any>('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      linkModule: r.link_module || undefined,
      linkId: r.link_id || undefined,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at,
    }));
  }

  static createNotification(title: string, message: string, type: 'info' | 'warning' | 'critical' | 'success', linkModule?: string, linkId?: string): void {
    const id = `notif-${Date.now()}`;
    const now = new Date().toISOString();
    sqlite.run(
      `INSERT INTO notifications (id, title, message, type, link_module, link_id, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, title, message, type, linkModule || null, linkId || null, now]
    );
  }

  static markNotificationRead(id: string): void {
    sqlite.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
  }

  static markAllNotificationsRead(): void {
    sqlite.run('UPDATE notifications SET is_read = 1');
  }

  // ===================== SETTINGS =====================
  static getSettings(): SystemSettings {
    const rows = sqlite.query<{ key: string; value: string }>('SELECT * FROM settings');
    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value; });

    let thresholds = { low: 6, medium: 12, high: 19, critical: 25 };
    if (map['risk_matrix_thresholds']) {
      try {
        thresholds = JSON.parse(map['risk_matrix_thresholds']);
      } catch (e) {
        console.warn('Failed to parse risk matrix thresholds:', e);
      }
    }

    return {
      companyName: map['company_name'] || 'ISO System (IMS)',
      facilityName: map['facility_name'] || 'Main Operations & Compliance Facility',
      companyLogoBase64: map['company_logo_base64'] || undefined,
      address: map['address'] || 'Quality & Environmental Governance Center',
      defaultLeadAuditor: map['default_lead_auditor'] || 'aud-1',
      autoBackupIntervalHours: Number(map['auto_backup_interval_hours'] || 24),
      lastBackupDate: map['last_backup_date'] || undefined,
      riskMatrixThresholds: thresholds,
      customReportDisclaimer: map['custom_report_disclaimer'] || 'ISO System (IMS) - Proprietary Audit Document by Osman Khrif.',
      offlineMode: map['offline_mode'] === '1',
    };
  }

  static updateSetting(key: string, value: string, userName: string): void {
    sqlite.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    this.logAudit(userName, 'UPDATE', 'settings', key, key, undefined, value);
  }

  // ===================== USERS & RBAC =====================
  static getUsers(): User[] {
    const rows = sqlite.query<any>('SELECT * FROM users ORDER BY full_name ASC');
    return rows.map(r => ({
      id: r.id,
      username: r.username,
      fullName: r.full_name,
      email: r.email,
      role: r.role,
      department: r.department,
      active: Boolean(r.active),
      createdAt: r.created_at,
    }));
  }
}
