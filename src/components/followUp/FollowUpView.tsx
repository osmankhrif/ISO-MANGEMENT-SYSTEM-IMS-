import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { FollowUpRecord, Finding } from '../../types/index.ts';
import {
  CheckCircle,
  RotateCcw,
  Calendar,
  AlertTriangle,
  History,
  ShieldCheck,
  Plus,
  ArrowRight,
} from 'lucide-react';

export const FollowUpView: React.FC = () => {
  const { dataVersion, triggerDataRefresh, currentUser, setActiveModule, setSelectedFindingId } = useApp();

  const findings = useMemo(() => DbService.getFindings(), [dataVersion]);
  const followUps = useMemo(() => DbService.getFollowUps(), [dataVersion]);
  const audits = useMemo(() => DbService.getAudits(), [dataVersion]);
  const auditLogs = useMemo(() => DbService.getAuditTrail(50), [dataVersion]);

  // Modal to schedule follow-up
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newFu, setNewFu] = useState<Partial<FollowUpRecord>>({
    findingId: findings[0]?.id || '',
    auditId: findings[0]?.auditId || 'aud-001',
    scheduledDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    conductedBy: currentUser.fullName,
    verificationNotes: '',
    effectivenessResult: 'Effective',
    decision: 'Close Finding',
  });

  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFu.findingId) return;

    DbService.saveFollowUp(newFu, currentUser.fullName);

    // If decision is Close Finding, attempt closure
    if (newFu.decision === 'Close Finding') {
      DbService.closeFinding(newFu.findingId, currentUser.fullName);
    } else if (newFu.decision === 'Require Additional Action') {
      // Reopen finding status
      DbService.saveFinding(
        { id: newFu.findingId, status: 'Under Investigation' },
        currentUser.fullName
      );
    }

    setShowScheduleModal(false);
    triggerDataRefresh();
    alert('Follow-up verification record logged and status updated!');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Follow-Up & Post-Audit Verification
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Independent verification of corrective action sustainability and closure governance.
          </p>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Follow-up Audit</span>
        </button>
      </div>

      {/* Grid: Follow-ups List & Status History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Follow-Up Records */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-3">
              Scheduled & Completed Follow-Up Reviews
            </h2>

            <div className="space-y-3">
              {followUps.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No dedicated follow-up records logged yet.
                </div>
              ) : (
                followUps.map((fu) => {
                  const targetFinding = findings.find((f) => f.id === fu.findingId);
                  const isEffective = fu.effectivenessResult === 'Effective';

                  return (
                    <div
                      key={fu.id}
                      className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">
                            {targetFinding?.findingNumber || fu.findingId}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-white font-medium">
                            {targetFinding?.category || 'Nonconformity'}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            isEffective
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                              : 'bg-red-950 text-red-400 border-red-800/60'
                          }`}
                        >
                          {fu.effectivenessResult}
                        </span>
                      </div>

                      <p className="text-slate-300 text-xs leading-relaxed">
                        {fu.verificationNotes || 'Follow-up verification completed on site.'}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900 font-mono">
                        <span>Conducted By: <strong className="text-slate-200">{fu.conductedBy}</strong></span>
                        <span>Date: <strong className="text-slate-200">{fu.scheduledDate}</strong></span>
                        <span>Decision: <strong className="text-amber-400">{fu.decision}</strong></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Immutable Status Change Audit History */}
        <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              Compliance Status History
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Immutable Log</span>
          </div>

          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
            {auditLogs.slice(0, 15).map((log) => (
              <div
                key={log.id}
                className="p-2 rounded bg-slate-950/80 border border-slate-800/80 text-[11px] space-y-1"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-amber-400">{log.userName}</span>
                  <span className="text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-slate-300 font-mono text-[10px]">
                  <span className="text-sky-400 font-semibold">{log.action}</span> on{' '}
                  <span className="text-white">{log.recordIdentifier}</span>
                </div>
                {log.newValue && (
                  <p className="text-[10px] text-slate-400 truncate">{log.newValue}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Schedule Follow-up */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-3">Schedule Follow-Up Verification</h2>
            <form onSubmit={handleSaveFollowUp} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Target Nonconformity *</label>
                <select
                  value={newFu.findingId}
                  onChange={(e) => {
                    const f = findings.find((item) => item.id === e.target.value);
                    setNewFu({
                      ...newFu,
                      findingId: e.target.value,
                      auditId: f?.auditId || 'aud-001',
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                >
                  {findings.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.findingNumber} ({f.category}) - {f.description.slice(0, 35)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Verification Date</label>
                  <input
                    type="date"
                    required
                    value={newFu.scheduledDate}
                    onChange={(e) => setNewFu({ ...newFu, scheduledDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Lead Reviewer</label>
                  <input
                    type="text"
                    required
                    value={newFu.conductedBy}
                    onChange={(e) => setNewFu({ ...newFu, conductedBy: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Verification Audit Observations</label>
                <textarea
                  rows={2}
                  value={newFu.verificationNotes}
                  onChange={(e) => setNewFu({ ...newFu, verificationNotes: e.target.value })}
                  placeholder="Record objective evidence checked in field during follow-up walk..."
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Effectiveness Result</label>
                  <select
                    value={newFu.effectivenessResult}
                    onChange={(e) => setNewFu({ ...newFu, effectivenessResult: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    <option value="Effective">Effective</option>
                    <option value="Partially Effective">Partially Effective</option>
                    <option value="Ineffective">Ineffective</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Follow-up Decision</label>
                  <select
                    value={newFu.decision}
                    onChange={(e) => setNewFu({ ...newFu, decision: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-semibold"
                  >
                    <option value="Close Finding">Close Finding</option>
                    <option value="Require Additional Action">Require Additional Action (Reopen)</option>
                    <option value="Re-audit">Re-audit</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded"
                >
                  Log Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
