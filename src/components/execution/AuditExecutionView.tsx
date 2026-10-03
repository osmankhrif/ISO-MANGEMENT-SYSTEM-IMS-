import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { ChecklistItem, ChecklistResponse, Finding, AuditResponseRecord } from '../../types/index.ts';
import {
  PlaySquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Camera,
  Paperclip,
  Save,
  PlusCircle,
  CheckCheck,
  Building,
  Flame,
  FileText,
} from 'lucide-react';

export const AuditExecutionView: React.FC = () => {
  const {
    selectedAuditId,
    setSelectedAuditId,
    dataVersion,
    triggerDataRefresh,
    currentUser,
    setActiveModule,
    navigateToFinding,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audits = useMemo(() => DbService.getAudits(), [dataVersion]);

  // Current selected audit
  const currentAudit = useMemo(() => {
    return audits.find((a) => a.id === selectedAuditId) || audits[0] || null;
  }, [audits, selectedAuditId]);

  // Checklist for this audit or default template
  const checklists = useMemo(() => {
    if (!currentAudit) return [];
    return DbService.getChecklists(currentAudit.id);
  }, [currentAudit, dataVersion]);

  const activeChecklist = checklists[0] || null;

  // Stored responses from SQLite
  const existingResponses = useMemo(() => {
    if (!currentAudit) return [];
    return DbService.getAuditResponses(currentAudit.id);
  }, [currentAudit, dataVersion]);

  // Working state for responses
  const [responseMap, setResponseMap] = useState<Record<string, Partial<AuditResponseRecord>>>({});
  const [activeItemForFinding, setActiveItemForFinding] = useState<ChecklistItem | null>(null);
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [newFindingForm, setNewFindingForm] = useState<Partial<Finding>>({});
  const [attachedPhotos, setAttachedPhotos] = useState<Record<string, string[]>>({});
  const [activePhotoUploadItemId, setActivePhotoUploadItemId] = useState<string | null>(null);

  // Initialize responseMap with existing responses
  useMemo(() => {
    const map: Record<string, Partial<AuditResponseRecord>> = {};
    existingResponses.forEach((r) => {
      map[r.checklistItemId] = r;
    });
    setResponseMap(map);
  }, [existingResponses]);

  const handleSetResponseValue = (itemId: string, value: ChecklistResponse) => {
    const current = responseMap[itemId] || {
      auditId: currentAudit?.id,
      checklistItemId: itemId,
      auditorNotes: '',
      objectiveEvidence: '',
      evaluatedBy: currentUser.fullName,
    };
    const updated = { ...current, responseValue: value };
    setResponseMap((prev) => ({ ...prev, [itemId]: updated }));

    // Auto save response to SQLite
    DbService.saveAuditResponse(updated, currentUser.fullName);
    triggerDataRefresh();
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    const current = responseMap[itemId] || {
      auditId: currentAudit?.id,
      checklistItemId: itemId,
      responseValue: 'Conforming',
      evaluatedBy: currentUser.fullName,
    };
    const updated = { ...current, auditorNotes: notes };
    setResponseMap((prev) => ({ ...prev, [itemId]: updated }));
  };

  const handleUpdateEvidence = (itemId: string, evidence: string) => {
    const current = responseMap[itemId] || {
      auditId: currentAudit?.id,
      checklistItemId: itemId,
      responseValue: 'Conforming',
      evaluatedBy: currentUser.fullName,
    };
    const updated = { ...current, objectiveEvidence: evidence };
    setResponseMap((prev) => ({ ...prev, [itemId]: updated }));
  };

  const handleSaveResponse = (itemId: string) => {
    const current = responseMap[itemId];
    if (!current) return;
    DbService.saveAuditResponse(current, currentUser.fullName);
    triggerDataRefresh();
  };

  // Open modal to create finding directly from checklist item
  const handleOpenFindingModal = (item: ChecklistItem) => {
    const resp = responseMap[item.id];
    setActiveItemForFinding(item);
    setNewFindingForm({
      auditId: currentAudit?.id,
      checklistItemId: item.id,
      standardCode: item.standardCode,
      clauseNumber: item.clauseNumber,
      requirementText: item.requirement,
      department: item.department || currentAudit?.department,
      process: item.process || currentAudit?.process,
      riskLevel: item.riskLevel,
      category: 'Major Nonconformity',
      description: resp?.auditorNotes || `Nonconformance observed against clause ${item.clauseNumber}: ${item.question}`,
      objectiveEvidence: resp?.objectiveEvidence || 'Observed in field during audit walkdown.',
      responsiblePerson: 'Unit Shift Superintendent',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'Open',
    });
    setShowFindingModal(true);
  };

  const handleSaveFinding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFindingForm.description) return;
    const created = DbService.saveFinding(newFindingForm, currentUser.fullName);
    setShowFindingModal(false);
    triggerDataRefresh();
    alert(`Finding ${created.findingNumber} logged successfully with linked checklist clause ${created.clauseNumber}!`);
  };

  // Photo / Evidence Attachment Simulation
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoUploadItemId || !currentAudit) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const currentPhotos = attachedPhotos[activePhotoUploadItemId] || [];
      setAttachedPhotos({
        ...attachedPhotos,
        [activePhotoUploadItemId]: [...currentPhotos, base64],
      });

      // Save as document record
      DbService.saveDocument(
        {
          name: `${file.name}`,
          fileType: 'image',
          fileSize: file.size,
          fileDataBase64: base64,
          mimeType: file.type || 'image/jpeg',
          revision: 'Field Photo',
          owner: currentUser.fullName,
          confidentiality: 'Internal',
          relatedAuditId: currentAudit.id,
          relatedChecklistItemId: activePhotoUploadItemId,
          description: `Field photo attached during audit execution by ${currentUser.fullName}`,
        },
        currentUser.fullName
      );
      triggerDataRefresh();
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Validation before completing audit
  const handleCompleteAudit = () => {
    if (!currentAudit || !activeChecklist?.items) return;
    const totalItems = activeChecklist.items.length;
    const answeredCount = activeChecklist.items.filter((item) => responseMap[item.id]?.responseValue).length;

    if (answeredCount < totalItems) {
      alert(`Validation Error: All ${totalItems} checklist questions must be answered before completing the audit. Currently ${answeredCount}/${totalItems} evaluated.`);
      return;
    }

    if (window.confirm('All checklist responses recorded. Mark audit as COMPLETED?')) {
      DbService.saveAudit(
        {
          ...currentAudit,
          status: 'Completed',
          actualEndDate: new Date().toISOString().split('T')[0],
        },
        currentUser.fullName
      );
      triggerDataRefresh();
      alert(`Audit ${currentAudit.auditNumber} successfully marked as Completed!`);
    }
  };

  if (!currentAudit) {
    return (
      <div className="p-8 text-center text-slate-400">
        No active audit found. Please select or create an audit.
      </div>
    );
  }

  const items = activeChecklist?.items || [];
  const evaluatedCount = items.filter((i) => responseMap[i.id]?.responseValue).length;
  const progressPercent = items.length > 0 ? Math.round((evaluatedCount / items.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Hidden file input for photo attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoSelect}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Field Execution Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <PlaySquare className="w-5 h-5 text-amber-400" />
              Field Audit Execution Console
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60 font-semibold">
              FIELD ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Optimized for intrinsically safe field tablets & rugged inspection laptops.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            onClick={handleCompleteAudit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Complete Audit</span>
          </button>
        </div>
      </div>

      {/* Progress & Facility Context Strip */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-bold text-amber-400">{currentAudit.auditNumber}</span>
            <span className="text-white font-semibold">{currentAudit.title}</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-3">
            <span>Area: <strong className="text-slate-200">{currentAudit.area}</strong></span>
            <span>·</span>
            <span>Process: <strong className="text-slate-200">{currentAudit.process}</strong></span>
            <span>·</span>
            <span>Checklist: <strong className="text-slate-200">{activeChecklist?.title || 'PSM Field Checklist'}</strong></span>
          </div>
        </div>

        <div className="min-w-56">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400">Execution Progress</span>
            <span className="font-mono text-white font-bold">{evaluatedCount} / {items.length} ({progressPercent}%)</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items Execution Stream */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-12 text-center text-xs text-slate-400 rounded">
            No checklist items configured for this audit. Go to the Checklists module to assign questions.
          </div>
        ) : (
          items.map((item, idx) => {
            const currentResp = responseMap[item.id] || {};
            const val = currentResp.responseValue;
            const photos = attachedPhotos[item.id] || [];

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border rounded p-4 text-xs transition-colors ${
                  val === 'Nonconforming'
                    ? 'border-red-900/80 bg-red-950/10'
                    : val === 'Conforming'
                    ? 'border-emerald-900/60'
                    : val
                    ? 'border-amber-900/60'
                    : 'border-slate-800'
                }`}
              >
                {/* Item Clause & Title */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-amber-400">
                        Clause {item.clauseNumber}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        ({item.standardCode})
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                          item.riskLevel === 'Critical'
                            ? 'bg-red-950 text-red-400 border-red-800/60'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {item.riskLevel}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">{item.requirement}</div>
                    <p className="text-slate-300 text-xs mt-1 leading-relaxed">{item.question}</p>
                  </div>

                  {/* Field Response Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetResponseValue(item.id, 'Conforming')}
                      className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        val === 'Conforming'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Conforming</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetResponseValue(item.id, 'Nonconforming')}
                      className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        val === 'Nonconforming'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-red-300 hover:bg-slate-800'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Nonconforming</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetResponseValue(item.id, 'Observation')}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                        val === 'Observation'
                          ? 'bg-blue-500 text-slate-950 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-blue-300 hover:bg-slate-800'
                      }`}
                    >
                      Obs
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetResponseValue(item.id, 'Opportunity for Improvement')}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                        val === 'Opportunity for Improvement'
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                      }`}
                    >
                      OFI
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetResponseValue(item.id, 'Not Applicable')}
                      className={`px-2 py-1.5 rounded text-xs transition-colors ${
                        val === 'Not Applicable'
                          ? 'bg-slate-600 text-white font-semibold'
                          : 'bg-slate-950 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      N/A
                    </button>
                  </div>
                </div>

                {/* Evidence Guidance Banner */}
                {item.evidenceRequired && (
                  <div className="bg-slate-950/70 p-2 rounded text-[11px] text-slate-400 font-mono mb-3 border border-slate-800/80">
                    <strong className="text-slate-300 font-semibold">Evidence Guidance:</strong>{' '}
                    {item.evidenceRequired}
                  </div>
                )}

                {/* Field Notes & Objective Evidence Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      Auditor Field Notes & Interview Observations:
                    </label>
                    <textarea
                      rows={2}
                      value={currentResp.auditorNotes || ''}
                      onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                      onBlur={() => handleSaveResponse(item.id)}
                      placeholder="Record interview notes, equipment tag numbers, operator explanations..."
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      Objective Evidence Verified (Serial, Tag, Document #):
                    </label>
                    <textarea
                      rows={2}
                      value={currentResp.objectiveEvidence || ''}
                      onChange={(e) => handleUpdateEvidence(item.id, e.target.value)}
                      onBlur={() => handleSaveResponse(item.id)}
                      placeholder="e.g. Verified PSV tag #4102, calibration cert #882, SAP order #49021..."
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Attached Field Photos Gallery */}
                {photos.length > 0 && (
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto py-1">
                    {photos.map((src, pIdx) => (
                      <img
                        key={pIdx}
                        src={src}
                        alt="Field Evidence"
                        className="w-16 h-16 object-cover rounded border border-slate-700 shrink-0"
                      />
                    ))}
                  </div>
                )}

                {/* Bottom Bar: Photo Upload, Save, and Log Finding Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePhotoUploadItemId(item.id);
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Take / Attach Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveResponse(item.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                      title="Save response changes"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save Notes</span>
                    </button>
                  </div>

                  {/* Create Finding Button (Highlighted when Nonconforming) */}
                  <button
                    type="button"
                    onClick={() => handleOpenFindingModal(item)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      val === 'Nonconforming'
                        ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Log Finding from Item</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Create Finding directly from Checklist Item */}
      {showFindingModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Log Field Finding / Nonconformity
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  Linked to Clause {newFindingForm.clauseNumber} ({newFindingForm.standardCode})
                </span>
              </div>
              <button
                onClick={() => setShowFindingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFinding} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Finding Category</label>
                  <select
                    value={newFindingForm.category}
                    onChange={(e) => setNewFindingForm({ ...newFindingForm, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="Major Nonconformity">Major Nonconformity</option>
                    <option value="Minor Nonconformity">Minor Nonconformity</option>
                    <option value="Observation">Observation</option>
                    <option value="Opportunity for Improvement">Opportunity for Improvement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Risk Level</label>
                  <select
                    value={newFindingForm.riskLevel}
                    onChange={(e) => setNewFindingForm({ ...newFindingForm, riskLevel: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Finding Description *</label>
                <textarea
                  rows={3}
                  required
                  value={newFindingForm.description}
                  onChange={(e) => setNewFindingForm({ ...newFindingForm, description: e.target.value })}
                  placeholder="Precise statement of nonconformance and observed failure..."
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Objective Evidence *</label>
                <textarea
                  rows={2}
                  required
                  value={newFindingForm.objectiveEvidence}
                  onChange={(e) => setNewFindingForm({ ...newFindingForm, objectiveEvidence: e.target.value })}
                  placeholder="Exact tag numbers, physical documents, photos, or data logs..."
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Responsible Person</label>
                  <input
                    type="text"
                    required
                    value={newFindingForm.responsiblePerson}
                    onChange={(e) => setNewFindingForm({ ...newFindingForm, responsiblePerson: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Resolution Due Date</label>
                  <input
                    type="date"
                    required
                    value={newFindingForm.dueDate}
                    onChange={(e) => setNewFindingForm({ ...newFindingForm, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFindingModal(false)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded shadow-sm"
                >
                  Confirm & Create Finding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
