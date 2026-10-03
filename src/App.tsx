import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { TopBar } from './components/layout/TopBar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { AuditProgramView } from './components/auditProgram/AuditProgramView.tsx';
import { AuditPlanView } from './components/planning/AuditPlanView.tsx';
import { StandardsView } from './components/standards/StandardsView.tsx';
import { ChecklistsView } from './components/checklists/ChecklistsView.tsx';
import { AuditExecutionView } from './components/execution/AuditExecutionView.tsx';
import { FindingsView } from './components/findings/FindingsView.tsx';
import { CorrectiveActionsView } from './components/correctiveActions/CorrectiveActionsView.tsx';
import { FollowUpView } from './components/followUp/FollowUpView.tsx';
import { AuditorManagementView } from './components/auditors/AuditorManagementView.tsx';
import { DocumentsView } from './components/documents/DocumentsView.tsx';
import { AuditReportsView } from './components/reports/AuditReportsView.tsx';
import { AnalyticsView } from './components/analytics/AnalyticsView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { BackupRestoreView } from './components/backup/BackupRestoreView.tsx';
import { PackagingView } from './components/packaging/PackagingView.tsx';
import { Database, AlertOctagon, ShieldAlert } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeModule, setActiveModule, userRole, isModuleAccessible, isDbReady, dbError } = useApp();

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mb-4">
          <Database className="w-6 h-6 animate-spin" />
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">
          Mounting Local SQLite Relational Engine...
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Verifying tables, ISO schemas, and plant demo data
        </p>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mb-4">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">Database Initialization Error</h2>
        <p className="text-xs text-red-400 mt-1 font-mono max-w-md text-center">{dbError}</p>
      </div>
    );
  }

  const renderModule = () => {
    if (!isModuleAccessible(activeModule, userRole)) {
      return (
        <div className="p-8 max-w-lg mx-auto my-16 bg-slate-900 border border-amber-500/40 rounded p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">Access Control Restricted</h2>
          <p className="text-xs text-slate-300">
            The module <strong className="text-amber-400 font-mono">{activeModule}</strong> is restricted for your current simulated role <strong className="text-white font-mono">{userRole}</strong>.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setActiveModule('dashboard')}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => setActiveModule('settings')}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded border border-slate-700 transition-colors"
            >
              Switch Role in Settings
            </button>
          </div>
        </div>
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'auditProgram':
        return <AuditProgramView />;
      case 'planning':
        return <AuditPlanView />;
      case 'standards':
        return <StandardsView />;
      case 'checklists':
        return <ChecklistsView />;
      case 'execution':
        return <AuditExecutionView />;
      case 'findings':
        return <FindingsView />;
      case 'correctiveActions':
        return <CorrectiveActionsView />;
      case 'followUp':
        return <FollowUpView />;
      case 'auditors':
        return <AuditorManagementView />;
      case 'documents':
        return <DocumentsView />;
      case 'reports':
        return <AuditReportsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      case 'backup':
        return <BackupRestoreView />;
      case 'packaging':
        return <PackagingView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-950/90">{renderModule()}</main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
