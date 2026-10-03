import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { sqlite } from '../../db/sqliteEngine.ts';
import { TauriBridge } from '../../utils/tauriBridge.ts';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  History,
  Search,
  Lock,
} from 'lucide-react';

export const BackupRestoreView: React.FC = () => {
  const { dataVersion, triggerDataRefresh, currentUser, settings, refreshSettings } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchLog, setSearchLog] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const auditLogs = useMemo(() => DbService.getAuditTrail(200), [dataVersion]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        !searchLog.trim() ||
        log.recordIdentifier.toLowerCase().includes(searchLog.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchLog.toLowerCase()) ||
        log.tableName.toLowerCase().includes(searchLog.toLowerCase()) ||
        (log.newValue && log.newValue.toLowerCase().includes(searchLog.toLowerCase()));

      const matchAction = actionFilter === 'All' || log.action === actionFilter;
      return matchSearch && matchAction;
    });
  }, [auditLogs, searchLog, actionFilter]);

  // Export SQLite database binary
  const handleBackupDatabase = async () => {
    try {
      const binary = sqlite.exportDatabase();
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `ISO_System_IMS_Database_${dateStr}.sqlite`;

      await TauriBridge.saveFileLocally(filename, binary, 'application/x-sqlite3');
      DbService.logAudit(currentUser.fullName, 'BACKUP', 'sqlite_database', 'full', filename);
      DbService.updateSetting('last_backup_date', new Date().toISOString(), currentUser.fullName);
      refreshSettings();
      triggerDataRefresh();
      setBackupMessage(`SQLite Database backup downloaded: ${filename}`);
      setTimeout(() => setBackupMessage(null), 4000);
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    }
  };

  // Restore SQLite database binary
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Are you sure you want to restore database from "${file.name}"? Current data will be replaced by the backup contents.`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const uint8 = new Uint8Array(arrayBuffer);
        await sqlite.importDatabase(uint8);
        DbService.logAudit(currentUser.fullName, 'RESTORE', 'sqlite_database', 'full', file.name);
        triggerDataRefresh();
        alert(`Database successfully restored from ${file.name}!`);
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteDemoData = async () => {
    if (window.confirm('WARNING: Delete all sample demonstration records? Custom audits will remain intact.')) {
      await sqlite.deleteDemoData();
      DbService.logAudit(currentUser.fullName, 'DELETE', 'demo_data', 'all', 'Demo data purged by user');
      triggerDataRefresh();
      alert('All demo records successfully deleted from SQLite database.');
    }
  };

  const handleResetToDemoData = async () => {
    if (window.confirm('Reset database to clean initial ISO System (IMS) baseline state? This replaces existing data.')) {
      await sqlite.resetToDemoData();
      triggerDataRefresh();
      alert('Database re-seeded with pristine ISO System (IMS) baseline records.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            Database Backup, Disaster Recovery & Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Offline-first SQLite binary export/import and immutable regulatory compliance change log.
          </p>
        </div>

        {backupMessage && (
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            {backupMessage}
          </span>
        )}
      </div>

      {/* Backup & Disaster Recovery Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Backup Database */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded text-xs space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Backup SQLite Database</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Generates a complete binary snapshot (`.sqlite` / `.db`) containing all relational tables, checklists, responses, findings, and CAPA logs.
          </p>
          <div className="text-[10px] text-slate-500 font-mono">
            Last Backup: {settings.lastBackupDate ? settings.lastBackupDate.split('T')[0] : 'None recorded'}
          </div>
          <button
            onClick={handleBackupDatabase}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .sqlite Backup File</span>
          </button>
        </div>

        {/* Card 2: Restore Database */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded text-xs space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Restore SQLite Database</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Upload an existing `.sqlite` or `.db` file to restore full system state. All schema tables and foreign keys will be verified.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleRestoreFile}
            accept=".sqlite,.db"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Select Backup File to Restore</span>
          </button>
        </div>

        {/* Card 3: Demo Data Governance */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded text-xs space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>Demo Data Governance</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Purge sample petrochemical records when transitioning to live plant production, or restore demo dataset for auditor training.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleDeleteDemoData}
              className="py-1.5 px-2 bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-800/60 rounded font-medium flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Demo</span>
            </button>
            <button
              onClick={handleResetToDemoData}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded font-medium flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Immutable Audit Trail Section */}
      <div className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              Regulatory Audit Trail (Append-Only Log)
            </h2>
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              Modifications Prohibited
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                placeholder="Filter logs..."
                className="pl-7 pr-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
            >
              <option value="All">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              <option value="CLOSE">CLOSE</option>
              <option value="BACKUP">BACKUP</option>
              <option value="RESTORE">RESTORE</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[50vh]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800 sticky top-0">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">User</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Entity / Target</th>
                <th className="py-2 px-3">Change Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                    No matching audit logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/50">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                      {log.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-2 px-3 font-sans text-white font-medium whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          log.action === 'CREATE'
                            ? 'bg-sky-950 text-sky-400'
                            : log.action === 'CLOSE'
                            ? 'bg-emerald-950 text-emerald-400'
                            : log.action === 'DELETE'
                            ? 'bg-red-950 text-red-400'
                            : log.action === 'BACKUP' || log.action === 'RESTORE'
                            ? 'bg-purple-950 text-purple-400'
                            : 'bg-amber-950 text-amber-400'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-200 whitespace-nowrap">
                      <span className="text-slate-400 text-[10px]">{log.tableName}</span> · {log.recordIdentifier}
                    </td>
                    <td className="py-2 px-3 max-w-md text-slate-300 truncate font-sans text-xs">
                      {log.newValue || log.previousValue || 'Event logged'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
