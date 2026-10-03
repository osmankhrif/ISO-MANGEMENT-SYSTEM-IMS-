import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { ExcelService } from '../../utils/excelService.ts';
import { Checklist, ChecklistItem } from '../../types/index.ts';
import {
  CheckSquare,
  Plus,
  Copy,
  Download,
  Upload,
  Trash2,
  Edit2,
  FolderPlus,
  ArrowRight,
  ListOrdered,
} from 'lucide-react';

export const ChecklistsView: React.FC = () => {
  const { dataVersion, triggerDataRefresh, currentUser, setActiveModule, navigateToAudit } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checklists = useMemo(() => DbService.getChecklists(), [dataVersion]);
  const standards = useMemo(() => DbService.getStandards(), [dataVersion]);
  const audits = useMemo(() => DbService.getAudits(), [dataVersion]);

  const [selectedChecklistId, setSelectedChecklistId] = useState<string>(
    checklists[0]?.id || 'chk-001'
  );

  const currentChecklist = useMemo(() => {
    return checklists.find((c) => c.id === selectedChecklistId) || checklists[0] || null;
  }, [checklists, selectedChecklistId]);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Forms
  const [newChecklist, setNewChecklist] = useState<Partial<Checklist>>({
    title: '',
    description: '',
    standardId: 'std-3',
    department: 'Refinery Operations',
    process: 'Atmospheric Distillation',
    isTemplate: true,
  });

  const [newItem, setNewItem] = useState<Partial<ChecklistItem>>({
    clauseNumber: '8.1',
    standardCode: 'ISO 45001',
    requirement: '',
    question: '',
    evidenceRequired: '',
    department: 'Operations',
    process: '',
    riskLevel: 'Medium',
    sortOrder: 1,
  });

  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [duplicateAuditId, setDuplicateAuditId] = useState('');

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklist.title) return;
    const created = DbService.saveChecklist(newChecklist, currentUser.fullName);
    setShowCreateModal(false);
    triggerDataRefresh();
    setSelectedChecklistId(created.id);
    setNewChecklist({
      title: '',
      description: '',
      standardId: 'std-3',
      department: 'Refinery Operations',
      process: '',
      isTemplate: true,
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChecklist || !newItem.question) return;
    const items = [...(currentChecklist.items || []), {
      ...newItem,
      id: `item-${Date.now()}`,
      checklistId: currentChecklist.id,
      sortOrder: (currentChecklist.items?.length || 0) + 1,
    } as ChecklistItem];

    DbService.saveChecklist({ ...currentChecklist, items }, currentUser.fullName);
    setShowAddItemModal(false);
    triggerDataRefresh();
    setNewItem({
      clauseNumber: '8.1',
      standardCode: 'ISO 45001',
      requirement: '',
      question: '',
      evidenceRequired: '',
      department: currentChecklist.department,
      process: currentChecklist.process,
      riskLevel: 'Medium',
      sortOrder: items.length + 1,
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!currentChecklist) return;
    const items = (currentChecklist.items || []).filter((i) => i.id !== itemId);
    DbService.saveChecklist({ ...currentChecklist, items }, currentUser.fullName);
    triggerDataRefresh();
  };

  const handleDuplicate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChecklist || !duplicateTitle) return;
    const dup = DbService.duplicateChecklist(
      currentChecklist.id,
      duplicateTitle,
      duplicateAuditId || undefined,
      currentUser.fullName
    );
    setShowDuplicateModal(false);
    triggerDataRefresh();
    setSelectedChecklistId(dup.id);
  };

  const handleExportExcel = () => {
    if (!currentChecklist || !currentChecklist.items) return;
    ExcelService.exportChecklist(currentChecklist.items, currentChecklist.title);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentChecklist) return;
    try {
      const importedItems = await ExcelService.importChecklistFile(file);
      const items: ChecklistItem[] = [
        ...(currentChecklist.items || []),
        ...importedItems.map((it, idx) => ({
          ...it,
          id: `item-imp-${Date.now()}-${idx}`,
          checklistId: currentChecklist.id,
          clauseNumber: it.clauseNumber || '1.0',
          standardCode: it.standardCode || 'ISO 9001',
          requirement: it.requirement || 'Imported requirement',
          question: it.question || 'Imported question',
          evidenceRequired: it.evidenceRequired || '',
          department: it.department || currentChecklist.department,
          process: it.process || currentChecklist.process,
          riskLevel: it.riskLevel || 'Medium',
          sortOrder: (currentChecklist.items?.length || 0) + idx + 1,
        })),
      ];

      DbService.saveChecklist({ ...currentChecklist, items }, currentUser.fullName);
      triggerDataRefresh();
      alert(`Successfully imported ${importedItems.length} checklist questions from Excel!`);
    } catch (err: any) {
      alert(`Import failed: ${err.message || 'Invalid Excel format'}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Group items by clause for organized review
  const groupedByClause = useMemo(() => {
    if (!currentChecklist?.items) return {};
    const map: Record<string, ChecklistItem[]> = {};
    currentChecklist.items.forEach((item) => {
      const key = item.clauseNumber || 'General';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [currentChecklist]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Audit Checklist Builder & Question Bank
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build clause-structured audit questionnaires with verification guidance and risk weighting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Excel Import / Export */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
            title="Import questions from Excel or CSV file"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
            title="Export current checklist to Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          {/* Duplicate Checklist */}
          <button
            onClick={() => {
              setDuplicateTitle(`${currentChecklist?.title || 'Checklist'} (Copy)`);
              setShowDuplicateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
            title="Duplicate checklist for reuse"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Duplicate</span>
          </button>

          {/* Create New Checklist */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Checklist</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Checklists Sidebar + Items Manager */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Checklist Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded p-3 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider px-1">
            Available Checklists ({checklists.length})
          </div>

          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {checklists.map((chk) => {
              const isSelected = currentChecklist?.id === chk.id;
              return (
                <button
                  key={chk.id}
                  onClick={() => setSelectedChecklistId(chk.id)}
                  className={`w-full text-left p-3 rounded text-xs transition-colors border ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white truncate max-w-[180px]">
                      {chk.title}
                    </span>
                    {chk.isTemplate && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-400 font-mono">
                        Template
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {chk.department} · {chk.process}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono flex items-center justify-between">
                    <span>{chk.items?.length || 0} Questions</span>
                    <span className="text-amber-400/80">Active</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Checklist Questions Organized by Clause */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded p-4 space-y-4">
          {currentChecklist ? (
            <>
              {/* Checklist Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white">{currentChecklist.title}</h2>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Dept: <strong className="text-slate-200">{currentChecklist.department}</strong></span>
                    <span>·</span>
                    <span>Process: <strong className="text-slate-200">{currentChecklist.process}</strong></span>
                    <span>·</span>
                    <span>Total Items: <strong className="text-amber-400 font-mono">{currentChecklist.items?.length || 0}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddItemModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>

                  <button
                    onClick={() => setActiveModule('execution')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                    title="Launch field audit execution with this checklist"
                  >
                    <span>Execute</span>
                    <ArrowRight className="w-3 h-3 text-amber-400" />
                  </button>
                </div>
              </div>

              {/* Questions Grouped by Clause */}
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {Object.keys(groupedByClause).length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500">
                    No questions in this checklist. Click "Add Question" or "Import Excel" to populate.
                  </div>
                ) : (
                  Object.entries(groupedByClause).map(([clause, items]) => (
                    <div key={clause} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs font-mono font-bold text-amber-400">
                          Clause {clause}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({items[0]?.standardCode || 'Standard'}) · {items.length} question(s)
                        </span>
                      </div>

                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div
                            key={item.id}
                            className="p-3 rounded bg-slate-950 border border-slate-800 text-xs hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-slate-500 font-bold">
                                  #{idx + 1}
                                </span>
                                <span className="font-semibold text-white">
                                  {item.requirement || 'Requirement'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                    item.riskLevel === 'Critical'
                                      ? 'bg-red-950 text-red-400 border-red-800/50'
                                      : item.riskLevel === 'High'
                                      ? 'bg-amber-950 text-amber-400 border-amber-800/50'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {item.riskLevel}
                                </span>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-slate-500 hover:text-red-400 p-0.5 rounded"
                                  title="Delete Question"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <p className="text-slate-200 text-xs font-medium leading-relaxed mb-2">
                              {item.question}
                            </p>

                            <div className="bg-slate-900/80 p-2 rounded text-[11px] text-slate-400 font-mono">
                              <strong className="text-slate-300">Evidence Required:</strong>{' '}
                              {item.evidenceRequired || 'Documentary records, calibration logs, physical verification'}
                            </div>

                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                              <span>Department: {item.department}</span>
                              <span className="font-mono text-slate-400">Response Options: Conforming | Nonconforming | Obs | OFI | N/A</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              Select or create a checklist.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Checklist */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-3">Create New Audit Checklist</h2>
            <form onSubmit={handleCreateChecklist} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Checklist Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tank Farm High-Hazard Containment Checklist"
                  value={newChecklist.title}
                  onChange={(e) => setNewChecklist({ ...newChecklist, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Primary Standard</label>
                <select
                  value={newChecklist.standardId}
                  onChange={(e) => setNewChecklist({ ...newChecklist, standardId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                >
                  {standards.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={newChecklist.department}
                  onChange={(e) => setNewChecklist({ ...newChecklist, department: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Process / Area</label>
                <input
                  type="text"
                  placeholder="e.g. Flare Recovery or Naphtha Splitter"
                  value={newChecklist.process}
                  onChange={(e) => setNewChecklist({ ...newChecklist, process: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newChecklist.description}
                  onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-template"
                  checked={newChecklist.isTemplate}
                  onChange={(e) => setNewChecklist({ ...newChecklist, isTemplate: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500"
                />
                <label htmlFor="chk-template" className="text-slate-300 text-xs">
                  Save as reusable template for future audits
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded"
                >
                  Create Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Question / Item */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-3">Add Checklist Question</h2>
            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Standard Code</label>
                  <input
                    type="text"
                    value={newItem.standardCode}
                    onChange={(e) => setNewItem({ ...newItem, standardCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Clause Number</label>
                  <input
                    type="text"
                    value={newItem.clauseNumber}
                    onChange={(e) => setNewItem({ ...newItem, clauseNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Requirement / Topic Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pressure Safety Relief Valve Overdue Backlog"
                  value={newItem.requirement}
                  onChange={(e) => setNewItem({ ...newItem, requirement: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Audit Question *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specific field verification question the auditor will answer..."
                  value={newItem.question}
                  onChange={(e) => setNewItem({ ...newItem, question: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Objective Evidence Required</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Inspect physical calibration tag, SAP maintenance order, test certificate..."
                  value={newItem.evidenceRequired}
                  onChange={(e) => setNewItem({ ...newItem, evidenceRequired: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Risk Level</label>
                  <select
                    value={newItem.riskLevel}
                    onChange={(e) => setNewItem({ ...newItem, riskLevel: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={newItem.sortOrder}
                    onChange={(e) => setNewItem({ ...newItem, sortOrder: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded"
                >
                  Add to Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Duplicate Checklist */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-3">Duplicate Checklist</h2>
            <form onSubmit={handleDuplicate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">New Checklist Title *</label>
                <input
                  type="text"
                  required
                  value={duplicateTitle}
                  onChange={(e) => setDuplicateTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Attach to Specific Audit (Optional)</label>
                <select
                  value={duplicateAuditId}
                  onChange={(e) => setDuplicateAuditId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                >
                  <option value="">None (Standalone Template)</option>
                  {audits.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.auditNumber} - {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded"
                >
                  Duplicate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
