import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { ExcelService } from '../../utils/excelService.ts';
import {
  BarChart3,
  TrendingUp,
  Percent,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Users,
  Building,
  Download,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { dataVersion } = useApp();

  const metrics = useMemo(() => DbService.getDashboardMetrics(), [dataVersion]);
  const audits = useMemo(() => DbService.getAudits(), [dataVersion]);
  const findings = useMemo(() => DbService.getFindings(), [dataVersion]);
  const auditors = useMemo(() => DbService.getAuditors(), [dataVersion]);
  const capalist = useMemo(() => DbService.getCorrectiveActions(), [dataVersion]);

  // Average closure time for findings (in days)
  const avgClosureTimeDays = useMemo(() => {
    const closed = findings.filter((f) => f.status === 'Closed' && f.closureDate);
    if (closed.length === 0) return 24; // baseline industry average
    let totalDays = 0;
    closed.forEach((f) => {
      const start = new Date(f.dateIdentified).getTime();
      const end = new Date(f.closureDate!).getTime();
      const diff = Math.max(1, Math.round((end - start) / 86400000));
      totalDays += diff;
    });
    return Math.round(totalDays / closed.length);
  }, [findings]);

  // Findings by Standard breakdown
  const findingsByStandard = useMemo(() => {
    const map: Record<string, number> = {};
    findings.forEach((f) => {
      const std = f.standardCode || 'ISO 9001';
      map[std] = (map[std] || 0) + 1;
    });
    return Object.entries(map).map(([standard, count]) => ({ standard, count }));
  }, [findings]);

  // Findings by Process breakdown
  const findingsByProcess = useMemo(() => {
    const map: Record<string, number> = {};
    findings.forEach((f) => {
      const p = f.process || 'General Process';
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).map(([process, count]) => ({ process, count }));
  }, [findings]);

  const handleExportAnalytics = () => {
    ExcelService.exportFindings(findings);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Executive Compliance KPI & Performance Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quantitative analysis of management systems, resolution latency, repeat patterns, and auditor productivity.
          </p>
        </div>

        <button
          onClick={handleExportAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export Analytics Data</span>
        </button>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded text-xs space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
            Audit Completion Rate
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {metrics.auditCompletionRate}%
          </div>
          <p className="text-[11px] text-slate-500">
            {metrics.completedAudits} of {metrics.totalAudits} audits executed
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded text-xs space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
            Average NC Closure Time
          </span>
          <div className="text-2xl font-bold font-mono text-sky-400 tabular-nums">
            {avgClosureTimeDays} <span className="text-sm font-normal text-slate-400">days</span>
          </div>
          <p className="text-[11px] text-slate-500">Industry benchmark: 30 days max</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded text-xs space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
            CAPA Effectiveness
          </span>
          <div className="text-2xl font-bold font-mono text-indigo-400 tabular-nums">
            {metrics.correctiveActionEffectiveness}%
          </div>
          <p className="text-[11px] text-slate-500">Verified zero recurrence post-audit</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded text-xs space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
            Repeat Finding Index
          </span>
          <div className="text-2xl font-bold font-mono text-purple-400 tabular-nums">
            {metrics.recurringFindingsCount}
          </div>
          <p className="text-[11px] text-slate-500">Recurring system root causes</p>
        </div>
      </div>

      {/* Grid: Charts & Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Findings by Standard */}
        <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Findings by Audit Standard
          </h2>
          <div className="space-y-2">
            {findingsByStandard.map((item) => {
              const maxCount = Math.max(...findingsByStandard.map((s) => s.count), 1);
              const pct = Math.round((item.count / findings.length) * 100);
              return (
                <div key={item.standard} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">{item.standard}</span>
                    <span className="font-mono text-white">
                      {item.count} findings ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Findings by Process */}
        <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Findings by Industrial Process
          </h2>
          <div className="space-y-2">
            {findingsByProcess.map((item) => {
              const maxCount = Math.max(...findingsByProcess.map((s) => s.count), 1);
              return (
                <div key={item.process} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium truncate max-w-[220px]">
                      {item.process}
                    </span>
                    <span className="font-mono text-white">{item.count} findings</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 rounded-full"
                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Auditor Productivity & Workload Table */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          Auditor Productivity & Field Inspection Hours
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Auditor Name</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Competency</th>
                <th className="py-2.5 px-3 text-right">Audits Led / Participated</th>
                <th className="py-2.5 px-3 text-right">Audit Hours</th>
                <th className="py-2.5 px-3 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {auditors.map((aud) => (
                <tr key={aud.id} className="hover:bg-slate-850/50">
                  <td className="py-2.5 px-3 font-sans font-medium text-white">{aud.name}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-400">{aud.department}</td>
                  <td className="py-2.5 px-3 text-slate-300">{aud.competencyLevel}</td>
                  <td className="py-2.5 px-3 text-right text-slate-200">{aud.numberOfAudits}</td>
                  <td className="py-2.5 px-3 text-right text-amber-400 font-bold">{aud.auditHours} hrs</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">★ {aud.performanceRating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
