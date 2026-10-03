import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { sqlite } from '../../db/sqliteEngine.ts';
import {
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RotateCcw,
  CheckCheck,
  TrendingUp,
  Percent,
  Flame,
  Building2,
  Trash2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { dataVersion, triggerDataRefresh, setActiveModule, navigateToAudit, navigateToFinding } = useApp();

  const metrics = useMemo(() => {
    return DbService.getDashboardMetrics();
  }, [dataVersion]);

  // Check if demo data exists
  const hasDemoData = useMemo(() => {
    try {
      const row = sqlite.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM audits WHERE is_demo = 1');
      return Boolean(row && row.cnt > 0);
    } catch {
      return false;
    }
  }, [dataVersion]);

  const handleDeleteDemoData = async () => {
    if (window.confirm('Are you sure you want to delete all DEMO records? This will purge all sample audits, checklists, and findings.')) {
      await sqlite.deleteDemoData();
      triggerDataRefresh();
    }
  };

  const handleResetDemoData = async () => {
    if (window.confirm('Reset database to default ISO System (IMS) baseline data? Any unsaved edits will be replaced.')) {
      await sqlite.resetToDemoData();
      triggerDataRefresh();
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Executive Audit Dashboard
            <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              ISO 9001 / 14001 / 45001 / 50001
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time compliance KPIs, nonconformity status, and mechanical integrity audit metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasDemoData ? (
            <button
              onClick={handleDeleteDemoData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-white bg-red-950/40 hover:bg-red-900 border border-red-800/60 rounded transition-colors"
              title="Delete sample petrochemical demonstration data"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Demo Data</span>
            </button>
          ) : (
            <button
              onClick={handleResetDemoData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 hover:text-slate-950 bg-amber-500/10 hover:bg-amber-400 border border-amber-500/30 rounded transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Load Demo Data</span>
            </button>
          )}

          <button
            onClick={() => setActiveModule('execution')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors shadow-sm"
          >
            <span>Execute Field Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Demo Data Notice if present */}
      {hasDemoData && (
        <div className="bg-amber-950/30 border border-amber-500/30 px-4 py-2.5 rounded text-xs text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-semibold">DEMO DATA ACTIVE:</span>
            <span>Displaying pre-loaded petrochemical audits for Crude Distillation, Flare Header, and Hydrocracker.</span>
          </div>
          <button
            onClick={handleDeleteDemoData}
            className="text-amber-400 underline font-semibold hover:text-amber-300"
          >
            Clear demo records
          </button>
        </div>
      )}

      {/* KPI Cards Grid - Clickable to open relevant records */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {/* Total Audits */}
        <button
          onClick={() => setActiveModule('auditProgram')}
          className="text-left bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Audits</span>
            <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {metrics.totalAudits}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">2026 Annual Program</div>
        </button>

        {/* Planned Audits */}
        <button
          onClick={() => setActiveModule('planning')}
          className="text-left bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Planned</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 tabular-nums">
            {metrics.plannedAudits}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Scheduled in calendar</div>
        </button>

        {/* In Progress */}
        <button
          onClick={() => setActiveModule('execution')}
          className="text-left bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">In Progress</span>
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {metrics.auditsInProgress}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active field checklists</div>
        </button>

        {/* Completed Audits */}
        <button
          onClick={() => setActiveModule('reports')}
          className="text-left bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {metrics.completedAudits}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{metrics.auditCompletionRate}% completion rate</div>
        </button>

        {/* Open Findings */}
        <button
          onClick={() => setActiveModule('findings')}
          className="text-left bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Open Findings</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {metrics.openFindings}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Pending investigation</div>
        </button>

        {/* Critical Findings */}
        <button
          onClick={() => setActiveModule('findings')}
          className="text-left bg-slate-900/90 border border-red-900/50 hover:border-red-700 p-3.5 rounded transition-colors group bg-red-950/10"
        >
          <div className="flex items-center justify-between text-red-300 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Critical NC</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400 tabular-nums">
            {metrics.criticalFindings}
          </div>
          <div className="text-[11px] text-red-300/80 mt-1">Immediate action required</div>
        </button>

        {/* Overdue CAPA */}
        <button
          onClick={() => setActiveModule('correctiveActions')}
          className="text-left bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Overdue CAPA</span>
            <RotateCcw className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-orange-400 tabular-nums">
            {metrics.overdueCorrectiveActions}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Past target date</div>
        </button>

        {/* Closed Findings */}
        <button
          onClick={() => setActiveModule('followUp')}
          className="text-left bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Closed NC</span>
            <CheckCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {metrics.closedFindings}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Effectiveness verified</div>
        </button>

        {/* CA Effectiveness % */}
        <button
          onClick={() => setActiveModule('analytics')}
          className="text-left bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Effectiveness</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400 tabular-nums">
            {metrics.correctiveActionEffectiveness}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Post-closure verification</div>
        </button>

        {/* Recurring Findings */}
        <button
          onClick={() => setActiveModule('findings')}
          className="text-left bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Repeat NC</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400 tabular-nums">
            {metrics.recurringFindingsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Recurring system root causes</div>
        </button>
      </div>

      {/* Lead Auditor & Underwriting Governance Benchmark (Enterprise Grade) */}
      <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              ISO & Insurance Underwriting Governance Benchmark
            </h2>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              Institutional Loss Control
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>External Surveyor Alignment</span>
            <span>·</span>
            <button
              onClick={() => setActiveModule('correctiveActions')}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>Manage Two-Tier CAPA</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Column 1: Two-Tier Sign-off Pipeline */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px] font-bold uppercase">1. Two-Tier Decisions</span>
              <CheckCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Phase 1 (Physical Implementation):</span>
                <span className="font-mono font-bold text-emerald-400">Validated</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Phase 2 (Sustained Effectiveness):</span>
                <span className="font-mono font-bold text-cyan-400">60-Day Gate</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900 leading-tight">
                Mandates independent operational proof and sustained non-recurrence before ISO closure.
              </p>
            </div>
          </div>

          {/* Column 2: Cross-Enterprise Impact Cascade */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px] font-bold uppercase">2. Enterprise Traceability</span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Affected SOP Revisions:</span>
                <span className="font-mono text-amber-400 font-bold">Active in Queue</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Risk Register Realignment:</span>
                <span className="font-mono text-emerald-400 font-bold">Residual Re-scored</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900 leading-tight">
                Connects audit findings directly to document control, risk registers, and competence matrices.
              </p>
            </div>
          </div>

          {/* Column 3: Property Underwriting Risk & ALOP */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-mono text-[11px] font-bold uppercase">3. Loss Prevention & BI</span>
              <Flame className="w-4 h-4 text-red-400" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Insurable Property Exposure:</span>
                <span className="font-mono text-red-400 font-bold">Severe & Catastrophic</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Policy Warranty Status:</span>
                <span className="font-mono text-emerald-400 font-bold">100% Warranted</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900 leading-tight">
                Standardized for industrial property underwriters (FM Global, Swiss Re, Allianz).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Audit Trend */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 rounded">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Monthly Audit Execution Trend (2026)
              </h2>
              <span className="text-xs text-slate-400">Planned vs. Completed audits across calendar year</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded-sm bg-slate-700" /> Planned
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Completed
              </span>
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-800">
            {metrics.monthlyAuditTrend.map((m) => {
              const maxVal = 5;
              const plannedH = Math.max((m.planned / maxVal) * 120, 6);
              const completedH = Math.max((m.completed / maxVal) * 120, m.completed > 0 ? 12 : 0);

              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1">
                    {/* Planned Bar */}
                    <div
                      style={{ height: `${plannedH}px` }}
                      className="w-2.5 sm:w-3.5 bg-slate-700 hover:bg-slate-600 rounded-t transition-all relative group"
                      title={`${m.month}: ${m.planned} Planned`}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.planned}
                      </span>
                    </div>

                    {/* Completed Bar */}
                    <div
                      style={{ height: `${completedH}px` }}
                      className={`w-2.5 sm:w-3.5 rounded-t transition-all relative group ${
                        m.completed > 0 ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-transparent'
                      }`}
                      title={`${m.month}: ${m.completed} Completed`}
                    >
                      {m.completed > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {m.completed}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">{m.month}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Overall Program Completion: <strong className="text-white font-mono">{metrics.auditCompletionRate}%</strong></span>
            <button
              onClick={() => setActiveModule('auditProgram')}
              className="text-amber-400 hover:underline flex items-center gap-1 text-xs"
            >
              Open Full Program Schedule <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Findings by Severity Donut / Meter */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Findings by Severity
            </h2>
            <p className="text-xs text-slate-400 mb-4">Distribution by ISO nonconformity tier</p>

            <div className="space-y-3">
              {metrics.findingsBySeverity.map((sev) => {
                const total = metrics.openFindings + metrics.closedFindings || 1;
                const pct = Math.round((sev.count / total) * 100);
                return (
                  <div key={sev.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: sev.color }}
                        />
                        {sev.category}
                      </span>
                      <span className="font-mono text-white font-semibold">
                        {sev.count} <span className="text-slate-500 font-normal text-[11px]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: sev.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveModule('findings')}
              className="w-full py-1.5 text-xs text-center text-slate-300 bg-slate-800 hover:bg-slate-750 hover:text-white rounded transition-colors font-medium"
            >
              View Findings Register
            </button>
          </div>
        </div>
      </div>

      {/* Findings by Department & Recent Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Findings by Department */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              Findings by Department
            </h2>
            <span className="text-xs text-slate-400">Total vs. Critical</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {metrics.findingsByDepartment.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No findings recorded</p>
            ) : (
              metrics.findingsByDepartment.map((dept) => (
                <div key={dept.department} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-white font-medium">{dept.department}</div>
                    <div className="text-[11px] text-slate-400">Petrochemical Complex Unit</div>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-300">
                      Total: <strong className="text-white">{dept.count}</strong>
                    </span>
                    {dept.critical > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/50 text-[11px] font-semibold">
                        {dept.critical} Critical
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">0 Critical</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Audits List */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              Active Facility Audits
            </h2>
            <button
              onClick={() => setActiveModule('auditProgram')}
              className="text-xs text-amber-400 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-2">
            {DbService.getAudits().slice(0, 4).map((audit) => (
              <div
                key={audit.id}
                onClick={() => navigateToAudit(audit.id, 'planning')}
                className="p-2.5 rounded bg-slate-800/50 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-semibold text-amber-400">
                      {audit.auditNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {audit.plannedStartDate}
                    </span>
                  </div>
                  <div className="text-xs text-white font-medium truncate">{audit.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {audit.area} · {audit.department}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-mono rounded ${
                      audit.status === 'Completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : audit.status === 'In Progress'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {audit.status}
                  </span>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Risk: {audit.riskLevel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
