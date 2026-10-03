import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { Standard } from '../../types/index.ts';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Shield,
  FileCode,
} from 'lucide-react';

export const StandardsView: React.FC = () => {
  const { dataVersion, triggerDataRefresh, currentUser, canPerform } = useApp();
  const [search, setSearch] = useState('');
  const [selectedStandardId, setSelectedStandardId] = useState<string>('std-3'); // ISO 45001 default
  const [expandedClauses, setExpandedClauses] = useState<Record<string, boolean>>({
    'cls-1': true,
    'cls-2': true,
    'cls-3': true,
  });

  // Modal states
  const [showAddStandardModal, setShowAddStandardModal] = useState(false);
  const [showAddClauseModal, setShowAddClauseModal] = useState(false);
  const [showAddRequirementModal, setShowAddRequirementModal] = useState(false);
  const [activeClauseForReq, setActiveClauseForReq] = useState<string | null>(null);

  // Form states
  const [newStd, setNewStd] = useState<Partial<Standard>>({
    code: '',
    title: '',
    revisionYear: '2026',
    issuingBody: 'ISO',
    category: 'Quality',
    description: '',
    isActive: true,
  });

  const [newClause, setNewClause] = useState({ clauseNumber: '', title: '', description: '' });
  const [newReq, setNewReq] = useState({ code: '', title: '', text: '', guidance: '', riskLevel: 'Medium' });

  const standards = useMemo(() => DbService.getStandards(), [dataVersion]);

  const filteredStandards = useMemo(() => {
    if (!search.trim()) return standards;
    const term = search.toLowerCase();
    return standards.filter(
      (s) =>
        s.code.toLowerCase().includes(term) ||
        s.title.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term)
    );
  }, [standards, search]);

  const currentStandard = useMemo(() => {
    return standards.find((s) => s.id === selectedStandardId) || standards[0] || null;
  }, [standards, selectedStandardId]);

  const toggleClause = (clauseId: string) => {
    setExpandedClauses((prev) => ({ ...prev, [clauseId]: !prev[clauseId] }));
  };

  const handleAddStandard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStd.code || !newStd.title) return;
    const created = DbService.saveStandard(newStd, currentUser.fullName);
    setShowAddStandardModal(false);
    triggerDataRefresh();
    setSelectedStandardId(created.id);
    setNewStd({
      code: '',
      title: '',
      revisionYear: '2026',
      issuingBody: 'ISO',
      category: 'Quality',
      description: '',
      isActive: true,
    });
  };

  const handleAddClause = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStandard || !newClause.clauseNumber || !newClause.title) return;
    DbService.saveClause(
      currentStandard.id,
      newClause.clauseNumber,
      newClause.title,
      newClause.description,
      currentUser.fullName
    );
    setShowAddClauseModal(false);
    triggerDataRefresh();
    setNewClause({ clauseNumber: '', title: '', description: '' });
  };

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClauseForReq || !newReq.code || !newReq.title) return;
    DbService.saveRequirement(
      activeClauseForReq,
      newReq.code,
      newReq.title,
      newReq.text,
      newReq.guidance,
      newReq.riskLevel,
      currentUser.fullName
    );
    setShowAddRequirementModal(false);
    triggerDataRefresh();
    setNewReq({ code: '', title: '', text: '', guidance: '', riskLevel: 'Medium' });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Audit Standards & Compliance Criteria
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure ISO frameworks, engineering standards, OSHA regulations, and petrochemical procedures.
          </p>
        </div>

        {canPerform('edit_standards') && (
          <button
            onClick={() => setShowAddStandardModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Standard</span>
          </button>
        )}
      </div>

      {/* Main Grid: Standards List on Left, Clauses & Requirements on Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Standards List */}
        <div className="bg-slate-900 border border-slate-800 rounded p-3 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search standards..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
            {filteredStandards.map((std) => {
              const isSelected = currentStandard?.id === std.id;
              return (
                <button
                  key={std.id}
                  onClick={() => setSelectedStandardId(std.id)}
                  className={`w-full text-left p-2.5 rounded text-xs transition-colors border ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-white text-xs">{std.code}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {std.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 line-clamp-1">{std.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{std.issuingBody} · Rev {std.revisionYear}</span>
                    <span>{std.clauses?.length || 0} Clauses</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Clauses & Requirements Breakdown */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded p-4 space-y-4">
          {currentStandard ? (
            <>
              {/* Standard Header Banner */}
              <div className="pb-3 border-b border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white font-mono">{currentStandard.code}</h2>
                    <span className="text-xs text-slate-400 font-mono">({currentStandard.revisionYear})</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">
                      {currentStandard.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{currentStandard.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{currentStandard.description}</p>
                </div>

                {canPerform('edit_standards') && (
                  <button
                    onClick={() => setShowAddClauseModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors shrink-0"
                  >
                    <Plus className="w-3 h-3 text-amber-400" />
                    <span>Add Clause</span>
                  </button>
                )}
              </div>

              {/* Clauses Accordion */}
              <div className="space-y-3">
                {(!currentStandard.clauses || currentStandard.clauses.length === 0) ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No clauses configured for this standard. Click "Add Clause" to add audit criteria.
                  </div>
                ) : (
                  currentStandard.clauses.map((cls) => {
                    const isExpanded = Boolean(expandedClauses[cls.id]);
                    const reqCount = cls.requirements?.length || 0;

                    return (
                      <div
                        key={cls.id}
                        className="bg-slate-950 border border-slate-800 rounded overflow-hidden"
                      >
                        {/* Clause Bar */}
                        <div
                          onClick={() => toggleClause(cls.id)}
                          className="p-3 bg-slate-900/60 hover:bg-slate-900 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-amber-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="font-mono text-xs font-bold text-amber-400">
                              Clause {cls.clauseNumber}:
                            </span>
                            <span className="text-xs font-semibold text-white">{cls.title}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {reqCount} {reqCount === 1 ? 'Requirement' : 'Requirements'}
                            </span>
                            {canPerform('edit_standards') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveClauseForReq(cls.id);
                                  setShowAddRequirementModal(true);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                                title="Add Requirement to this Clause"
                              >
                                <Plus className="w-3.5 h-3.5 text-sky-400" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Clause Description & Requirements List */}
                        {isExpanded && (
                          <div className="p-3.5 border-t border-slate-800/80 space-y-3 bg-slate-950">
                            {cls.description && (
                              <p className="text-[11px] text-slate-400 italic">{cls.description}</p>
                            )}

                            {reqCount === 0 ? (
                              <div className="text-[11px] text-slate-500 py-2">
                                No specific requirements logged. Click the (+) button to define audit criteria.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {cls.requirements?.map((req) => (
                                  <div
                                    key={req.id}
                                    className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-xs"
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-mono text-[11px] font-bold text-sky-400">
                                        {req.requirementCode} - {req.title}
                                      </span>
                                      <span
                                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                          req.riskLevel === 'Critical'
                                            ? 'bg-red-950 text-red-400 border-red-800/50'
                                            : req.riskLevel === 'High'
                                            ? 'bg-amber-950 text-amber-400 border-amber-800/50'
                                            : 'bg-slate-800 text-slate-300 border-slate-700'
                                        }`}
                                      >
                                        {req.riskLevel}
                                      </span>
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">
                                      {req.requirementText}
                                    </p>
                                    {req.evidenceGuidance && (
                                      <div className="mt-1.5 text-[10px] text-slate-400 font-mono bg-slate-950/60 p-1.5 rounded">
                                        <strong className="text-slate-300 font-semibold">Evidence Guidance:</strong>{' '}
                                        {req.evidenceGuidance}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              Select a standard on the left to inspect its clauses.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Standard */}
      {showAddStandardModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-3">Add Audit Standard / Specification</h2>
            <form onSubmit={handleAddStandard} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Standard Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ISO 50001 or API RP 754"
                  value={newStd.code}
                  onChange={(e) => setNewStd({ ...newStd, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Full Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Energy Management Systems - Requirements"
                  value={newStd.title}
                  onChange={(e) => setNewStd({ ...newStd, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Revision Year</label>
                  <input
                    type="text"
                    value={newStd.revisionYear}
                    onChange={(e) => setNewStd({ ...newStd, revisionYear: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Category</label>
                  <select
                    value={newStd.category}
                    onChange={(e) => setNewStd({ ...newStd, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    <option value="Quality">Quality</option>
                    <option value="HSE">HSE</option>
                    <option value="Energy">Energy</option>
                    <option value="Asset">Asset</option>
                    <option value="Operational">Operational</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Issuing Body</label>
                <input
                  type="text"
                  value={newStd.issuingBody}
                  onChange={(e) => setNewStd({ ...newStd, issuingBody: e.target.value })}
                  placeholder="e.g. ISO, API, EPA, Internal"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newStd.description}
                  onChange={(e) => setNewStd({ ...newStd, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStandardModal(false)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded"
                >
                  Save Standard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Clause */}
      {showAddClauseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-3">Add Clause to {currentStandard?.code}</h2>
            <form onSubmit={handleAddClause} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Clause Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 6.1.2 or 8.5.1"
                  value={newClause.clauseNumber}
                  onChange={(e) => setNewClause({ ...newClause, clauseNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Clause Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hazard Identification & Risk Assessment"
                  value={newClause.title}
                  onChange={(e) => setNewClause({ ...newClause, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Description / Summary</label>
                <textarea
                  rows={2}
                  value={newClause.description}
                  onChange={(e) => setNewClause({ ...newClause, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddClauseModal(false)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded"
                >
                  Save Clause
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Requirement */}
      {showAddRequirementModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-3">Add Specific Audit Requirement</h2>
            <form onSubmit={handleAddRequirement} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Requirement Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. REQ-HAZ-01"
                    value={newReq.code}
                    onChange={(e) => setNewReq({ ...newReq, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Risk Level</label>
                  <select
                    value={newReq.riskLevel}
                    onChange={(e) => setNewReq({ ...newReq, riskLevel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Requirement Short Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flare Header Velocity Verification"
                  value={newReq.title}
                  onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Requirement Text *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Mandatory condition or normative standard statement..."
                  value={newReq.text}
                  onChange={(e) => setNewReq({ ...newReq, text: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Evidence Required Guidance</label>
                <textarea
                  rows={2}
                  placeholder="What document, certificate, or field test the auditor must verify..."
                  value={newReq.guidance}
                  onChange={(e) => setNewReq({ ...newReq, guidance: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRequirementModal(false)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded"
                >
                  Save Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
