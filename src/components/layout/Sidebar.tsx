import React from 'react';
import { useApp, NavigationModule } from '../../context/AppContext.tsx';
import {
  LayoutDashboard,
  CalendarDays,
  FileSpreadsheet,
  BookOpen,
  CheckSquare,
  PlaySquare,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Users,
  FolderOpen,
  FileText,
  BarChart3,
  Settings,
  Database,
  Box,
} from 'lucide-react';

interface NavItem {
  id: NavigationModule;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
  group?: string;
}

export const Sidebar: React.FC = () => {
  const { activeModule, setActiveModule, userRole, isModuleAccessible } = useApp();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'CORE' },
    { id: 'auditProgram', label: 'Audit Program', icon: CalendarDays, group: 'CORE' },
    { id: 'planning', label: 'Audit Planning', icon: FileSpreadsheet, group: 'CORE' },
    { id: 'standards', label: 'Audit Standards', icon: BookOpen, group: 'PROGRAM' },
    { id: 'checklists', label: 'Audit Checklists', icon: CheckSquare, group: 'PROGRAM' },
    { id: 'execution', label: 'Audit Execution', icon: PlaySquare, group: 'FIELD' },
    { id: 'findings', label: 'Findings & NC', icon: AlertTriangle, group: 'FIELD' },
    { id: 'correctiveActions', label: 'Two-Tier CAPA & Impact', icon: RotateCcw, group: 'CAPA' },
    { id: 'followUp', label: 'Follow-Up & Verification', icon: CheckCircle, group: 'CAPA' },
    { id: 'auditors', label: 'Auditor Management', icon: Users, group: 'GOVERNANCE' },
    { id: 'documents', label: 'Documents & Evidence', icon: FolderOpen, group: 'GOVERNANCE' },
    { id: 'reports', label: 'Audit Reports', icon: FileText, group: 'OUTPUT' },
    { id: 'analytics', label: 'KPI & Analytics', icon: BarChart3, group: 'OUTPUT' },
    { id: 'settings', label: 'System Settings', icon: Settings, group: 'SYSTEM' },
    { id: 'backup', label: 'Backup & Restore', icon: Database, group: 'SYSTEM' },
    { id: 'packaging', label: 'Desktop Packaging', icon: Box, group: 'SYSTEM' },
  ];

  // Reactively filter navigation items based on the active userRole permissions
  const accessibleItems = navItems.filter((item) => isModuleAccessible(item.id, userRole));

  let currentGroup = '';

  return (
    <aside className="w-64 bg-slate-920 border-r border-slate-800 flex flex-col shrink-0 select-none overflow-y-auto no-print">
      {/* Facility & Role Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 font-semibold uppercase tracking-wider">
          <span>ISO Management System (IMS)</span>
          <span className="text-[10px] text-slate-400 font-normal">
            {accessibleItems.length}/16
          </span>
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
          <span className="truncate">Refinery Operations</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-mono">
            {userRole}
          </span>
        </div>
      </div>

      <nav className="p-2 space-y-0.5 flex-1">
        {accessibleItems.map((item) => {
          const showGroup = item.group && item.group !== currentGroup;
          if (showGroup) {
            currentGroup = item.group!;
          }

          const isActive = activeModule === item.id;
          const Icon = item.icon;

          return (
            <React.Fragment key={item.id}>
              {showGroup && (
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1 font-mono">
                  {item.group}
                </div>
              )}
              <button
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors group ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 font-semibold border-l-2 border-amber-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Database Status Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Storage:</span>
          <span className="text-emerald-400 font-semibold">SQLite (Local)</span>
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px]">
          <span className="text-slate-500">Framework:</span>
          <span className="text-slate-300">Tauri + React</span>
        </div>
      </div>
    </aside>
  );
};
