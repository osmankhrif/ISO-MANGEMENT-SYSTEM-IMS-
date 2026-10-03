import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { ExcelService } from '../../utils/excelService.ts';
import { Finding } from '../../types/index.ts';
import {
  AlertTriangle,
  Search,
  Download,
  RotateCcw,
  CheckCircle,
  FileText,
  AlertOctagon,
  Users,
  ShieldCheck,
  Flame,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const FindingsView: React.FC = () => {
  const { dataVersion, triggerDataRefresh, currentUser, setActiveModule, setSelectedFindingId } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');

  const [activeModalFinding, setActiveModalFinding] = useState<Finding | null>(null);

  const findings = useMemo(() => {
    return DbService.getFindings({
      status: statusFilter,
      category: categoryFilter,
      department: departmentFilter,
      search: search.trim(),
    });
  }, [dataVersion, statusFilter, categoryFilter, departmentFilter, search]);

  const handleExportExcel = () => {
    ExcelService.exportFindings(findings);
  };

  const handleCloseFinding = (findingId: string) => {
    const result = DbService.closeFinding(findingId, currentUser.fullName);
    if (!result.success) {
      alert(`Cannot Close Finding:\n${result.message}`);
    } else {
      let msg = result.message;
      if (result.warnings && result.warnings.length > 0) {
        msg += '\n\nAdvisory Warnings:\n' + result.warnings.join('\n');
      }
      alert(msg);
      triggerDataRefresh();
      if (activeModalFinding?.id === findingId) {
        setActiveModalFinding(DbService.getFindingById(findingId));
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Findings & Nonconformities Register
            </h1>
            <span className="font-mono text-xs text-slate-400">
              · {findings.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enforces two-tier verification decisions (Implementation + Sustained Effectiveness) and integrated enterprise cascades.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors font-mono"
            title="Export findings log to Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Log</span>
          </button>

          <button
            onClick={() => setActiveModule('correctiveActions')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Open CAPA Workflow</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-slate-900/60 p-3 rounded border border-slate-800 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by finding number, description, clause, or owner..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded text-xs text-white px-2 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Categories</option>
            <option value="Major Nonconformity">Major Nonconformity</option>
            <option value="Minor Nonconformity">Minor Nonconformity</option>
            <option value="Observation">Observation</option>
            <option value="Opportunity for Improvement">Opportunity for Improvement</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded text-xs text-white px-2 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Under Investigation">Under Investigation</option>
            <option value="Corrective Action Submitted">Corrective Action Submitted</option>
            <option value="Verification Pending">Verification Pending</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Finding ID</th>
                <th className="py-2.5 px-4">Category & Clause</th>
                <th className="py-2.5 px-4">Description & Evidence</th>
                <th className="py-2.5 px-4">Two-Tier Sign-off</th>
                <th className="py-2.5 px-4">Traceability Cascade</th>
                <th className="py-2.5 px-4">Status & Due</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {findings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No findings recorded matching criteria.
                  </td>
                </tr>
              ) : (
                findings.map((fnd) => {
                  const isMajor = fnd.category.includes('Major');
                  const capa = DbService.getCorrectiveActionByFindingId(fnd.id);
                  const isImp = capa?.implementationDecision === 'Implemented & Validated';
                  const isEff = capa?.effectivenessDecision === 'Verified Effective (Sustained)' || fnd.status === 'Closed';

                  const procs = fnd.affectedProcedures || capa?.affectedProcedures || [];
                  const risks = fnd.affectedRisks || capa?.affectedRisks || [];
                  const comps = fnd.affectedCompetencies || capa?.affectedCompetencies || [];
                  const ins = fnd.insuranceLossPrevention || capa?.insuranceLossPrevention;

                  return (
                    <tr
                      key={fnd.id}
                      onClick={() => setActiveModalFinding(fnd)}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <span className={isMajor ? 'text-red-400' : 'text-amber-400'}>
                          {fnd.findingNumber}
                        </span>
                        {fnd.isRepeat && (
                          <span className="block text-[9px] text-purple-400 uppercase font-bold font-mono">
                            REPEAT
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className={`font-semibold ${isMajor ? 'text-red-300' : 'text-slate-200'}`}>
                          {fnd.category}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {fnd.standardCode} §{fnd.clauseNumber} · {fnd.department}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-white font-medium line-clamp-2 leading-relaxed">
                          {fnd.description}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5 italic">
                          Evidence: {fnd.objectiveEvidence}
                        </div>
                      </td>

                      {/* Two-Tier Decision Gates */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        {fnd.category.includes('Nonconformity') ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={isImp ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                {isImp ? '✓' : '○'} Phase 1
                              </span>
                              <span className="text-slate-500">·</span>
                              <span className="text-slate-400 text-[10px]">
                                {isImp ? 'Implemented' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={isEff ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                                {isEff ? '✓' : '○'} Phase 2
                              </span>
                              <span className="text-slate-500">·</span>
                              <span className="text-slate-400 text-[10px]">
                                {isEff ? 'Sustained' : 'Observation'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">N/A (Observation)</span>
                        )}
                      </td>

                      {/* Enterprise Traceability Cascade */}
                      <td className="py-3 px-4 whitespace-nowrap text-[11px] font-mono">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {procs.length > 0 && (
                            <span className="text-amber-400 flex items-center gap-0.5" title={`${procs.length} Affected Operating Procedures`}>
                              <FileText className="w-3 h-3" />
                              {procs.length}
                            </span>
                          )}
                          {risks.length > 0 && (
                            <span className="text-red-400 flex items-center gap-0.5" title={`${risks.length} Risk Register Items`}>
                              <AlertOctagon className="w-3 h-3" />
                              {risks.length}
                            </span>
                          )}
                          {comps.length > 0 && (
                            <span className="text-cyan-400 flex items-center gap-0.5" title={`${comps.length} Retraining Records`}>
                              <Users className="w-3 h-3" />
                              {comps.length}
                            </span>
                          )}
                          {ins && (
                            <span className="text-indigo-400 flex items-center gap-0.5" title={`Insurance Exposure: ${ins.financialExposureBracket}`}>
                              <Flame className="w-3 h-3" />
                              {ins.businessInterruptionRiskDays}d
                            </span>
                          )}
                          {procs.length === 0 && risks.length === 0 && comps.length === 0 && (
                            <span className="text-slate-500 text-[10px]">None Linked</span>
                          )}
                        </div>
                      </td>

                      {/* Status & Due Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div className={`font-semibold ${
                          fnd.status === 'Closed' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {fnd.status}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Due: {fnd.dueDate}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModalFinding(fnd);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800"
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

      {/* Modal: View & Manage Finding Details */}
      {activeModalFinding && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-amber-400">
                    {activeModalFinding.findingNumber}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-white font-medium">
                    {activeModalFinding.category}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-300 font-mono">
                    Status: {activeModalFinding.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Identified: {activeModalFinding.dateIdentified} · Standard: {activeModalFinding.standardCode} Clause {activeModalFinding.clauseNumber}
                </div>
              </div>
              <button
                onClick={() => setActiveModalFinding(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                <span className="font-mono text-slate-400 text-[10px] uppercase block">
                  Mandatory Clause Requirement
                </span>
                <p className="text-slate-200 leading-relaxed font-mono">
                  {activeModalFinding.requirementText}
                </p>
              </div>

              <div>
                <span className="font-mono text-slate-400 text-[10px] uppercase block mb-1">
                  Condition / Nonconformance Description
                </span>
                <p className="text-white text-xs bg-slate-950 p-3 rounded border border-slate-800 leading-relaxed">
                  {activeModalFinding.description}
                </p>
              </div>

              <div>
                <span className="font-mono text-slate-400 text-[10px] uppercase block mb-1">
                  Verified Objective Evidence
                </span>
                <p className="text-slate-300 text-xs bg-slate-950 p-3 rounded border border-slate-800 font-mono">
                  {activeModalFinding.objectiveEvidence}
                </p>
              </div>

              {/* Two-Tier Decision Sign-off Status Panel */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                <span className="font-mono text-slate-400 text-[10px] uppercase block">
                  Two-Tier Independent Verification Sign-off Status
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Phase 1 (Implementation):</span>
                    <span className="text-emerald-400 font-bold">
                      {activeModalFinding.status === 'Closed' ? '✓ Implemented & Validated' : 'Under Field Verification'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Phase 2 (Sustained Effectiveness):</span>
                    <span className="text-cyan-400 font-bold">
                      {activeModalFinding.status === 'Closed' ? '✓ Certified Sustained (Closed)' : 'Observation Window Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enterprise Impact Cascade Summary */}
              {activeModalFinding.affectedProcedures && activeModalFinding.affectedProcedures.length > 0 && (
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1.5">
                  <span className="font-mono text-amber-400 text-[10px] uppercase block font-bold">
                    Affected Operating Procedures ({activeModalFinding.affectedProcedures.length})
                  </span>
                  <div className="space-y-1 font-mono text-[11px]">
                    {activeModalFinding.affectedProcedures.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-300">
                        <span><strong>{p.code}</strong> - {p.title}</span>
                        <span className="text-amber-400">{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedFindingId(activeModalFinding.id);
                  setActiveModalFinding(null);
                  setActiveModule('correctiveActions');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors font-mono font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Open in CAPA Two-Tier Workflow</span>
              </button>

              <div className="flex items-center gap-2">
                {activeModalFinding.status !== 'Closed' && (
                  <button
                    type="button"
                    onClick={() => handleCloseFinding(activeModalFinding.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow-sm transition-colors font-mono"
                    title="Validate two-tier verification criteria and close finding"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Attempt Closure</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveModalFinding(null)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
