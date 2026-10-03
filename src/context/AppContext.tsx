import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DbService } from '../db/dbService.ts';
import { sqlite } from '../db/sqliteEngine.ts';
import { NotificationItem, SystemSettings, User, UserRole } from '../types/index.ts';

export type NavigationModule =
  | 'dashboard'
  | 'auditProgram'
  | 'planning'
  | 'standards'
  | 'checklists'
  | 'execution'
  | 'findings'
  | 'correctiveActions'
  | 'followUp'
  | 'auditors'
  | 'documents'
  | 'reports'
  | 'analytics'
  | 'settings'
  | 'backup'
  | 'packaging';

interface AppContextType {
  activeModule: NavigationModule;
  setActiveModule: (mod: NavigationModule) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  usersList: User[];
  selectedAuditId: string | null;
  setSelectedAuditId: (id: string | null) => void;
  selectedFindingId: string | null;
  setSelectedFindingId: (id: string | null) => void;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  refreshNotifications: () => void;
  settings: SystemSettings;
  refreshSettings: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  dataVersion: number;
  triggerDataRefresh: () => void;
  isDbReady: boolean;
  dbError: string | null;
  navigateToAudit: (auditId: string, module?: NavigationModule) => void;
  navigateToFinding: (findingId: string) => void;
  canPerform: (action: 'admin' | 'manage_audits' | 'execute_audit' | 'manage_capa' | 'edit_standards') => boolean;
  isModuleAccessible: (module: NavigationModule, role?: UserRole) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Persistent Dev/Testing Role storage keys
const USER_ROLE_KEY = 'userRole';
const DEV_USER_ROLE_KEY = 'petroapex_dev_user_role';

const parseStoredRole = (val: string | null): UserRole | null => {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed === 'Admin' || trimmed === 'Administrator') return 'Administrator';
  if (
    trimmed === 'Audit Manager' ||
    trimmed === 'Lead Auditor' ||
    trimmed === 'Auditor' ||
    trimmed === 'Department Manager' ||
    trimmed === 'Viewer'
  ) {
    return trimmed as UserRole;
  }
  return null;
};

const getInitialUserRole = (): UserRole => {
  try {
    const fromPrimary = parseStoredRole(localStorage.getItem(USER_ROLE_KEY));
    if (fromPrimary) return fromPrimary;
    const fromSecondary = parseStoredRole(localStorage.getItem(DEV_USER_ROLE_KEY));
    if (fromSecondary) return fromSecondary;
  } catch {
    // fallback if localStorage is disabled/restricted
  }
  return 'Administrator';
};

