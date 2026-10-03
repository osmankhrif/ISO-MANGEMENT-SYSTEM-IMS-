import React, { useState } from 'react';
import { useApp, NavigationModule } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { Bell, Moon, Sun, CheckCircle2, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    currentUser,
    setCurrentUser,
    userRole,
    setUserRole,
    usersList,
    isModuleAccessible,
    unreadNotificationCount,
    notifications,
    refreshNotifications,
    theme,
    toggleTheme,
    navigateToAudit,
    navigateToFinding,
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const navLinks: { label: string; module: NavigationModule }[] = [
    { label: 'Dashboard', module: 'dashboard' },
    { label: 'Audits', module: 'planning' },
    { label: 'Checklists', module: 'checklists' },
    { label: 'Findings', module: 'findings' },
    { label: 'CAPA', module: 'correctiveActions' },
    { label: 'Reports', module: 'reports' },
    { label: 'Analytics', module: 'analytics' },
  ];

  const accessibleNavLinks = navLinks.filter((link) => isModuleAccessible(link.module, userRole));

  const handleNotificationClick = (item: any) => {
    DbService.markNotificationRead(item.id);
    refreshNotifications();
    setShowNotifications(false);
    if (item.linkModule === 'findings' && item.linkId) {
      navigateToFinding(item.linkId);
    } else if (item.linkModule === 'audits' && item.linkId) {
      navigateToAudit(item.linkId, 'planning');
    } else if (item.linkModule === 'correctiveActions') {
      setActiveModule('correctiveActions');
    }
  };

  const handleMarkAllRead = () => {
    DbService.markAllNotificationsRead();
    refreshNotifications();
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 select-none no-print">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-slate-950 font-bold text-xs tracking-wider font-mono">
          IMS
        </div>
        <button
          onClick={() => setActiveModule('dashboard')}
          className="text-base font-bold tracking-tight text-white hover:text-amber-400 transition-colors"
        >
          ISO Management System (IMS)
        </button>
      </div>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {accessibleNavLinks.map((link) => (
          <button
            key={link.module}
            onClick={() => setActiveModule(link.module)}
            className={`transition-colors py-1 relative ${
              activeModule === link.module ? 'text-amber-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            {link.label}
            {activeModule === link.module && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
            )}
          </button>
        ))}
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3 relative">
        {/* Offline indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>OFFLINE SQLITE</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-mono">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-84 bg-slate-900 border border-slate-700 shadow-2xl rounded p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Internal Notifications ({notifications.length})
                </span>
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Mark All Read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-2 rounded cursor-pointer transition-colors text-xs border ${
                        n.isRead
                          ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                          : 'bg-slate-800/80 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {n.type === 'critical' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        ) : n.type === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span className="font-semibold text-white truncate">{n.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded transition-colors text-xs"
          >
            <div className="w-6 h-6 rounded bg-slate-700 text-amber-400 font-bold flex items-center justify-center text-[10px] font-mono">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-slate-200 font-semibold truncate max-w-32">
                {currentUser.fullName.split(',')[0]}
              </div>
              <div className="text-[10px] text-amber-400 font-mono">{currentUser.role}</div>
            </div>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 shadow-2xl rounded p-2 z-50">
              <div className="px-2 py-1.5 border-b border-slate-800 mb-1 flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Active Role: <span className="text-amber-400">{userRole}</span>
                </span>
                <button
                  onClick={() => {
                    setActiveModule('settings');
                    setShowUserDropdown(false);
                  }}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  Settings & RBAC →
                </button>
              </div>

              {/* Quick Role Simulation Switcher */}
              <div className="p-1 mb-2 bg-slate-950 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono px-1 mb-1">Simulate Permission Level:</div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                  {(['Administrator', 'Lead Auditor', 'Auditor', 'Viewer'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setUserRole(r);
                        setShowUserDropdown(false);
                      }}
                      className={`px-2 py-1 rounded text-left transition-colors truncate ${
                        userRole === r
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {r === 'Administrator' ? 'Admin' : r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-2 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Switch User Persona:
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {usersList.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setCurrentUser(user);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                      currentUser.id === user.id
                        ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-white text-xs">{user.fullName}</div>
                      <div className="text-[10px] text-slate-400">{user.department}</div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {user.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
