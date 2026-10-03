import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { ExcelService } from '../../utils/excelService.ts';
import { Audit, AuditType, AuditPriority } from '../../types/index.ts';
import {
  CalendarDays,
  ListFilter,
  Plus,
  Download,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

export const AuditProgramView: React.FC = () => {
  const { dataVersion, triggerDataRefresh, navigateToAudit, currentUser, canPerform } = useApp();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  const programs = useMemo(() => DbService.getAuditPrograms(), [dataVersion]);
  const activeProgram = programs[0] || {
    id: 'prg-2026',
    programYear: 2026,
    title: '2026 ISO System (IMS) Integrated Facility Audit Program',
    status: 'Approved',
    totalPlanned: 12,
  };

  const audits = useMemo(() => {
    return DbService.getAudits({
      status: statusFilter,
      auditType: typeFilter,
      search: search.trim(),
    });
  }, [dataVersion, statusFilter, typeFilter, search]);

  const auditors = useMemo(() => DbService.getAuditors(), [dataVersion]);

  // Form State for new audit
  const [formAudit, setFormAudit] = useState<Partial<Audit>>({
    title: '',
    auditType: 'HSE Audit',
    department: 'Refinery Operations',
    area: '',
    process: '',
    standardIds: ['ISO 45001'],
    criteria: 'ISO 45001 & API Process Safety Standards',
    leadAuditorId: auditors[0]?.id || 'aud-1',
    teamAuditorIds: [],
    plannedStartDate: new Date().toISOString().split('T')[0],
    plannedEndDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    riskLikelihood: 3,
    riskConsequence: 3,
    priority: 'Medium',
    status: 'Planned',
    scope: 'Evaluation of process safety controls and procedural compliance.',
    objectives: 'Verify adherence to PSM standards and statutory safety requirements.',
  });

  const handleSaveAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAudit.title) {
      alert('Please provide an audit title');
      return;
    }
    DbService.saveAudit(formAudit, currentUser.fullName);
    setShowAddModal(false);
    triggerDataRefresh();
    // Reset form
    setFormAudit({
      title: '',
      auditType: 'HSE Audit',
      department: 'Refinery Operations',
      area: '',
      process: '',
      standardIds: ['ISO 45001'],
      criteria: 'ISO 45001 & API Process Safety Standards',
      leadAuditorId: auditors[0]?.id || 'aud-1',
      teamAuditorIds: [],
      plannedStartDate: new Date().toISOString().split('T')[0],
      plannedEndDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      riskLikelihood: 3,
      riskConsequence: 3,
      priority: 'Medium',
      status: 'Planned',
      scope: 'Evaluation of process safety controls and procedural compliance.',
      objectives: 'Verify adherence to PSM standards and statutory safety requirements.',
    });
  };

  const handleExportExcel = () => {
    ExcelService.exportAudits(audits, 'xlsx');
  };

  const handleExportCsv = () => {
    ExcelService.exportAudits(audits, 'csv');
  };

  const auditTypes: AuditType[] = [
    'Internal Audit',
    'Process Audit',
    'Compliance Audit',
    'HSE Audit',
    'Quality Audit',
    'Environmental Audit',
    'Operational Audit',
    'Contractor Audit',
    'Follow-Up Audit',
    'Management System Audit',
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Annual Audit Program</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-mono font-semibold">
              {activeProgram.approvalStatus || 'Approved'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {activeProgram.title} ({activeProgram.programYear}) · {audits.length} Audits in Schedule
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* List vs Calendar Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors"
              title="Export schedule to Microsoft Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-2 py-1.5 rounded text-xs font-medium text-slate-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
              title="Export as CSV"
            >
              CSV
            </button>
          </div>

          {canPerform('manage_audits') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Audit</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/60 p-3 rounded border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, audit number, unit area, or process..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3 h-3" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded text-xs text-white px-2 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-2">
            <span>Type:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded text-xs text-white px-2 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Types</option>
            {auditTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: List or Calendar View */}
      {viewMode === 'list' ? (
        <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Audit ID</th>
                  <th className="py-2.5 px-4">Audit Title & Area</th>
                  <th className="py-2.5 px-4">Type & Standard</th>
                  <th className="py-2.5 px-4">Auditor</th>
                  <th className="py-2.5 px-4">Planned Dates</th>
                  <th className="py-2.5 px-4">Risk Level</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {audits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      No audits match the selected filters.
                    </td>
                  </tr>
                ) : (
                  audits.map((a) => {
                    const lead = auditors.find((aud) => aud.id === a.leadAuditorId);
                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-slate-850/60 transition-colors group cursor-pointer"
                        onClick={() => navigateToAudit(a.id, 'planning')}
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-amber-400 whitespace-nowrap">
                          {a.auditNumber}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium text-white truncate">{a.title}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {a.area} · {a.department}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-slate-200">{a.auditType}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {a.standardIds.join(', ')}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-slate-200">{lead?.name || 'Assigned Lead'}</div>
                          <div className="text-[10px] text-slate-400">{lead?.qualification || 'Auditor'}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                          <div>{a.plannedStartDate}</div>
                          <div className="text-slate-500">to {a.plannedEndDate}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              a.riskLevel === 'Critical'
                                ? 'bg-red-950 text-red-400 border-red-800/60'
                                : a.riskLevel === 'High'
                                ? 'bg-amber-950 text-amber-400 border-amber-800/60'
                                : a.riskLevel === 'Medium'
                                ? 'bg-sky-950 text-sky-400 border-sky-800/60'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {a.riskLevel} ({a.riskScore})
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              a.status === 'Completed'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                : a.status === 'In Progress'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToAudit(a.id, 'planning');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                            title="Open Audit Plan"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar View by Month */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(
            (monthName, idx) => {
              const monthNum = String(idx + 1).padStart(2, '0');
              const monthAudits = audits.filter((a) =>
                a.plannedStartDate.startsWith(`2026-${monthNum}`)
              );

              return (
                <div key={monthName} className="bg-slate-900 border border-slate-800 p-3.5 rounded">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="font-bold text-xs uppercase tracking-wider text-white">
                      {monthName} 2026
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {monthAudits.length} {monthAudits.length === 1 ? 'audit' : 'audits'}
                    </span>
                  </div>

                  <div className="space-y-2 min-h-24">
                    {monthAudits.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[11px] text-slate-600 py-6">
                        No planned audits
                      </div>
                    ) : (
                      monthAudits.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => navigateToAudit(a.id, 'planning')}
                          className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className="text-amber-400 font-semibold">{a.auditNumber}</span>
                            <span className="text-slate-400">{a.plannedStartDate.slice(5)}</span>
                          </div>
                          <div className="text-xs text-white font-medium line-clamp-1">{a.title}</div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {a.area} · <span className="text-slate-300 font-mono">{a.riskLevel}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Modal: Create New Audit */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Schedule New Industrial Audit</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAudit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Audit Title *</label>
                  <input
                    type="text"
                    required
                    value={formAudit.title}
                    onChange={(e) => setFormAudit({ ...formAudit, title: e.target.value })}
                    placeholder="e.g. Flare Recovery & Hazardous Waste Storage Compliance Audit"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Audit Type</label>
                  <select
                    value={formAudit.auditType}
                    onChange={(e) => setFormAudit({ ...formAudit, auditType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    {auditTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department</label>
                  <input
                    type="text"
                    value={formAudit.department}
                    onChange={(e) => setFormAudit({ ...formAudit, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Facility Area / Unit</label>
                  <input
                    type="text"
                    value={formAudit.area}
                    onChange={(e) => setFormAudit({ ...formAudit, area: e.target.value })}
                    placeholder="e.g. Tank Farm B, Flare #2, CDU-1"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Process</label>
                  <input
                    type="text"
                    value={formAudit.process}
                    onChange={(e) => setFormAudit({ ...formAudit, process: e.target.value })}
                    placeholder="e.g. Atmospheric Distillation & Desalting"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Lead Auditor</label>
                  <select
                    value={formAudit.leadAuditorId}
                    onChange={(e) => setFormAudit({ ...formAudit, leadAuditorId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    {auditors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={formAudit.priority}
                    onChange={(e) => setFormAudit({ ...formAudit, priority: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Planned Start Date</label>
                  <input
                    type="date"
                    required
                    value={formAudit.plannedStartDate}
                    onChange={(e) => setFormAudit({ ...formAudit, plannedStartDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Planned End Date</label>
                  <input
                    type="date"
                    required
                    value={formAudit.plannedEndDate}
                    onChange={(e) => setFormAudit({ ...formAudit, plannedEndDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>

                {/* Risk Score Calculation */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Risk Likelihood (1 - 5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formAudit.riskLikelihood || 3}
                    onChange={(e) => setFormAudit({ ...formAudit, riskLikelihood: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-[11px] font-mono text-slate-400">Score: {formAudit.riskLikelihood}/5</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Risk Consequence (1 - 5)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formAudit.riskConsequence || 3}
                    onChange={(e) => setFormAudit({ ...formAudit, riskConsequence: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-[11px] font-mono text-slate-400">
                    Calculated Risk: {(formAudit.riskLikelihood || 3) * (formAudit.riskConsequence || 3)} / 25
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Audit Scope</label>
                  <textarea
                    rows={2}
                    value={formAudit.scope}
                    onChange={(e) => setFormAudit({ ...formAudit, scope: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">Audit Objectives</label>
                  <textarea
                    rows={2}
                    value={formAudit.objectives}
                    onChange={(e) => setFormAudit({ ...formAudit, objectives: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm"
                >
                  Save & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
