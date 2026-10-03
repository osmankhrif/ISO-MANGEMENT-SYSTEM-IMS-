import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { SystemSettings, UserRole } from '../../types/index.ts';
import {
  Settings,
  Building,
  Shield,
  Save,
  Upload,
  CheckCircle,
  Users,
  Grid,
  UserCheck,
  ShieldAlert,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    refreshSettings,
    currentUser,
    setCurrentUser,
    userRole,
    setUserRole,
    usersList,
    canPerform,
    isModuleAccessible,
    triggerDataRefresh,
  } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<SystemSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ message: string; success: boolean } | null>(null);

  const allModulesList: { id: any; name: string }[] = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'auditProgram', name: 'Audit Program' },
    { id: 'planning', name: 'Audit Planning' },
    { id: 'standards', name: 'Audit Standards' },
    { id: 'checklists', name: 'Checklists' },
    { id: 'execution', name: 'Field Execution' },
    { id: 'findings', name: 'Findings & NC' },
    { id: 'correctiveActions', name: 'Corrective Actions' },
    { id: 'followUp', name: 'Follow-Up' },
    { id: 'auditors', name: 'Auditor Management' },
    { id: 'documents', name: 'Documents & Evidence' },
    { id: 'reports', name: 'Audit Reports' },
    { id: 'analytics', name: 'Analytics' },
    { id: 'settings', name: 'System Settings' },
    { id: 'backup', name: 'Backup & Restore' },
    { id: 'packaging', name: 'Desktop Packaging' },
  ];

  const enabledModulesCount = allModulesList.filter((m) => isModuleAccessible(m.id, userRole)).length;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    DbService.updateSetting('company_name', form.companyName, currentUser.fullName);
    DbService.updateSetting('facility_name', form.facilityName, currentUser.fullName);
    DbService.updateSetting('address', form.address, currentUser.fullName);
    DbService.updateSetting('auto_backup_interval_hours', String(form.autoBackupIntervalHours), currentUser.fullName);
    DbService.updateSetting('custom_report_disclaimer', form.customReportDisclaimer, currentUser.fullName);
    DbService.updateSetting('risk_matrix_thresholds', JSON.stringify(form.riskMatrixThresholds), currentUser.fullName);
    if (form.companyLogoBase64) {
      DbService.updateSetting('company_logo_base64', form.companyLogoBase64, currentUser.fullName);
    }

    refreshSettings();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setForm((prev) => ({ ...prev, companyLogoBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // 5x5 Risk Matrix cell color helper
  const getCellRisk = (score: number) => {
    const { low, medium, high } = form.riskMatrixThresholds;
    if (score > high) return { label: 'Critical', bg: 'bg-red-500/20 text-red-300 border-red-500/40' };
    if (score > medium) return { label: 'High', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    if (score > low) return { label: 'Medium', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
    return { label: 'Low', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
  };

  // Role details mapping for RBAC simulation
  const roleProfiles: {
    role: UserRole;
    title: string;
    description: string;
    badge: string;
    badgeColor: string;
    primaryScope: string;
  }[] = [
    {
      role: 'Administrator',
      title: 'Full Administrative Authority',
      description: 'Unrestricted access to all audit programs, database backup/restore, user management, and system-wide configurations.',
      badge: 'Full Access',
      badgeColor: 'bg-red-950 text-red-400 border-red-800/60',
      primaryScope: 'Database & System Governance',
    },
    {
      role: 'Audit Manager',
      title: 'Program Governance & Oversight',
      description: 'Manages annual audit programs, schedules unit audits, assigns lead auditors, and reviews complex-wide KPI trends.',
      badge: 'Managerial',
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-800/60',
      primaryScope: 'Audit Programs & Schedules',
    },
    {
      role: 'Lead Auditor',
      title: 'Field Lead & Verification Gatekeeper',
      description: 'Formulates audit plans, conducts field inspections, raises findings, and holds sole authority to verify CAPA effectiveness for finding closure.',
      badge: 'Lead Gate',
      badgeColor: 'bg-sky-950 text-sky-400 border-sky-800/60',
      primaryScope: 'Audit Plans, Execution & CAPA Verification',
    },
    {
      role: 'Auditor',
      title: 'Field Inspection Auditor',
      description: 'Executes assigned checklists in refinery units, records objective evidence, attaches field photos, and drafts nonconformities.',
      badge: 'Field Ops',
      badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-800/60',
      primaryScope: 'Checklist Execution & Observations',
    },
    {
      role: 'Department Manager',
      title: 'Audited Unit Representative',
      description: 'Reviews nonconformities for audited refinery units, formulates 5-Why / Fishbone root cause analyses, and submits corrective action plans.',
      badge: 'CAPA Owner',
      badgeColor: 'bg-purple-950 text-purple-400 border-purple-800/60',
      primaryScope: 'Root Cause & Corrective Actions',
    },
    {
      role: 'Viewer',
      title: 'Read-Only Compliance Inspector',
      description: 'Read-only access for external regulatory bodies, corporate insurance inspectors, and certification auditors. Modifications disabled.',
      badge: 'Read-Only',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
      primaryScope: 'Compliance Oversight & Reporting',
    },
  ];

  // RBAC Matrix Capabilities
  const capabilities = [
    {
      name: 'Schedule & Edit Audit Programs',
      admin: true,
      manager: true,
      lead: false,
      auditor: false,
      deptMgr: false,
      viewer: false,
    },
    {
      name: 'Formulate & Save Audit Plans',
      admin: true,
      manager: true,
      lead: true,
      auditor: false,
      deptMgr: false,
      viewer: false,
    },
    {
      name: 'Configure Standards & Clauses',
      admin: true,
      manager: true,
      lead: true,
      auditor: false,
      deptMgr: false,
      viewer: false,
    },
    {
      name: 'Build & Duplicate Checklists',
      admin: true,
      manager: true,
      lead: true,
      auditor: true,
      deptMgr: false,
      viewer: false,
    },
    {
      name: 'Execute Field Checklists & Photos',
      admin: true,
      manager: true,
      lead: true,
      auditor: true,
      deptMgr: false,
      viewer: false,
    },
    {
      name: 'Log Findings & Nonconformities',
      admin: true,
      manager: true,
      lead: true,
      auditor: true,
      deptMgr: false,
      viewer: false,
    },
    {
      name: 'Submit Root Cause & Action Plans',
      admin: true,
      manager: true,
      lead: true,
      auditor: false,
      deptMgr: true,
      viewer: false,
    },
    {
      name: 'Verify CAPA & Close Findings (Gatekeeper)',
      admin: true,
      manager: false,
      lead: true,
      auditor: false,
      deptMgr: false,
      viewer: false,
    },
    {
      name: 'Backup / Restore Database & Purge Demo',
      admin: true,
      manager: false,
      lead: false,
      auditor: false,
      deptMgr: false,
      viewer: false,
    },
  ];

  const handleTestPermission = (action: 'admin' | 'manage_audits' | 'execute_audit' | 'manage_capa' | 'edit_standards', actionLabel: string) => {
    const allowed = canPerform(action);
    setTestResult({
      message: allowed
        ? `Permission GRANTED: "${currentUser.fullName}" (${currentUser.role}) is authorized to ${actionLabel}.`
        : `Permission DENIED: "${currentUser.fullName}" (${currentUser.role}) lacks permissions to ${actionLabel}.`,
      success: allowed,
    });
    setTimeout(() => setTestResult(null), 4000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            System Governance & Facility Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure company identity, report branding, 5x5 risk matrix scoring, and access control.
          </p>
        </div>

        {isSaved && (
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            Settings saved successfully!
          </span>
        )}
      </div>

      {/* SECTION: User Role Switcher & RBAC Simulation Console */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Role-Based Access Control (RBAC) Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate different permission levels during testing to verify access control gates and reactive module visibility.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Active Persona:</span>
            <span className="text-amber-400 font-bold">{currentUser.fullName}</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/40">
              {userRole}
            </span>
          </div>
        </div>

        {/* Persistent User Role Selector Bar */}
        <div className="bg-slate-950 p-4 rounded border border-amber-500/30 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Persistent 'User Role' Selector (Dev & Testing)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-mono">
                  Stored in LocalStorage
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Updating this role reactively enables or hides navigation modules in the sidebar and unlocks/restricts action gates.
              </p>
            </div>

            {/* Persistent Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="user-role-selector" className="text-xs text-slate-300 font-medium">
                Active Role:
              </label>
              <select
                id="user-role-selector"
                value={userRole}
                onChange={(e) => {
                  setUserRole(e.target.value as UserRole);
                  triggerDataRefresh();
                }}
                className="bg-slate-900 border border-amber-500/50 text-amber-300 font-bold font-mono text-xs rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="Administrator">Admin (Administrator - Full Access - 16 Modules)</option>
                <option value="Lead Auditor">Lead Auditor (Field Lead & Verification - 14 Modules)</option>
                <option value="Auditor">Auditor (Field Inspector - 9 Modules)</option>
                <option value="Viewer">Viewer (Read-Only Compliance - 7 Modules)</option>
                <option value="Audit Manager">Audit Manager (Management - 15 Modules)</option>
                <option value="Department Manager">Department Manager (Audited Unit - 8 Modules)</option>
              </select>
            </div>
          </div>

          {/* Quick Role Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-mono mr-1">Simulate Level:</span>
            {[
              { role: 'Administrator' as UserRole, label: 'Admin (Administrator)', count: '16/16' },
              { role: 'Lead Auditor' as UserRole, label: 'Lead Auditor', count: '14/16' },
              { role: 'Auditor' as UserRole, label: 'Auditor', count: '9/16' },
              { role: 'Viewer' as UserRole, label: 'Viewer (Read-Only)', count: '7/16' },
              { role: 'Audit Manager' as UserRole, label: 'Audit Manager', count: '15/16' },
              { role: 'Department Manager' as UserRole, label: 'Department Manager', count: '8/16' },
            ].map(({ role: r, label, count }) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setUserRole(r);
                  triggerDataRefresh();
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors border flex items-center gap-1.5 ${
                  userRole === r
                    ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 shadow-sm'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-850 border-slate-800'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded ${userRole === r ? 'bg-slate-900 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Reactive Module Accessibility Breakdown */}
          <div className="pt-2 border-t border-slate-900 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">
                Sidebar Navigation Status for <strong className="text-amber-300 font-semibold">{userRole}</strong>:
              </span>
              <span className="text-emerald-400 font-bold">
                {enabledModulesCount} of {allModulesList.length} Modules Enabled
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {allModulesList.map((mod) => {
                const accessible = isModuleAccessible(mod.id, userRole);
                return (
                  <span
                    key={mod.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                      accessible
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 font-medium'
                        : 'bg-slate-950 text-slate-600 border-slate-900 line-through'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        accessible ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                    {mod.name}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Role Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roleProfiles.map((p) => {
            const matchedUser = usersList.find((u) => u.role === p.role) || {
              id: `usr-${p.role}`,
              fullName: `${p.role} User`,
              department: p.primaryScope,
              role: p.role,
              email: `${p.role.toLowerCase().replace(/\s+/g, '')}@petroapex.com`,
              username: p.role.toLowerCase().replace(/\s+/g, ''),
              active: true,
              createdAt: '2026-01-01',
            };

            const isCurrent = userRole === p.role;

            return (
              <button
                key={p.role}
                type="button"
                onClick={() => {
                  setUserRole(p.role);
                  triggerDataRefresh();
                }}
                className={`text-left p-3.5 rounded text-xs transition-all border relative flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-400 shadow-md ring-1 ring-amber-400/30'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-xs">{p.role}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>

                  <div className="text-[11px] text-amber-300/90 font-mono font-medium mb-1">
                    {matchedUser.fullName}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {p.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500 truncate max-w-[170px]">{p.primaryScope}</span>
                  {isCurrent ? (
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <UserCheck className="w-3.5 h-3.5" />
                      Active Role
                    </span>
                  ) : (
                    <span className="text-slate-400 hover:text-white">Switch to Role →</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Permission Probe / Action Verification Buttons */}
        <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
              Live RBAC Gate Probes (Simulate Immediate Actions)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Click to test authorization for active role</span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleTestPermission('admin', 'Access System Backup & Purge Data')}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Test Admin Gate
            </button>
            <button
              type="button"
              onClick={() => handleTestPermission('manage_audits', 'Schedule & Manage Audits')}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Test Audit Management Gate
            </button>
            <button
              type="button"
              onClick={() => handleTestPermission('edit_standards', 'Modify ISO Standards')}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Test Standards Configuration Gate
            </button>
            <button
              type="button"
              onClick={() => handleTestPermission('execute_audit', 'Execute Field Checklist')}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Test Field Execution Gate
            </button>
            <button
              type="button"
              onClick={() => handleTestPermission('manage_capa', 'Submit Root Cause & Action Plans')}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Test CAPA Workflow Gate
            </button>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded border text-xs font-mono flex items-center gap-2 animate-fadeIn ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-red-950/60 border-red-500/50 text-red-300'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Permissions Capability Matrix Table */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white uppercase tracking-wider font-mono">
              Live Permission Matrix by Role
            </span>
            <span className="text-slate-400 text-[11px] font-mono">
              Highlighted column = Active role ({currentUser.role})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded overflow-hidden">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">System Capability / Gate</th>
                  <th className={`py-2 px-2 text-center ${currentUser.role === 'Administrator' ? 'bg-amber-500/20 text-amber-300' : ''}`}>Admin</th>
                  <th className={`py-2 px-2 text-center ${currentUser.role === 'Audit Manager' ? 'bg-amber-500/20 text-amber-300' : ''}`}>Audit Mgr</th>
                  <th className={`py-2 px-2 text-center ${currentUser.role === 'Lead Auditor' ? 'bg-amber-500/20 text-amber-300' : ''}`}>Lead Aud</th>
                  <th className={`py-2 px-2 text-center ${currentUser.role === 'Auditor' ? 'bg-amber-500/20 text-amber-300' : ''}`}>Auditor</th>
                  <th className={`py-2 px-2 text-center ${currentUser.role === 'Department Manager' ? 'bg-amber-500/20 text-amber-300' : ''}`}>Dept Mgr</th>
                  <th className={`py-2 px-2 text-center ${currentUser.role === 'Viewer' ? 'bg-amber-500/20 text-amber-300' : ''}`}>Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {capabilities.map((cap) => (
                  <tr key={cap.name} className="hover:bg-slate-850/40">
                    <td className="py-2 px-3 text-slate-300 font-sans text-xs">{cap.name}</td>
                    <td className={`py-2 px-2 text-center ${currentUser.role === 'Administrator' ? 'bg-amber-500/10 font-bold' : ''}`}>
                      {cap.admin ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">✗</span>}
                    </td>
                    <td className={`py-2 px-2 text-center ${currentUser.role === 'Audit Manager' ? 'bg-amber-500/10 font-bold' : ''}`}>
                      {cap.manager ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">✗</span>}
                    </td>
                    <td className={`py-2 px-2 text-center ${currentUser.role === 'Lead Auditor' ? 'bg-amber-500/10 font-bold' : ''}`}>
                      {cap.lead ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">✗</span>}
                    </td>
                    <td className={`py-2 px-2 text-center ${currentUser.role === 'Auditor' ? 'bg-amber-500/10 font-bold' : ''}`}>
                      {cap.auditor ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">✗</span>}
                    </td>
                    <td className={`py-2 px-2 text-center ${currentUser.role === 'Department Manager' ? 'bg-amber-500/10 font-bold' : ''}`}>
                      {cap.deptMgr ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">✗</span>}
                    </td>
                    <td className={`py-2 px-2 text-center ${currentUser.role === 'Viewer' ? 'bg-amber-500/10 font-bold' : ''}`}>
                      {cap.viewer ? <span className="text-emerald-400">✓</span> : <span className="text-slate-600">✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        {/* Company Identity & Branding */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-400" />
            Company Identity & Official Branding
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Company / Corporation Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Facility / Complex Name</label>
              <input
                type="text"
                value={form.facilityName}
                onChange={(e) => setForm({ ...form, facilityName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">Facility Address / Site Location</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
              />
            </div>

            {/* Logo Upload */}
            <div className="md:col-span-2 flex items-center gap-4 pt-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload Corporate Logo</span>
              </button>

              {form.companyLogoBase64 ? (
                <div className="flex items-center gap-2">
                  <img
                    src={form.companyLogoBase64}
                    alt="Logo preview"
                    className="h-9 max-w-32 object-contain bg-slate-950 p-1 rounded border border-slate-800"
                  />
                  <span className="text-[11px] text-emerald-400 font-mono">Custom logo active</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 font-mono">
                  Using default industrial SVG monogram in PDF headers
                </span>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">
                Formal Audit Report Legal Disclaimer Text
              </label>
              <textarea
                rows={2}
                value={form.customReportDisclaimer}
                onChange={(e) => setForm({ ...form, customReportDisclaimer: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-white"
              />
            </div>
          </div>
        </div>

        {/* 5x5 Risk Matrix Configuration */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded space-y-4">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Grid className="w-4 h-4 text-sky-400" />
            Configurable 5x5 Risk Matrix & Priority Thresholds
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-slate-400 text-xs">
                Configure the score thresholds (Likelihood × Consequence = 1 to 25) used to prioritize audits and categorize nonconformities.
              </p>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px]">Low Max (1 - X)</label>
                  <input
                    type="number"
                    value={form.riskMatrixThresholds.low}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        riskMatrixThresholds: {
                          ...form.riskMatrixThresholds,
                          low: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-[11px]">Medium Max (Low - X)</label>
                  <input
                    type="number"
                    value={form.riskMatrixThresholds.medium}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        riskMatrixThresholds: {
                          ...form.riskMatrixThresholds,
                          medium: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-[11px]">High Max (Medium - X)</label>
                  <input
                    type="number"
                    value={form.riskMatrixThresholds.high}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        riskMatrixThresholds: {
                          ...form.riskMatrixThresholds,
                          high: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-[11px]">Critical (High - 25)</label>
                  <input
                    type="number"
                    disabled
                    value={25}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Interactive 5x5 Matrix Preview */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[10px]">
              <span className="block text-center text-slate-400 mb-1 text-[9px] uppercase font-bold tracking-widest">
                5x5 Risk Grid Preview (Likelihood ↑ × Consequence →)
              </span>
              <div className="grid grid-cols-5 gap-1 text-center">
                {[5, 4, 3, 2, 1].map((lik) => (
                  <React.Fragment key={lik}>
                    {[1, 2, 3, 4, 5].map((con) => {
                      const score = lik * con;
                      const { label, bg } = getCellRisk(score);
                      return (
                        <div
                          key={`${lik}-${con}`}
                          className={`p-1 rounded border flex flex-col items-center justify-center ${bg}`}
                          title={`L${lik} x C${con} = ${score} (${label})`}
                        >
                          <span className="font-bold">{score}</span>
                          <span className="text-[8px] uppercase">{label.slice(0, 3)}</span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded shadow transition-colors text-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save System Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