export const isModuleAccessibleForRole = (module: NavigationModule, role: UserRole): boolean => {
  switch (role) {
    case 'Administrator':
      return true; // All 16 modules enabled
    case 'Audit Manager':
      // Program, governance, audits, reports, analytics. Backup is admin-restricted.
      return module !== 'backup';
    case 'Lead Auditor':
      // Field planning, execution, findings, CAPA verification, reports.
      return module !== 'backup' && module !== 'packaging';
    case 'Auditor':
      // Field inspection, checklists, execution, findings, evidence documents, reports.
      return [
        'dashboard',
        'auditProgram',
        'planning',
        'checklists',
        'execution',
        'findings',
        'documents',
        'reports',
        'settings',
      ].includes(module);
    case 'Department Manager':
      // Audited department focus: Review findings, submit RCA & CAPA, follow-ups, documents, reports.
      return [
        'dashboard',
        'auditProgram',
        'findings',
        'correctiveActions',
        'followUp',
        'documents',
        'reports',
        'settings',
      ].includes(module);
    case 'Viewer':
      // Compliance oversight: read-only dashboard, schedule, findings register, reports, analytics.
      return [
        'dashboard',
        'auditProgram',
        'findings',
        'documents',
        'reports',
        'analytics',
        'settings',
      ].includes(module);
    default:
      return true;
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModule] = useState<NavigationModule>('dashboard');
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(1);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Persistent User Role state for dev/testing initialized from localStorage
  const [userRole, setUserRoleState] = useState<UserRole>(getInitialUserRole);

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const role = getInitialUserRole();
    if (role === 'Lead Auditor') {
      return {
        id: 'usr-3',
        username: 'tariq.mansoor',
        fullName: 'Tariq Al-Mansoor, Lead Assessor',
        email: 'tariq.mansoor@petroapex.com',
        role: 'Lead Auditor',
        department: 'Operations Quality & Audits',
        active: true,
        createdAt: '2026-01-10T08:00:00Z',
      };
    }
    if (role === 'Auditor') {
      return {
        id: 'usr-4',
        username: 'sarah.jenkins',
        fullName: 'Sarah Jenkins, CQA',
        email: 'sarah.jenkins@petroapex.com',
        role: 'Auditor',
        department: 'Process Safety & Quality',
        active: true,
        createdAt: '2026-01-10T08:00:00Z',
      };
    }
    if (role === 'Viewer') {
      return {
        id: 'usr-viewer',
        username: 'compliance.viewer',
        fullName: 'Regulatory Compliance Inspector',
        email: 'inspector@regulatory.gov',
        role: 'Viewer',
        department: 'External Compliance Oversight',
        active: true,
        createdAt: '2026-01-10T08:00:00Z',
      };
    }
    if (role === 'Audit Manager') {
      return {
        id: 'usr-2',
        username: 'marcus.vance',
        fullName: 'Dr. Marcus Vance, PhD',
        email: 'marcus.vance@petroapex.com',
        role: 'Audit Manager',
        department: 'HSE & Process Integrity',
        active: true,
        createdAt: '2026-01-10T08:00:00Z',
      };
    }
    if (role === 'Department Manager') {
      return {
        id: 'usr-5',
        username: 'robert.hayes',
        fullName: 'Robert Hayes, Operations Manager',
        email: 'robert.hayes@petroapex.com',
        role: 'Department Manager',
        department: 'Refinery Hydrocracking Operations',
        active: true,
        createdAt: '2026-01-10T08:00:00Z',
      };
    }
    return {
      id: 'usr-1',
      username: 'admin',
      fullName: 'Elena Rostova, CQA',
      email: 'elena.rostova@petroapex.com',
      role: 'Administrator',
      department: 'Quality & Compliance',
      active: true,
      createdAt: '2026-01-10T08:00:00Z',
    };
  });
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>('aud-001');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>('fnd-001');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: 'ISO System (IMS)',
    facilityName: 'Integrated Quality & HSE Operations Facility',
    address: 'International Quality & Compliance Hub',
    defaultLeadAuditor: 'aud-1',
    autoBackupIntervalHours: 24,
    riskMatrixThresholds: { low: 6, medium: 12, high: 19, critical: 25 },
    customReportDisclaimer: 'ISO System (IMS) - Proprietary Audit Document by Osman Khrif.',
    offlineMode: true,
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Ensure userRole is always actively mirrored in localStorage across any lifecycle mutation
  useEffect(() => {
    try {
      localStorage.setItem(USER_ROLE_KEY, userRole);
      localStorage.setItem(DEV_USER_ROLE_KEY, userRole);
    } catch (e) {
      console.warn('Failed to mirror userRole in localStorage:', e);
    }
  }, [userRole]);

  // Listen to window storage events so changes in tests or other tabs update reactively
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === USER_ROLE_KEY || e.key === DEV_USER_ROLE_KEY) {
        const parsed = parseStoredRole(e.newValue);
        if (parsed) {
          setUserRoleState(parsed);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Sync initial user with persistent userRole
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await sqlite.init();
        if (!mounted) return;
        setIsDbReady(true);
        const users = DbService.getUsers();
        setUsersList(users);
        if (users.length > 0) {
          const matched = users.find((u) => u.role === userRole) || users[0];
          setCurrentUserState(matched);
        }
        setNotifications(DbService.getNotifications());
        setSettings(DbService.getSettings());
      } catch (err: any) {
        if (!mounted) return;
        console.error('Failed to initialize database:', err);
        setDbError(err.message || 'SQLite initialization failed');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setUserRole = (newRole: UserRole | string) => {
    const normalizedRole = parseStoredRole(newRole as string) || (newRole as UserRole);
    setUserRoleState(normalizedRole);
    try {
      localStorage.setItem(USER_ROLE_KEY, normalizedRole);
      localStorage.setItem(DEV_USER_ROLE_KEY, normalizedRole);
    } catch (e) {
      console.warn('Failed to persist user role in localStorage:', e);
    }

    // Synchronize currentUser with persona for this role
    const matched = usersList.find((u) => u.role === normalizedRole);
    if (matched) {
      setCurrentUserState(matched);
    } else {
      setCurrentUserState((prev) => ({
        ...prev,
        role: normalizedRole,
        fullName: `${normalizedRole} Specialist`,
      }));
    }

    // Automatically transition to dashboard if active module is restricted in new role
    if (!isModuleAccessibleForRole(activeModule, normalizedRole)) {
      setActiveModule('dashboard');
    }
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    setUserRoleState(user.role);
    try {
      localStorage.setItem(USER_ROLE_KEY, user.role);
      localStorage.setItem(DEV_USER_ROLE_KEY, user.role);
    } catch (e) {
      console.warn('Failed to persist user role in localStorage:', e);
    }
    if (!isModuleAccessibleForRole(activeModule, user.role)) {
      setActiveModule('dashboard');
    }
  };

  const isModuleAccessible = (module: NavigationModule, role?: UserRole): boolean => {
    return isModuleAccessibleForRole(module, role || userRole);
  };

  const triggerDataRefresh = () => {
    setDataVersion(v => v + 1);
    try {
      setNotifications(DbService.getNotifications());
      setSettings(DbService.getSettings());
    } catch (e) {
      console.warn(e);
    }
  };

  const refreshNotifications = () => {
    try {
      setNotifications(DbService.getNotifications());
    } catch (e) {
      console.warn(e);
    }
  };

  const refreshSettings = () => {
    try {
      setSettings(DbService.getSettings());
    } catch (e) {
      console.warn(e);
    }
  };

  const toggleTheme = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  const navigateToAudit = (auditId: string, module: NavigationModule = 'planning') => {
    setSelectedAuditId(auditId);
    setActiveModule(module);
  };

  const navigateToFinding = (findingId: string) => {
    setSelectedFindingId(findingId);
    setActiveModule('findings');
  };

  // Role-Based Access Control logic
  const canPerform = (action: 'admin' | 'manage_audits' | 'execute_audit' | 'manage_capa' | 'edit_standards'): boolean => {
    const role = userRole;
    if (role === 'Administrator') return true;
    if (action === 'admin') return false;

    if (action === 'manage_audits') {
      return role === 'Audit Manager' || role === 'Lead Auditor';
    }
    if (action === 'execute_audit') {
      return role === 'Audit Manager' || role === 'Lead Auditor' || role === 'Auditor';
    }
    if (action === 'manage_capa') {
      return role === 'Audit Manager' || role === 'Lead Auditor' || role === 'Department Manager';
    }
    if (action === 'edit_standards') {
      return role === 'Audit Manager' || role === 'Lead Auditor';
    }
    return false;
  };

  return (
    <AppContext.Provider
      value={{
        activeModule,
        setActiveModule,
        userRole,
        setUserRole,
        currentUser,
        setCurrentUser,
        usersList,
        selectedAuditId,
        setSelectedAuditId,
        selectedFindingId,
        setSelectedFindingId,
        notifications,
        unreadNotificationCount,
        refreshNotifications,
        settings,
        refreshSettings,
        theme,
        toggleTheme,
        dataVersion,
        triggerDataRefresh,
        isDbReady,
        dbError,
        navigateToAudit,
        navigateToFinding,
        canPerform,
        isModuleAccessible,
      }}
    >
      <div className={theme === 'dark' ? 'dark' : ''}>{children}</div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
