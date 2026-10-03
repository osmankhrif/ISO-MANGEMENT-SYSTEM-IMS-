import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { PdfReportGenerator } from '../../utils/pdfGenerator.ts';
import { Audit, Auditor, PLANT_SITES } from '../../types/index.ts';
import { PlanningCalendarView } from './PlanningCalendarView.tsx';
import {
  FileSpreadsheet,
  Download,
  Save,
  CheckCircle,
  Users,
  Shield,
  ArrowRight,
  CalendarDays,
  Calendar,
  Printer,
} from 'lucide-react';

export const AuditPlanView: React.FC = () => {
  const {
    selectedAuditId,
    setSelectedAuditId,
    dataVersion,
    triggerDataRefresh,
    currentUser,
    settings,
    setActiveModule,
  } = useApp();

  // Mode: Calendar View vs Specification Form View
  const [activeTab, setActiveTab] = useState<'calendar' | 'specification'>('calendar');

  const audits = useMemo(() => DbService.getAudits(), [dataVersion]);
  const auditors = useMemo(() => DbService.getAuditors(), [dataVersion]);

  // Current active audit
  const currentAudit = useMemo(() => {
    if (selectedAuditId) {
      const found = audits.find((a) => a.id === selectedAuditId);
      if (found) return found;
    }
    return audits[0] || null;
  }, [selectedAuditId, audits]);

  // Form State
  const [formData, setFormData] = useState<Partial<Audit>>({});
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (currentAudit) {
      setFormData(currentAudit);
      setIsSaved(false);
    }
  }, [currentAudit]);

  const leadAuditor = useMemo(() => {
    return auditors.find((a) => a.id === formData.leadAuditorId) || null;
  }, [formData.leadAuditorId, auditors]);

  const teamAuditors = useMemo(() => {
    return auditors.filter((a) => (formData.teamAuditorIds || []).includes(a.id));
  }, [formData.teamAuditorIds, auditors]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) return;
    DbService.saveAudit(formData, currentUser.fullName);
    setIsSaved(true);
    triggerDataRefresh();
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleExportPlanPdf = () => {
    if (!currentAudit) return;
    PdfReportGenerator.generateAuditPlan(
      { ...currentAudit, ...formData } as Audit,
      leadAuditor,
      teamAuditors,
      settings
    );
  };

  const handleSelectAuditFromCalendar = (auditId: string) => {
    setSelectedAuditId(auditId);
    setActiveTab('specification');
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto print:max-w-none print:p-0 print:m-0 print:space-y-0">
      {/* Module Sub-Navigation: Calendar View vs Specification Form */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === 'calendar'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Monthly Schedule Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('specification')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === 'specification'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Audit Plan Specification</span>
          </button>
        </div>

        {activeTab === 'calendar' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 transition-colors shadow-sm"
              title="Print to PDF: Export complete interactive monthly schedule and facility roster using browser print"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print to PDF</span>
            </button>
          </div>
        )}

        {activeTab === 'specification' && currentAudit && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Selected Audit:</span>
            <select
              value={currentAudit.id}
              onChange={(e) => setSelectedAuditId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded text-xs text-white px-2.5 py-1 focus:outline-none focus:border-amber-500 max-w-xs truncate"
            >
              {audits.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.auditNumber} - {a.title.slice(0, 30)}...
                </option>
              ))}
            </select>
            <button
              onClick={handleExportPlanPdf}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors"
              title="Download Formal PDF Audit Plan"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Render Active View */}
      {activeTab === 'calendar' ? (
        <PlanningCalendarView onSelectAuditToEdit={handleSelectAuditFromCalendar} />
      ) : (
        /* Specification Form View */
        <div className="space-y-6">
          {!currentAudit ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded space-y-3">
              <Calendar className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No Audit Selected for Specification</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Select an audit from the monthly calendar or schedule a new audit to edit its formal ISO 19011 plan.
              </p>
              <button
                onClick={() => setActiveTab('calendar')}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold rounded transition-colors"
              >
                Go to Monthly Calendar
              </button>
            </div>
          ) : (
            <>
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded border border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Formal Audit Plan Specification
                    </h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-semibold border border-slate-700">
                      {formData.auditNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    ISO 19011 team mobilization, site verification boundaries, criteria, and hazards.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('calendar')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                    <span>Back to Calendar</span>
                  </button>

                  <button
                    onClick={() => setActiveModule('execution')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors"
                  >
                    <span>Proceed to Field</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Planning Form */}
              <form onSubmit={handleSave} className="space-y-6">
                {/* Core Metadata Card */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded space-y-4">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    1. Core Audit Definition & Plant Site
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="md:col-span-2">
                      <label className="block text-slate-300 font-medium mb-1">Audit Title</label>
                      <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Audit Type</label>
                      <input
                        type="text"
                        value={formData.auditType || ''}
                        onChange={(e) => setFormData({ ...formData, auditType: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Plant Site / Operational Complex</label>
                      <select
                        value={formData.site || DbService.deriveSite(formData.area, formData.department)}
                        onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                      >
                        {PLANT_SITES.map((site) => (
                          <option key={site} value={site}>
                            {site}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Audited Department</label>
                      <input
                        type="text"
                        value={formData.department || ''}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Physical Area / Battery Limit</label>
                      <input
                        type="text"
                        value={formData.area || ''}
                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Process Unit / Line</label>
                      <input
                        type="text"
                        value={formData.process || ''}
                        onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Audit Criteria (Clauses & Codes)</label>
                      <input
                        type="text"
                        value={formData.criteria || ''}
                        onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                        placeholder="e.g. ISO 45001 Clauses 6.1, 8.1, API RP 754"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Planned Start Date</label>
                      <input
                        type="date"
                        value={formData.plannedStartDate || ''}
                        onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Planned End Date</label>
                      <input
                        type="date"
                        value={formData.plannedEndDate || ''}
                        onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Team Mobilization */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded space-y-4">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    2. Audit Team & Auditor Mobilization
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Lead Auditor</label>
                      <select
                        value={formData.leadAuditorId || ''}
                        onChange={(e) => setFormData({ ...formData, leadAuditorId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                      >
                        {auditors.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} — {a.qualification} ({a.department})
                          </option>
                        ))}
                      </select>
                      {leadAuditor && (
                        <div className="text-[11px] text-slate-400 mt-1 font-mono">
                          Experience: {leadAuditor.experienceYears} yrs · Level: {leadAuditor.competencyLevel} · Qualified: {leadAuditor.standardsQualified.join(', ')}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Audit Team Members</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded border border-slate-800 max-h-32 overflow-y-auto">
                        {auditors
                          .filter((a) => a.id !== formData.leadAuditorId)
                          .map((aud) => {
                            const isSelected = (formData.teamAuditorIds || []).includes(aud.id);
                            return (
                              <label key={aud.id} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const current = formData.teamAuditorIds || [];
                                    const updated = e.target.checked
                                      ? [...current, aud.id]
                                      : current.filter((id) => id !== aud.id);
                                    setFormData({ ...formData, teamAuditorIds: updated });
                                  }}
                                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                                />
                                <span className="truncate">{aud.name}</span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scope, Objectives, Risks & Instructions */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded space-y-4">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    3. Scope, Objectives & Operational Risk Controls
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Audit Objectives</label>
                      <textarea
                        rows={3}
                        value={formData.objectives || ''}
                        onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                        placeholder="Specific goals and verification targets for this audit..."
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Audit Scope</label>
                      <textarea
                        rows={3}
                        value={formData.scope || ''}
                        onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                        placeholder="Boundaries, physical units, departments, and shift coverage included..."
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Known Hazards & Safety Equipment (PPE)</label>
                      <textarea
                        rows={3}
                        value={formData.knownRisks || ''}
                        onChange={(e) => setFormData({ ...formData, knownRisks: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                        placeholder="e.g. H2S hazard, 4-gas detector mandatory, flame retardant suits, ear defense..."
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Special Instructions & Pre-Requisite Documents</label>
                      <textarea
                        rows={3}
                        value={formData.specialInstructions || ''}
                        onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                        placeholder="e.g. Review P&ID Rev 4.2 prior to walkdown, notify shift superintendent before valve inspection..."
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-300 font-medium mb-1">Previous Findings to Review (Follow-up)</label>
                      <textarea
                        rows={2}
                        value={formData.previousFindingsSummary || ''}
                        onChange={(e) => setFormData({ ...formData, previousFindingsSummary: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
                        placeholder="Summary of open items from previous audit cycles to be verified in field..."
                      />
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    {isSaved && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-mono">
                        <CheckCircle className="w-4 h-4" />
                        Audit Plan specifications saved successfully to SQLite!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Audit Plan</span>
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};
export default AuditPlanView;
