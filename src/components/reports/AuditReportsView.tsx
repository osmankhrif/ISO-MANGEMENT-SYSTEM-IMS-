import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { PdfReportGenerator } from '../../utils/pdfGenerator.ts';
import { Audit, Auditor, Finding, ChecklistItem, AuditResponseRecord, CorrectiveAction } from '../../types/index.ts';
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  Building,
  AlertTriangle,
  RotateCcw,
  Users,
  Calendar,
  Save,
} from 'lucide-react';

export const AuditReportsView: React.FC = () => {
  const {
    selectedAuditId,
    setSelectedAuditId,
    dataVersion,
    triggerDataRefresh,
    currentUser,
    settings,
  } = useApp();

  const audits = useMemo(() => DbService.getAudits(), [dataVersion]);
  const auditors = useMemo(() => DbService.getAuditors(), [dataVersion]);

  const currentAudit = useMemo(() => {
    return audits.find((a) => a.id === selectedAuditId) || audits[0] || null;
  }, [audits, selectedAuditId]);

  const leadAuditor = useMemo(() => {
    if (!currentAudit) return null;
    return auditors.find((a) => a.id === currentAudit.leadAuditorId) || null;
  }, [currentAudit, auditors]);

  const teamAuditors = useMemo(() => {
    if (!currentAudit) return [];
    return auditors.filter((a) => currentAudit.teamAuditorIds.includes(a.id));
  }, [currentAudit, auditors]);

  const findings = useMemo(() => {
    if (!currentAudit) return [];
    return DbService.getFindings({ auditId: currentAudit.id });
  }, [currentAudit, dataVersion]);

  const checklists = useMemo(() => {
    if (!currentAudit) return [];
    return DbService.getChecklists(currentAudit.id);
  }, [currentAudit, dataVersion]);

  const checklistItems = checklists[0]?.items || [];

  const responses = useMemo(() => {
    if (!currentAudit) return [];
    return DbService.getAuditResponses(currentAudit.id);
  }, [currentAudit, dataVersion]);

  const correctiveActions = useMemo(() => {
    const map: Record<string, CorrectiveAction> = {};
    findings.forEach((f) => {
      const capa = DbService.getCorrectiveActionByFindingId(f.id);
      if (capa) map[f.id] = capa;
    });
    return map;
  }, [findings, dataVersion]);

  // Executive summary and conclusion state for rapid editing before export
  const [execSummary, setExecSummary] = useState(currentAudit?.executiveSummary || '');
  const [conclusion, setConclusion] = useState(currentAudit?.conclusion || '');

  React.useEffect(() => {
    if (currentAudit) {
      setExecSummary(
        currentAudit.executiveSummary ||
          `The audit team conducted field observations, operator interviews, and verification of objective evidence against applicable standards. Overall adherence to operational protocols was verified, with specific areas requiring corrective action detailed below.`
      );
      setConclusion(
        currentAudit.conclusion ||
          `Based on the sample of evidence reviewed, the management system operates with acceptable operational discipline. Responsible managers must submit formal root cause analyses and corrective action plans within the designated due dates.`
      );
    }
  }, [currentAudit]);

  const handleSaveReportDraft = () => {
    if (!currentAudit) return;
    DbService.saveAudit(
      {
        ...currentAudit,
        executiveSummary: execSummary,
        conclusion: conclusion,
      },
      currentUser.fullName
    );
    triggerDataRefresh();
    alert('Executive summary and conclusions saved to audit record!');
  };

  const handleGeneratePdf = () => {
    if (!currentAudit) return;
    PdfReportGenerator.generateAuditReport({
      audit: {
        ...currentAudit,
        executiveSummary: execSummary,
        conclusion: conclusion,
      },
      leadAuditor,
      teamAuditors,
      checklistItems,
      responses,
      findings,
      correctiveActions,
      settings,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentAudit) {
    return (
      <div className="p-8 text-center text-slate-400">
        No audits scheduled to generate report.
      </div>
    );
  }

  const conformingCount = responses.filter((r) => r.responseValue === 'Conforming').length;
  const nonconformingCount = responses.filter((r) => r.responseValue === 'Nonconforming').length;
  const ofiCount = responses.filter(
    (r) => r.responseValue === 'Observation' || r.responseValue === 'Opportunity for Improvement'
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              Audit Report Compilation & PDF Generation
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-semibold border border-slate-700">
              {currentAudit.auditNumber}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated compilation of executive summary, checklist scores, nonconformities, and formal sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={currentAudit.id}
            onChange={(e) => setSelectedAuditId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded text-xs text-white px-3 py-1.5 focus:outline-none focus:border-amber-500 max-w-xs truncate"
          >
            {audits.map((a) => (
              <option key={a.id} value={a.id}>
                {a.auditNumber} - {a.title.slice(0, 35)}...
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
            title="Print report preview"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handleGeneratePdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Formal PDF Report</span>
          </button>
        </div>
      </div>

      {/* Report Document Preview Sheet */}
      <div className="bg-slate-900 border border-slate-800 rounded p-6 sm:p-8 space-y-6 text-xs text-slate-300 shadow-2xl">
        {/* Document Header Banner */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="font-mono font-bold text-lg text-white tracking-tight uppercase">
              {settings.companyName}
            </div>
            <div className="text-slate-400 text-xs mt-0.5">{settings.facilityName}</div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{settings.address}</div>
          </div>
          <div className="text-right font-mono text-[11px]">
            <div className="text-amber-400 font-bold text-sm">{currentAudit.auditNumber}</div>
            <div className="text-slate-400">Date: {new Date().toISOString().split('T')[0]}</div>
            <div className="text-slate-500 uppercase font-semibold">ISO 19011 Compliance Report</div>
          </div>
        </div>

        {/* Audit Title */}
        <div className="text-center py-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">
            FORMAL INTERNAL AUDIT REPORT
          </span>
          <h2 className="text-base font-bold text-white mt-1">{currentAudit.title}</h2>
          <span className="text-xs text-amber-400 font-mono">
            Standard(s): {currentAudit.standardIds.join(', ')}
          </span>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 p-4 rounded border border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block font-mono">AUDIT TYPE</span>
            <span className="font-semibold text-white">{currentAudit.auditType}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-mono">DEPARTMENT / UNIT</span>
            <span className="font-semibold text-white">{currentAudit.department} ({currentAudit.area})</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-mono">PLANNED DATES</span>
            <span className="font-semibold text-white font-mono">{currentAudit.plannedStartDate} to {currentAudit.plannedEndDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-mono">LEAD AUDITOR</span>
            <span className="font-semibold text-white">{leadAuditor?.name || 'Assigned Lead'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-mono">AUDIT TEAM</span>
            <span className="font-semibold text-slate-300">{teamAuditors.map((a) => a.name).join(', ') || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-mono">RISK LEVEL</span>
            <span className="font-semibold text-amber-400 font-mono">{currentAudit.riskLevel} (Score: {currentAudit.riskScore}/25)</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-mono">AUDIT STATUS</span>
            <span className="font-semibold text-emerald-400 font-mono">{currentAudit.status}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-mono">CRITERIA CLAUSES</span>
            <span className="font-semibold text-slate-300 truncate block">{currentAudit.criteria}</span>
          </div>
        </div>

        {/* Section 1: Objectives & Scope */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-1">
            1. Audit Objectives, Scope & Criteria
          </h3>
          <p className="text-slate-300 leading-relaxed">
            <strong className="text-white">Objectives:</strong> {currentAudit.objectives}
          </p>
          <p className="text-slate-300 leading-relaxed">
            <strong className="text-white">Scope:</strong> {currentAudit.scope}
          </p>
          <p className="text-slate-300 leading-relaxed">
            <strong className="text-white">Criteria:</strong> {currentAudit.criteria || currentAudit.standardIds.join(', ')}
          </p>
        </div>

        {/* Section 2: Executive Summary (Editable before export) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              2. Executive Summary
            </h3>
            <span className="text-[10px] text-slate-400 font-mono no-print">Click to edit</span>
          </div>
          <textarea
            rows={3}
            value={execSummary}
            onChange={(e) => setExecSummary(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white leading-relaxed focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Section 3: Checklist Results Breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-1">
            3. Checklist Evaluation Breakdown
          </h3>
          <div className="grid grid-cols-4 gap-3 text-center font-mono py-2">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">TOTAL EVALUATED</span>
              <span className="text-base font-bold text-white">{checklistItems.length}</span>
            </div>
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/40">
              <span className="text-[10px] text-emerald-400 block">CONFORMING</span>
              <span className="text-base font-bold text-emerald-300">{conformingCount}</span>
            </div>
            <div className="p-2.5 rounded bg-red-950/40 border border-red-800/40">
              <span className="text-[10px] text-red-400 block">NONCONFORMING</span>
              <span className="text-base font-bold text-red-300">{nonconformingCount}</span>
            </div>
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/40">
              <span className="text-[10px] text-amber-400 block">OBSERVATIONS / OFI</span>
              <span className="text-base font-bold text-amber-300">{ofiCount}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Nonconformities & Observations List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-1">
            4. Summary of Findings & Corrective Action Plans ({findings.length} Total)
          </h3>

          {findings.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 italic">
              No adverse findings or nonconformities were raised during this audit.
            </p>
          ) : (
            findings.map((fnd, idx) => {
              const capa = correctiveActions[fnd.id];
              const isMajor = fnd.category.includes('Major');
              return (
                <div
                  key={fnd.id}
                  className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-white">
                      {idx + 1}. [{fnd.findingNumber}] {fnd.category} - Clause {fnd.clauseNumber} ({fnd.standardCode})
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      Risk: <strong className={isMajor ? 'text-red-400' : 'text-amber-400'}>{fnd.riskLevel}</strong> · Due: {fnd.dueDate}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">{fnd.description}</p>
                  <div className="text-[11px] text-slate-400 font-mono italic">
                    Evidence: {fnd.objectiveEvidence}
                  </div>

                  {capa?.correctiveActionPlan && (
                    <div className="mt-1 pt-1.5 border-t border-slate-900 text-[11px] text-emerald-400 font-mono">
                      <strong>CAPA Plan:</strong> {capa.correctiveActionPlan} (Owner: {capa.responsiblePerson})
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Section 5: Conclusion & Recommendations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              5. Audit Conclusion & Recommendations
            </h3>
            <span className="text-[10px] text-slate-400 font-mono no-print">Click to edit</span>
          </div>
          <textarea
            rows={2}
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white leading-relaxed focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Section 6: Formal Signatures Block */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            6. Official Approvals & Acceptance
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Lead Auditor Sign-off</span>
              <div className="font-semibold text-white mt-1">{leadAuditor?.name || 'Lead Auditor'}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">Verified Electronically</div>
              <div className="text-[10px] text-slate-500 font-mono">Date: {currentAudit.actualEndDate || new Date().toISOString().split('T')[0]}</div>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500 block uppercase">Facility Management Representative</span>
              <div className="font-semibold text-white mt-1">{currentAudit.approvedBy || 'Operations & Quality Director'}</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-1">Accepted into Management Review</div>
              <div className="text-[10px] text-slate-500 font-mono">Date: {new Date().toISOString().split('T')[0]}</div>
            </div>
          </div>
        </div>

        {/* Save Draft Button for edits */}
        <div className="pt-2 flex justify-end no-print">
          <button
            onClick={handleSaveReportDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Report Text Edits</span>
          </button>
        </div>
      </div>
    </div>
  );
};
