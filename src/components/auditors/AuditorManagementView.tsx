import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { Auditor } from '../../types/index.ts';
import {
  Users,
  Plus,
  Search,
  Award,
  Clock,
  Star,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Edit3,
  Trash2,
  Check,
  Info,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export const AuditorManagementView: React.FC = () => {
  const { dataVersion, triggerDataRefresh, currentUser, canPerform } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAuditorId, setEditingAuditorId] = useState<string | null>(null);
  const [quickRenameId, setQuickRenameId] = useState<string | null>(null);
  const [quickRenameValue, setQuickRenameValue] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const auditors = useMemo(() => {
    const list = DbService.getAuditors();
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(term) ||
        a.department.toLowerCase().includes(term) ||
        a.qualification.toLowerCase().includes(term) ||
        a.position.toLowerCase().includes(term)
    );
  }, [dataVersion, search]);

  // Form State
  const defaultFormState: Partial<Auditor> = {
    name: '',
    employeeId: '',
    email: '',
    department: 'Quality & Compliance',
    position: 'Internal Auditor',
    isLead: false,
    qualification: 'Certified Lead Auditor',
    training: 'ISO 9001:2015 & ISO 14001:2015 Auditing Course',
    experienceYears: 5,
    competencyLevel: 'Competent',
    standardsQualified: ['ISO 9001', 'ISO 14001'],
    auditHours: 80,
    numberOfAudits: 8,
    performanceRating: 4.8,
    notes: '',
  };

  const [formAuditor, setFormAuditor] = useState<Partial<Auditor>>(defaultFormState);

  const availableStandards = [
    'ISO 9001',
    'ISO 14001',
    'ISO 45001',
    'ISO 50001',
    'ISO 55001',
    'Company Procedures',
    'Legal/Regulatory Requirements',
  ];

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingAuditorId(null);
    setFormAuditor({
      ...defaultFormState,
      name: `Auditor ${String.fromCharCode(65 + auditors.length)}`,
      employeeId: `EMP-${700 + auditors.length + 1}`,
      email: `auditor.${String.fromCharCode(97 + auditors.length)}@isosystem.org`,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (auditor: Auditor) => {
    setIsEditing(true);
    setEditingAuditorId(auditor.id);
    setFormAuditor({ ...auditor });
    setShowModal(true);
  };

  const handleSaveAuditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAuditor.name?.trim()) return;

    DbService.saveAuditor(
      {
        ...formAuditor,
        id: isEditing && editingAuditorId ? editingAuditorId : undefined,
      },
      currentUser.fullName
    );

    setShowModal(false);
    triggerDataRefresh();

    setFeedbackMessage(
      isEditing
        ? `Auditor "${formAuditor.name}" updated successfully! Changes are live across all schedules and reports.`
        : `Auditor "${formAuditor.name}" added to the database!`
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleQuickRenameSave = (auditor: Auditor) => {
    if (!quickRenameValue.trim()) {
      setQuickRenameId(null);
      return;
    }
    DbService.updateAuditorName(auditor.id, quickRenameValue.trim(), currentUser.fullName);
    setQuickRenameId(null);
    triggerDataRefresh();
    setFeedbackMessage(`Auditor renamed to "${quickRenameValue.trim()}"!`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleDeleteAuditor = (auditor: Auditor) => {
    if (
      window.confirm(
        `Are you sure you want to remove ${auditor.name} from the active auditor registry?`
      )
    ) {
      DbService.deleteAuditor(auditor.id, currentUser.fullName);
      triggerDataRefresh();
      setFeedbackMessage(`Auditor "${auditor.name}" has been removed.`);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleResetToLetterPlaceholders = () => {
    if (
      window.confirm(
        'Reset all auditor names to standard designations (Auditor A, Auditor B, Auditor C...)? You can re-edit them to custom names anytime.'
      )
    ) {
      auditors.forEach((aud, index) => {
        const letter = String.fromCharCode(65 + index);
        DbService.updateAuditorName(aud.id, `Auditor ${letter}`, currentUser.fullName);
      });
      triggerDataRefresh();
      setFeedbackMessage(
        'Auditors designated as Auditor A, Auditor B, Auditor C... Click any name to edit anytime!'
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Auditor Database & Competency Governance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain auditor profiles, qualifications, and names. You can edit any auditor name at any time (e.g. rename Auditor A, B, C to real staff names).
          </p>
        </div>

        {canPerform('manage_audits') && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToLetterPlaceholders}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
              title="Reset names to standard designations (Auditor A, B, C...)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Use Auditor A, B, C Names</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Auditor</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Feedback Banner */}
      {feedbackMessage && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Helpful Info Tip */}
      <div className="bg-slate-900/80 border border-slate-800 rounded p-3.5 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-white">Auditor Name Customization:</span>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Auditors are currently seeded with placeholders (<strong className="text-amber-400">Auditor A, B, C, D, E</strong>). Click the <strong className="text-white">Edit Profile</strong> button or click directly on any auditor's name below to rename them to your actual staff or auditor names. All calendar events, audit plans, checklists, and reports will instantly reflect the updated name.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search auditor by name, department, or qualification..."
            className="w-full bg-slate-900 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Showing {auditors.length} active auditors
        </span>
      </div>

      {/* Auditor Competency Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Auditor Qualification & Competency Matrix
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">ISO 19011 Compliance</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Auditor Name</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Level</th>
                {availableStandards.map((std) => (
                  <th key={std} className="py-2.5 px-2 text-center whitespace-nowrap">
                    {std.replace('Requirements', '').trim()}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right">Audit Hours</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {auditors.map((aud) => (
                <tr key={aud.id} className="hover:bg-slate-850/50">
                  <td className="py-2.5 px-3 font-sans font-medium text-white whitespace-nowrap">
                    {quickRenameId === aud.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={quickRenameValue}
                          onChange={(e) => setQuickRenameValue(e.target.value)}
                          className="bg-slate-950 border border-amber-400 px-2 py-0.5 rounded text-xs text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleQuickRenameSave(aud);
                            if (e.key === 'Escape') setQuickRenameId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickRenameSave(aud)}
                          className="p-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs"
                          title="Save Name"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{aud.name}</span>
                        {canPerform('manage_audits') && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuickRenameId(aud.id);
                              setQuickRenameValue(aud.name);
                            }}
                            className="text-slate-500 hover:text-amber-400 transition-colors p-0.5"
                            title="Quick rename auditor"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] whitespace-nowrap">
                    {aud.isLead ? (
                      <span className="text-amber-400 font-semibold">Lead Auditor</span>
                    ) : (
                      <span className="text-slate-400">Auditor</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-300 whitespace-nowrap">
                    {aud.competencyLevel}
                  </td>
                  {availableStandards.map((std) => {
                    const isQualified = aud.standardsQualified.some((sq) => sq.includes(std) || std.includes(sq));
                    return (
                      <td key={std} className="py-2.5 px-2 text-center">
                        {isQualified ? (
                          <span className="inline-block w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] leading-4 text-center">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 text-right text-slate-200 tabular-nums">
                    {aud.auditHours} hrs
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    {canPerform('manage_audits') && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(aud)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-300 rounded text-[11px] font-sans transition-colors flex items-center gap-1"
                          title="Edit full auditor profile"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAuditor(aud)}
                          className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Delete auditor"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auditor Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {auditors.map((aud) => (
          <div
            key={aud.id}
            className="bg-slate-900 border border-slate-800 rounded p-4 text-xs space-y-3 hover:border-slate-700 transition-colors relative group"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {quickRenameId === aud.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={quickRenameValue}
                        onChange={(e) => setQuickRenameValue(e.target.value)}
                        className="bg-slate-950 border border-amber-400 px-2 py-0.5 rounded text-xs text-white focus:outline-none w-36"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuickRenameSave(aud);
                          if (e.key === 'Escape') setQuickRenameId(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickRenameSave(aud)}
                        className="p-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-semibold"
                        title="Save Name"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-white text-sm">{aud.name}</span>
                      {canPerform('manage_audits') && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickRenameId(aud.id);
                            setQuickRenameValue(aud.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-400 transition-opacity p-0.5"
                          title="Quick rename auditor name"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">{aud.position} · {aud.department}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {aud.employeeId} • {aud.email}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {aud.isLead && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-semibold">
                    LEAD AUDITOR
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">
                  {aud.competencyLevel}
                </span>
              </div>
            </div>

            <div className="space-y-1 bg-slate-950 p-2.5 rounded border border-slate-800/80">
              <div className="text-slate-300">
                <strong className="text-slate-400">Qualification:</strong> {aud.qualification}
              </div>
              <div className="text-slate-400 text-[11px]">
                <strong className="text-slate-400">Training:</strong> {aud.training}
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              {aud.standardsQualified.map((std) => (
                <span
                  key={std}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]"
                >
                  {std}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 font-mono text-[11px] text-slate-300">
              <div>
                <span className="text-[10px] text-slate-500 block">EXPERIENCE</span>
                <span className="font-semibold text-white">{aud.experienceYears} yrs</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">AUDITS</span>
                <span className="font-semibold text-white">{aud.numberOfAudits}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">RATING</span>
                <span className="font-semibold text-amber-400">★ {aud.performanceRating}</span>
              </div>
            </div>

            {/* Bottom Card Actions */}
            {canPerform('manage_audits') && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(aud)}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile & Name</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAuditor(aud)}
                  className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal: Add or Edit Auditor */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>{isEditing ? 'Edit Auditor Profile & Name' : 'Add Auditor to Registry'}</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {isEditing
                ? 'Update auditor name, contact, qualifications, and role. Changes will sync immediately across all modules.'
                : 'Register a new auditor in the ISO System (IMS) database.'}
            </p>

            <form onSubmit={handleSaveAuditor} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Auditor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formAuditor.name}
                    onChange={(e) => setFormAuditor({ ...formAuditor, name: e.target.value })}
                    placeholder="e.g. Auditor A or John Smith"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-medium focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Employee / Auditor ID *</label>
                  <input
                    type="text"
                    required
                    value={formAuditor.employeeId}
                    onChange={(e) => setFormAuditor({ ...formAuditor, employeeId: e.target.value })}
                    placeholder="e.g. EMP-701"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formAuditor.email}
                    onChange={(e) => setFormAuditor({ ...formAuditor, email: e.target.value })}
                    placeholder="e.g. auditor@isosystem.org"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={formAuditor.department}
                    onChange={(e) => setFormAuditor({ ...formAuditor, department: e.target.value })}
                    placeholder="e.g. Quality & Compliance"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Position / Job Title</label>
                  <input
                    type="text"
                    value={formAuditor.position}
                    onChange={(e) => setFormAuditor({ ...formAuditor, position: e.target.value })}
                    placeholder="e.g. Lead Quality Auditor"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Competency Level</label>
                  <select
                    value={formAuditor.competencyLevel}
                    onChange={(e) => setFormAuditor({ ...formAuditor, competencyLevel: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Trainee">Trainee</option>
                    <option value="Competent">Competent</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="chk-lead-modal"
                  checked={formAuditor.isLead}
                  onChange={(e) => setFormAuditor({ ...formAuditor, isLead: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500"
                />
                <label htmlFor="chk-lead-modal" className="text-slate-200 font-semibold cursor-pointer">
                  Certified Lead Auditor Status
                </label>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Qualification Certification</label>
                <input
                  type="text"
                  value={formAuditor.qualification}
                  onChange={(e) => setFormAuditor({ ...formAuditor, qualification: e.target.value })}
                  placeholder="e.g. IRCA Certified Lead Auditor, ASQ CQA"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Training Courses & Certifications</label>
                <input
                  type="text"
                  value={formAuditor.training}
                  onChange={(e) => setFormAuditor({ ...formAuditor, training: e.target.value })}
                  placeholder="e.g. ISO 9001:2015 & ISO 14001:2015 Lead Auditor"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Standards Qualified Selector */}
              <div>
                <label className="block text-slate-300 mb-1">Standards Qualified to Audit</label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-2.5 rounded border border-slate-800">
                  {availableStandards.map((std) => {
                    const isChecked = formAuditor.standardsQualified?.includes(std);
                    return (
                      <label key={std} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = formAuditor.standardsQualified || [];
                            if (e.target.checked) {
                              setFormAuditor({ ...formAuditor, standardsQualified: [...current, std] });
                            } else {
                              setFormAuditor({ ...formAuditor, standardsQualified: current.filter((s) => s !== std) });
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-amber-500"
                        />
                        <span className="text-[11px] font-mono">{std}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Experience (Yrs)</label>
                  <input
                    type="number"
                    value={formAuditor.experienceYears}
                    onChange={(e) => setFormAuditor({ ...formAuditor, experienceYears: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Audit Hours</label>
                  <input
                    type="number"
                    value={formAuditor.auditHours}
                    onChange={(e) => setFormAuditor({ ...formAuditor, auditHours: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Audits Completed</label>
                  <input
                    type="number"
                    value={formAuditor.numberOfAudits}
                    onChange={(e) => setFormAuditor({ ...formAuditor, numberOfAudits: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded shadow-md transition-colors"
                >
                  {isEditing ? 'Save Changes' : 'Create Auditor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
