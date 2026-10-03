import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { DbService } from '../../db/dbService.ts';
import { PdfReportGenerator } from '../../utils/pdfGenerator.ts';
import { ExcelService } from '../../utils/excelService.ts';
import { ICalGenerator } from '../../utils/icalGenerator.ts';
import {
  Audit,
  Auditor,
  AuditType,
  AuditPriority,
  PLANT_SITES,
  PlantSite,
} from '../../types/index.ts';
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Filter,
  Search,
  Building2,
  User,
  Users,
  BarChart3,
  Shield,
  Plus,
  X,
  ExternalLink,
  Download,
  Clock,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Edit3,
  SlidersHorizontal,
  CheckCircle,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Printer,
  GripVertical,
  Move,
  TrendingUp,
  Check,
} from 'lucide-react';

interface PlanningCalendarViewProps {
  onSelectAuditToEdit?: (auditId: string) => void;
  isFullScreenMode?: boolean;
  onToggleFullScreen?: () => void;
}

// Visual color configuration per ISO Standard for instant recognition
const STANDARD_STYLES: Record<
  string,
  { label: string; text: string; bg: string; border: string; bar: string }
> = {
  'ISO 9001': {
    label: 'ISO 9001',
    text: 'text-sky-300',
    bg: 'bg-sky-950/80',
    border: 'border-sky-700/60',
    bar: 'bg-sky-500',
  },
  'ISO 14001': {
    label: 'ISO 14001',
    text: 'text-emerald-300',
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-700/60',
    bar: 'bg-emerald-500',
  },
  'ISO 45001': {
    label: 'ISO 45001',
    text: 'text-amber-300',
    bg: 'bg-amber-950/80',
    border: 'border-amber-700/60',
    bar: 'bg-amber-500',
  },
  'ISO 50001': {
    label: 'ISO 50001',
    text: 'text-teal-300',
    bg: 'bg-teal-950/80',
    border: 'border-teal-700/60',
    bar: 'bg-teal-500',
  },
  'ISO 55001': {
    label: 'ISO 55001',
    text: 'text-purple-300',
    bg: 'bg-purple-950/80',
    border: 'border-purple-700/60',
    bar: 'bg-purple-500',
  },
  'Company Procedures': {
    label: 'Internal PSM',
    text: 'text-orange-300',
    bg: 'bg-orange-950/80',
    border: 'border-orange-700/60',
    bar: 'bg-orange-500',
  },
  'Legal/Regulatory Requirements': {
    label: 'Regulatory',
    text: 'text-rose-300',
    bg: 'bg-rose-950/80',
    border: 'border-rose-700/60',
    bar: 'bg-rose-500',
  },
};

const getStandardStyle = (standardIds: string[]) => {
  for (const std of standardIds) {
    if (STANDARD_STYLES[std]) return STANDARD_STYLES[std];
    for (const key of Object.keys(STANDARD_STYLES)) {
      if (std.includes(key)) return STANDARD_STYLES[key];
    }
  }
  return {
    label: standardIds[0] || 'ISO',
    text: 'text-slate-300',
    bg: 'bg-slate-900',
    border: 'border-slate-700',
    bar: 'bg-slate-500',
  };
};

const SITE_ABBREVIATIONS: Record<string, string> = {
  'Baytown Refinery Complex': 'Baytown',
  'Beaumont Olefins & Aromatics Plant': 'Beaumont',
  'Pasadena Bulk Chemical Terminal': 'Pasadena',
  'Mont Belvieu Gas Fractionation & Cogen': 'Mont Belvieu',
  'Corpus Christi Marine Terminal & Storage': 'Corpus Christi',
};

export const PlanningCalendarView: React.FC<PlanningCalendarViewProps> = ({
  onSelectAuditToEdit,
  isFullScreenMode: externalFullScreen,
  onToggleFullScreen: externalToggleFullScreen,
}) => {
  const {
    dataVersion,
    triggerDataRefresh,
    currentUser,
    canPerform,
    settings,
    setActiveModule,
    setSelectedAuditId,
  } = useApp();

  // Internal Full-Screen State if not controlled externally
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const isFullScreen = externalFullScreen ?? internalFullScreen;
  const toggleFullScreen = externalToggleFullScreen ?? (() => setInternalFullScreen((v) => !v));

  // Current active date in calendar (defaults to October 2026 based on 2026-10-01 session)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 1));

  // 3 Required Filters: ISO Standard, Auditor, Plant Site
  const [selectedStandard, setSelectedStandard] = useState<string>('All');
  const [selectedAuditorId, setSelectedAuditorId] = useState<string>('All');
  const [selectedPlantSite, setSelectedPlantSite] = useState<string>('All');
  const [auditorRoleMode, setAuditorRoleMode] = useState<'All' | 'Lead' | 'Team'>('All');

  // Additional Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dropdown Menu Visibility Filters for ISO Standards & Auditors (Pre-Print Customization)
  const [enabledStandards, setEnabledStandards] = useState<Set<string>>(() => new Set());
  const [enabledAuditorIds, setEnabledAuditorIds] = useState<Set<string>>(() => new Set());
  const [isVisibilityInitialized, setIsVisibilityInitialized] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterMenuTab, setFilterMenuTab] = useState<'standards' | 'auditors'>('standards');
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Selected audit for quick inspector drawer
  const [inspectAudit, setInspectAudit] = useState<Audit | null>(null);

  // Reschedule Modal State
  const [rescheduleAuditTarget, setRescheduleAuditTarget] = useState<Audit | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');

  // Drag-and-drop rescheduling state
  const [draggingAudit, setDraggingAudit] = useState<Audit | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [rescheduleToast, setRescheduleToast] = useState<{
    auditNumber: string;
    auditTitle: string;
    oldDates: string;
    newDates: string;
    hasConflict: boolean;
    conflictAuditorName?: string;
  } | null>(null);

  // New Audit Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string>('');

  // Facility Leads Roster preview toggle on screen
  const [showFacilityRoster, setShowFacilityRoster] = useState(false);

  // Auditor Workload breakdown panel toggle on screen
  const [showWorkloadPanel, setShowWorkloadPanel] = useState(true);

  // Quick inline rename for auditors in workload breakdown
  const [editingAuditorNameId, setEditingAuditorNameId] = useState<string | null>(null);
  const [editingAuditorNameVal, setEditingAuditorNameVal] = useState<string>('');

  const handleSaveAuditorName = (auditorId: string) => {
    if (!editingAuditorNameVal.trim()) {
      setEditingAuditorNameId(null);
      return;
    }
    DbService.updateAuditorName(auditorId, editingAuditorNameVal.trim(), currentUser.fullName);
    setEditingAuditorNameId(null);
    triggerDataRefresh();
  };

  // Print to PDF feedback banner
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  // Print to PDF using browser print functionality
  const handlePrintToPdf = useCallback(() => {
    // Dismiss any open interaction overlay modals so only clean calendar is printed
    setIsFilterMenuOpen(false);
    setInspectAudit(null);
    setRescheduleAuditTarget(null);
    setShowScheduleModal(false);
    setPrintFeedback('Preparing calendar for facility distribution... Opening print dialog. Choose "Save as PDF" to export.');

    // Short timeout to guarantee modal unmount before browser print snapshot
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintFeedback(null), 3500);
    }, 150);
  }, []);

  // Data fetching
  const audits = useMemo(() => DbService.getAudits(), [dataVersion]);
  const auditors = useMemo(() => DbService.getAuditors(), [dataVersion]);
  const standards = useMemo(() => DbService.getStandards(), [dataVersion]);
  const plantSites = useMemo(() => DbService.getPlantSites(), []);

  // Initialize visibility sets when standards and auditors load
  useEffect(() => {
    if (!isVisibilityInitialized && standards.length > 0 && auditors.length > 0) {
      setEnabledStandards(new Set(standards.map((s) => s.code)));
      setEnabledAuditorIds(new Set(auditors.map((a) => a.id)));
      setIsVisibilityInitialized(true);
    }
  }, [standards, auditors, isVisibilityInitialized]);

  // Click outside to close filter dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(e.target as Node)
      ) {
        setIsFilterMenuOpen(false);
      }
    };
    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterMenuOpen]);

  // Visibility toggle handlers
  const toggleStandard = (code: string) => {
    setEnabledStandards((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleSelectAllStandards = () => {
    setEnabledStandards(new Set(standards.map((s) => s.code)));
  };

  const handleClearAllStandards = () => {
    setEnabledStandards(new Set());
  };

  const toggleAuditor = (id: string) => {
    setEnabledAuditorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllAuditors = () => {
    setEnabledAuditorIds(new Set(auditors.map((a) => a.id)));
  };

  const handleClearAllAuditors = () => {
    setEnabledAuditorIds(new Set());
  };

  const handleResetVisibility = () => {
    setEnabledStandards(new Set(standards.map((s) => s.code)));
    setEnabledAuditorIds(new Set(auditors.map((a) => a.id)));
  };

  // Keyboard shortcut listener for Esc to exit full screen and Ctrl+P / Cmd+P for Print to PDF
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        toggleFullScreen();
      }
      if (e.key === 'Escape' && isFilterMenuOpen) {
        setIsFilterMenuOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrintToPdf();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, toggleFullScreen, handlePrintToPdf, isFilterMenuOpen]);

  // Current Year & Month Values
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed (9 = Oct)

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date(2026, 9, 1)); // October 2026 simulated runtime
  };

  const handleMonthChange = (m: number) => {
    setCurrentDate(new Date(currentYear, m, 1));
  };

  const handleYearChange = (y: number) => {
    setCurrentDate(new Date(y, currentMonth, 1));
  };

  // Month name formatting
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const formattedMonthYear = `${monthNames[currentMonth]} ${currentYear}`;

  // Month audits (unfiltered by standard/auditor visibility) for count badges in dropdown
  const monthAuditsUnfiltered = useMemo(() => {
    const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      lastDayOfMonth
    ).padStart(2, '0')}`;

    return audits.filter((audit) => {
      if (selectedPlantSite !== 'All') {
        const auditSite = audit.site || DbService.deriveSite(audit.area, audit.department);
        if (auditSite !== selectedPlantSite) return false;
      }
      return (
        audit.plannedStartDate <= monthEndStr &&
        audit.plannedEndDate >= monthStartStr
      );
    });
  }, [audits, currentYear, currentMonth, selectedPlantSite]);

  const auditCountByStandard = useMemo(() => {
    const counts: Record<string, number> = {};
    monthAuditsUnfiltered.forEach((a) => {
      a.standardIds.forEach((std) => {
        counts[std] = (counts[std] || 0) + 1;
      });
    });
    return counts;
  }, [monthAuditsUnfiltered]);

  const auditCountByAuditor = useMemo(() => {
    const counts: Record<string, number> = {};
    monthAuditsUnfiltered.forEach((a) => {
      counts[a.leadAuditorId] = (counts[a.leadAuditorId] || 0) + 1;
      a.teamAuditorIds.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [monthAuditsUnfiltered]);

  // Filtered audits across multi-dimension filters including dropdown visibility
  const filteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      // 1. Dropdown Visibility Filter: ISO Standards toggle set
      if (isVisibilityInitialized) {
        if (enabledStandards.size === 0) return false;
        const matchesEnabledStandard = audit.standardIds.some(
          (s) => enabledStandards.has(s) || Array.from(enabledStandards).some((es) => s.includes(es))
        );
        if (!matchesEnabledStandard) return false;

        // 2. Dropdown Visibility Filter: Auditors toggle set
        if (enabledAuditorIds.size === 0) return false;
        const matchesEnabledAuditor =
          enabledAuditorIds.has(audit.leadAuditorId) ||
          audit.teamAuditorIds.some((id) => enabledAuditorIds.has(id));
        if (!matchesEnabledAuditor) return false;
      }

      // 3. ISO Standard Single Filter
      if (selectedStandard !== 'All') {
        const hasStd = audit.standardIds.some(
          (s) => s === selectedStandard || s.includes(selectedStandard)
        );
        if (!hasStd) return false;
      }

      // 4. Auditor Single Filter
      if (selectedAuditorId !== 'All') {
        if (auditorRoleMode === 'Lead' && audit.leadAuditorId !== selectedAuditorId) {
          return false;
        }
        if (auditorRoleMode === 'Team' && !audit.teamAuditorIds.includes(selectedAuditorId)) {
          return false;
        }
        if (
          auditorRoleMode === 'All' &&
          audit.leadAuditorId !== selectedAuditorId &&
          !audit.teamAuditorIds.includes(selectedAuditorId)
        ) {
          return false;
        }
      }

      // 5. Plant Site Filter
      if (selectedPlantSite !== 'All') {
        const auditSite = audit.site || DbService.deriveSite(audit.area, audit.department);
        if (auditSite !== selectedPlantSite) return false;
      }

      // 6. Status Filter
      if (statusFilter !== 'All' && audit.status !== statusFilter) {
        return false;
      }

      // 7. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = audit.title.toLowerCase().includes(query);
        const matchNumber = audit.auditNumber.toLowerCase().includes(query);
        const matchArea = audit.area.toLowerCase().includes(query);
        const matchProcess = audit.process.toLowerCase().includes(query);
        const matchSite = (audit.site || '').toLowerCase().includes(query);
        if (!matchTitle && !matchNumber && !matchArea && !matchProcess && !matchSite) {
          return false;
        }
      }

      return true;
    });
  }, [
    audits,
    isVisibilityInitialized,
    enabledStandards,
    enabledAuditorIds,
    selectedStandard,
    selectedAuditorId,
    auditorRoleMode,
    selectedPlantSite,
    statusFilter,
    searchQuery,
  ]);

  // Audits occurring in current visible month
  const monthAudits = useMemo(() => {
    const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      lastDayOfMonth
    ).padStart(2, '0')}`;

    return filteredAudits.filter((audit) => {
      return (
        audit.plannedStartDate <= monthEndStr &&
        audit.plannedEndDate >= monthStartStr
      );
    });
  }, [filteredAudits, currentYear, currentMonth]);

  // Monthly Metrics Strip stats
  const monthStats = useMemo(() => {
    const total = monthAudits.length;
    const sitesCount: Record<string, number> = {};
    const standardsCount: Record<string, number> = {};
    const auditorsWorkload: Record<string, number> = {};
    let plannedCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;

    monthAudits.forEach((a) => {
      // Sites
      const site = a.site || DbService.deriveSite(a.area, a.department);
      sitesCount[site] = (sitesCount[site] || 0) + 1;

      // Standards
      a.standardIds.forEach((std) => {
        standardsCount[std] = (standardsCount[std] || 0) + 1;
      });

      // Lead Auditor Workload
      auditorsWorkload[a.leadAuditorId] = (auditorsWorkload[a.leadAuditorId] || 0) + 1;

      // Status
      if (a.status === 'Planned') plannedCount++;
      else if (a.status === 'In Progress') inProgressCount++;
      else if (a.status === 'Completed') completedCount++;
    });

    return {
      total,
      sitesCount,
      standardsCount,
      auditorsWorkload,
      plannedCount,
      inProgressCount,
      completedCount,
    };
  }, [monthAudits]);

  // Auditor helper
  const getAuditorById = useCallback(
    (id: string): Auditor | undefined => {
      return auditors.find((a) => a.id === id);
    },
    [auditors]
  );

  // Calendar Grid Cells Computation (Monday-based 7-day grid) with Double-Booking Conflict Detection
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayDate = new Date(currentYear, currentMonth, 1);
    // JS getDay(): Sunday = 0, Monday = 1, ...
    // Convert to Monday = 0, Sunday = 6
    const firstDayOfWeek = (firstDayDate.getDay() + 6) % 7;

    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    interface AuditorDoubleBooking {
      auditorId: string;
      auditorName: string;
      conflictingAuditIds: string[];
      conflictingAuditNumbers: string[];
      conflictingAuditTitles: string[];
      details: string;
    }

    interface CalendarCell {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWeekend: boolean;
      audits: Audit[];
      conflicts: AuditorDoubleBooking[];
      isDoubleBooked: boolean;
    }

    // Helper to detect any auditor double-booked for the same day
    const computeAuditorConflicts = (dateStr: string, cellAudits: Audit[]): AuditorDoubleBooking[] => {
      // 1. All active (non-cancelled) audits scheduled on this date across the facility
      const allDayAudits = audits.filter(
        (a) =>
          a.status !== 'Cancelled' &&
          a.plannedStartDate <= dateStr &&
          a.plannedEndDate >= dateStr
      );

      if (allDayAudits.length < 2 || cellAudits.length === 0) return [];

      const auditorAssignments = new Map<string, { audit: Audit; isLead: boolean }[]>();

      allDayAudits.forEach((audit) => {
        // Lead auditor
        if (audit.leadAuditorId) {
          const list = auditorAssignments.get(audit.leadAuditorId) || [];
          list.push({ audit, isLead: true });
          auditorAssignments.set(audit.leadAuditorId, list);
        }
        // Team auditors
        if (audit.teamAuditorIds) {
          audit.teamAuditorIds.forEach((teamId) => {
            if (teamId && teamId !== audit.leadAuditorId) {
              const list = auditorAssignments.get(teamId) || [];
              list.push({ audit, isLead: false });
              auditorAssignments.set(teamId, list);
            }
          });
        }
      });

      // Only report conflicts that involve an auditor present in this cell's visible audits
      const visibleAuditorIds = new Set<string>();
      cellAudits.forEach((a) => {
        if (a.leadAuditorId) visibleAuditorIds.add(a.leadAuditorId);
        if (a.teamAuditorIds) a.teamAuditorIds.forEach((id) => visibleAuditorIds.add(id));
      });

      const conflicts: AuditorDoubleBooking[] = [];
      auditorAssignments.forEach((assignments, auditorId) => {
        if (assignments.length > 1 && visibleAuditorIds.has(auditorId)) {
          const aud = getAuditorById(auditorId);
          const auditorName = aud ? aud.name : auditorId;
          const conflictingAuditIds = assignments.map((a) => a.audit.id);
          const conflictingAuditNumbers = assignments.map((a) => a.audit.auditNumber);
          const conflictingAuditTitles = assignments.map((a) => a.audit.title);
          const roleList = assignments
            .map((a) => `${a.isLead ? 'Lead' : 'Team'} on ${a.audit.auditNumber}`)
            .join(' & ');

          conflicts.push({
            auditorId,
            auditorName,
            conflictingAuditIds,
            conflictingAuditNumbers,
            conflictingAuditTitles,
            details: `${auditorName} is double-booked on ${assignments.length} audits today (${roleList})`,
          });
        }
      });

      return conflicts;
    };

    const cells: CalendarCell[] = [];

    // Today string (simulated 2026-10-01)
    const todayStr = '2026-10-01';

    // 1. Previous Month Days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const cellDay = new Date(prevYear, prevMonthIdx, d).getDay();
      const isWeekend = cellDay === 0 || cellDay === 6;

      const cellAudits = filteredAudits.filter(
        (a) => a.plannedStartDate <= dateStr && a.plannedEndDate >= dateStr
      );
      const conflicts = computeAuditorConflicts(dateStr, cellAudits);

      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend,
        audits: cellAudits,
        conflicts,
        isDoubleBooked: conflicts.length > 0,
      });
    }

    // 2. Current Month Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const cellDay = new Date(currentYear, currentMonth, d).getDay();
      const isWeekend = cellDay === 0 || cellDay === 6;

      const cellAudits = filteredAudits.filter(
        (a) => a.plannedStartDate <= dateStr && a.plannedEndDate >= dateStr
      );
      const conflicts = computeAuditorConflicts(dateStr, cellAudits);

      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isWeekend,
        audits: cellAudits,
        conflicts,
        isDoubleBooked: conflicts.length > 0,
      });
    }

    // 3. Next Month Days to fill grid to full weeks (35 or 42 cells)
    const totalFilled = cells.length;
    const totalCellsTarget = totalFilled > 35 ? 42 : 35;
    const daysToAdd = totalCellsTarget - totalFilled;

    for (let d = 1; d <= daysToAdd; d++) {
      const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const cellDay = new Date(nextYear, nextMonthIdx, d).getDay();
      const isWeekend = cellDay === 0 || cellDay === 6;

      const cellAudits = filteredAudits.filter(
        (a) => a.plannedStartDate <= dateStr && a.plannedEndDate >= dateStr
      );
      const conflicts = computeAuditorConflicts(dateStr, cellAudits);

      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend,
        audits: cellAudits,
        conflicts,
        isDoubleBooked: conflicts.length > 0,
      });
    }

    return cells;
  }, [currentYear, currentMonth, filteredAudits, audits, getAuditorById]);

  // Month Double-Booked Conflict Days (active in current month)
  const monthConflicts = useMemo(() => {
    return calendarCells.filter((c) => c.isCurrentMonth && c.isDoubleBooked);
  }, [calendarCells]);

  // Auditor conflicts for currently inspected audit
  const inspectConflicts = useMemo(() => {
    if (!inspectAudit) return [];
    return audits.filter((other) => {
      if (other.id === inspectAudit.id || other.status === 'Cancelled') return false;
      const overlaps =
        other.plannedStartDate <= inspectAudit.plannedEndDate &&
        other.plannedEndDate >= inspectAudit.plannedStartDate;
      if (!overlaps) return false;

      const inspectAuditorIds = new Set([
        inspectAudit.leadAuditorId,
        ...inspectAudit.teamAuditorIds,
      ]);
      const otherAuditorIds = [other.leadAuditorId, ...other.teamAuditorIds];
      return otherAuditorIds.some((id) => id && inspectAuditorIds.has(id));
    });
  }, [inspectAudit, audits]);

  // Comprehensive Auditor Workload & Balance Breakdown for Currently Viewed Month
  const auditorWorkloadBreakdown = useMemo(() => {
    const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      lastDayOfMonth
    ).padStart(2, '0')}`;

    // Active audits in month (not cancelled)
    const monthAuditsActive = audits.filter((audit) => {
      if (audit.status === 'Cancelled') return false;
      return (
        audit.plannedStartDate <= monthEndStr &&
        audit.plannedEndDate >= monthStartStr
      );
    });

    // Per-auditor metrics
    const breakdown = auditors.map((auditor) => {
      // Audits where this auditor is Lead
      const leadAudits = monthAuditsActive.filter((a) => a.leadAuditorId === auditor.id);
      // Audits where this auditor is Team Member
      const teamAudits = monthAuditsActive.filter((a) => a.teamAuditorIds.includes(auditor.id));
      const totalAudits = leadAudits.length + teamAudits.length;

      // Calculate total active days on audits this month
      let scheduledDaysCount = 0;
      for (let day = 1; day <= lastDayOfMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
          day
        ).padStart(2, '0')}`;
        const isScheduledOnDay = monthAuditsActive.some(
          (a) =>
            (a.leadAuditorId === auditor.id || a.teamAuditorIds.includes(auditor.id)) &&
            a.plannedStartDate <= dateStr &&
            a.plannedEndDate >= dateStr
        );
        if (isScheduledOnDay) scheduledDaysCount++;
      }

      // Check if this auditor has any double-booking conflict this month
      const hasConflictsInMonth = monthConflicts.some((mc) =>
        mc.conflicts.some((c) => c.auditorId === auditor.id)
      );

      // Workload categorization: Target benchmark is 1-2 audits/month for balanced workload
      let status: 'Underutilized' | 'Balanced' | 'High' | 'Overloaded';
      let statusColor: string;
      let statusBg: string;

      if (hasConflictsInMonth || totalAudits >= 4) {
        status = 'Overloaded';
        statusColor = 'text-rose-400';
        statusBg = 'bg-rose-500/20 border-rose-500/40 text-rose-300';
      } else if (totalAudits === 3) {
        status = 'High';
        statusColor = 'text-amber-400';
        statusBg = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
      } else if (totalAudits >= 1) {
        status = 'Balanced';
        statusColor = 'text-emerald-400';
        statusBg = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
      } else {
        status = 'Underutilized';
        statusColor = 'text-sky-400';
        statusBg = 'bg-sky-500/20 border-sky-500/40 text-sky-300';
      }

      const capacityPercent = Math.min(100, Math.round((totalAudits / 3) * 100));

      return {
        auditor,
        leadAudits,
        teamAudits,
        totalAudits,
        scheduledDaysCount,
        hasConflictsInMonth,
        status,
        statusColor,
        statusBg,
        capacityPercent,
      };
    });

    // Calculate workload balance disparity
    const auditCounts = breakdown.map((b) => b.totalAudits);
    const maxAudits = Math.max(...auditCounts, 0);
    const minAudits = Math.min(...auditCounts, 0);
    const averageAudits =
      breakdown.length > 0
        ? (auditCounts.reduce((acc, c) => acc + c, 0) / breakdown.length).toFixed(1)
        : '0';

    const hasImbalance = maxAudits >= 3 && minAudits === 0;

    return {
      breakdown,
      maxAudits,
      minAudits,
      averageAudits,
      hasImbalance,
      totalAuditsInMonth: monthAuditsActive.length,
    };
  }, [audits, auditors, currentYear, currentMonth, monthConflicts]);

  // Quick Reschedule Handler
  const handleOpenReschedule = (audit: Audit, e: React.MouseEvent) => {
    e.stopPropagation();
    setRescheduleAuditTarget(audit);
    setRescheduleStart(audit.plannedStartDate);
    setRescheduleEnd(audit.plannedEndDate);
  };

  const handleSaveReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleAuditTarget) return;
    if (rescheduleStart > rescheduleEnd) {
      alert('Planned End Date cannot be earlier than Planned Start Date.');
      return;
    }
    DbService.rescheduleAudit(
      rescheduleAuditTarget.id,
      rescheduleStart,
      rescheduleEnd,
      currentUser.fullName
    );
    triggerDataRefresh();
    if (inspectAudit && inspectAudit.id === rescheduleAuditTarget.id) {
      setInspectAudit({
        ...inspectAudit,
        plannedStartDate: rescheduleStart,
        plannedEndDate: rescheduleEnd,
      });
    }
    setRescheduleAuditTarget(null);
  };

  // Drag and Drop Rescheduling Handlers
  const handleDragStart = (e: React.DragEvent, audit: Audit) => {
    if (!canPerform('manage_audits')) {
      e.preventDefault();
      return;
    }
    setDraggingAudit(audit);
    e.dataTransfer.setData('text/plain', audit.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingAudit(null);
    setDragOverDate(null);
  };

  const handleCellDragOver = (e: React.DragEvent, dateStr: string) => {
    if (!canPerform('manage_audits')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleCellDragLeave = (e: React.DragEvent, dateStr: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverDate === dateStr) {
      setDragOverDate(null);
    }
  };

  const handleCellDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);

    const auditId = e.dataTransfer.getData('text/plain') || draggingAudit?.id;
    if (!auditId) {
      setDraggingAudit(null);
      return;
    }

    const auditToMove = audits.find((a) => a.id === auditId);
    if (!auditToMove) {
      setDraggingAudit(null);
      return;
    }

    // Check if dropping on the exact same start date
    if (auditToMove.plannedStartDate === targetDateStr) {
      setDraggingAudit(null);
      return;
    }

    // Preserve duration (multi-day audit window)
    const oldStartMs = new Date(auditToMove.plannedStartDate + 'T00:00:00').getTime();
    const oldEndMs = new Date(auditToMove.plannedEndDate + 'T00:00:00').getTime();
    const durationDays = Math.max(0, Math.round((oldEndMs - oldStartMs) / 86400000));

    const newStart = targetDateStr;
    const newEndMs = new Date(targetDateStr + 'T00:00:00').getTime() + durationDays * 86400000;
    const newEnd = new Date(newEndMs).toISOString().split('T')[0];

    // Execute reschedule in database
    DbService.rescheduleAudit(
      auditToMove.id,
      newStart,
      newEnd,
      currentUser.fullName
    );

    // Refresh context data (automatically re-queries DB and re-triggers conflict detection)
    triggerDataRefresh();

    // Check if this move creates double-booking on target dates
    const assignedAuditorIds = new Set([
      auditToMove.leadAuditorId,
      ...auditToMove.teamAuditorIds,
    ]);

    const otherAuditsOnTarget = audits.filter(
      (a) =>
        a.id !== auditToMove.id &&
        a.status !== 'Cancelled' &&
        a.plannedStartDate <= newEnd &&
        a.plannedEndDate >= newStart &&
        [a.leadAuditorId, ...a.teamAuditorIds].some((id) => assignedAuditorIds.has(id))
    );

    const hasNewConflict = otherAuditsOnTarget.length > 0;
    const conflictingAuditor = hasNewConflict
      ? getAuditorById(
          [auditToMove.leadAuditorId, ...auditToMove.teamAuditorIds].find((id) =>
            otherAuditsOnTarget.some((a) => a.leadAuditorId === id || a.teamAuditorIds.includes(id))
          ) || ''
        )?.name
      : undefined;

    setRescheduleToast({
      auditNumber: auditToMove.auditNumber,
      auditTitle: auditToMove.title,
      oldDates: `${auditToMove.plannedStartDate} → ${auditToMove.plannedEndDate}`,
      newDates: `${newStart} → ${newEnd}`,
      hasConflict: hasNewConflict,
      conflictAuditorName: conflictingAuditor,
    });

    if (inspectAudit && inspectAudit.id === auditToMove.id) {
      setInspectAudit({
        ...inspectAudit,
        plannedStartDate: newStart,
        plannedEndDate: newEnd,
      });
    }

    setDraggingAudit(null);
  };

  const handleUndoDrag = () => {
    if (!rescheduleToast) return;
    const audit = audits.find((a) => a.auditNumber === rescheduleToast.auditNumber);
    if (!audit) return;
    const [revertStart, revertEnd] = rescheduleToast.oldDates.split(' → ');
    DbService.rescheduleAudit(audit.id, revertStart, revertEnd, currentUser.fullName);
    triggerDataRefresh();
    setRescheduleToast(null);
  };

  // Day Cell Click to Schedule
  const handleDayClick = (dateStr: string) => {
    setPrefilledDate(dateStr);
    setShowScheduleModal(true);
  };

  // Check if visibility is customized from all visible
  const isVisibilityCustomized =
    isVisibilityInitialized &&
    ((standards.length > 0 && enabledStandards.size < standards.length) ||
      (auditors.length > 0 && enabledAuditorIds.size < auditors.length) ||
      enabledStandards.size === 0 ||
      enabledAuditorIds.size === 0);

  // Reset all filters including visibility
  const handleResetFilters = () => {
    setSelectedStandard('All');
    setSelectedAuditorId('All');
    setSelectedPlantSite('All');
    setAuditorRoleMode('All');
    setStatusFilter('All');
    setSearchQuery('');
    handleResetVisibility();
  };

  const isAnyFilterActive =
    selectedStandard !== 'All' ||
    selectedAuditorId !== 'All' ||
    selectedPlantSite !== 'All' ||
    statusFilter !== 'All' ||
    searchQuery.trim().length > 0 ||
    isVisibilityCustomized;

  // New Audit Form State
  const [newAuditData, setNewAuditData] = useState<Partial<Audit>>({
    title: '',
    auditType: 'HSE Audit',
    site: 'Baytown Refinery Complex',
    department: 'Refinery Operations',
    area: '',
    process: '',
    standardIds: ['ISO 45001'],
    criteria: 'ISO 45001 & Industrial PSM Specifications',
    leadAuditorId: auditors[0]?.id || 'aud-1',
    teamAuditorIds: [],
    plannedStartDate: prefilledDate || '2026-10-05',
    plannedEndDate: prefilledDate || '2026-10-08',
    riskLikelihood: 3,
    riskConsequence: 4,
    priority: 'High',
    status: 'Planned',
    scope: 'Verification of operational controls and procedural conformance.',
    objectives: 'Verify adherence to ISO standards and statutory risk mitigations.',
  });

  // Keep form dates updated when prefilledDate changes
  useEffect(() => {
    if (prefilledDate) {
      const end = new Date(new Date(prefilledDate).getTime() + 3 * 86400000)
        .toISOString()
        .split('T')[0];
      setNewAuditData((prev) => ({
        ...prev,
        plannedStartDate: prefilledDate,
        plannedEndDate: end,
      }));
    }
  }, [prefilledDate]);

  const handleSaveNewAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditData.title) {
      alert('Please provide an audit title');
      return;
    }
    DbService.saveAudit(newAuditData, currentUser.fullName);
    setShowScheduleModal(false);
    triggerDataRefresh();
  };

  const auditTypes: AuditType[] = [
    'HSE Audit',
    'Process Audit',
    'Quality Audit',
    'Environmental Audit',
    'Operational Audit',
    'Compliance Audit',
    'Internal Audit',
    'Contractor Audit',
    'Management System Audit',
  ];

  return (
    <div
      className={`calendar-print-root transition-all duration-200 flex flex-col ${
        isFullScreen
          ? 'fixed inset-0 z-50 bg-slate-950 p-5 md:p-6 overflow-y-auto text-slate-100'
          : 'space-y-4'
      }`}
    >
      {/* On-screen Print Preparation Feedback Banner */}
      {printFeedback && (
        <div className="no-print bg-amber-400 text-slate-950 px-4 py-2.5 rounded font-semibold text-xs flex items-center justify-between shadow-lg border border-amber-500">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-950 animate-bounce" />
            <span>{printFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setPrintFeedback(null)}
            className="p-1 hover:bg-amber-500/40 rounded text-slate-950 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Reschedule Toast / Feedback after Drag-and-Drop */}
      {rescheduleToast && (
        <div
          className={`no-print px-4 py-2.5 rounded font-medium text-xs flex items-center justify-between shadow-xl border transition-all ${
            rescheduleToast.hasConflict
              ? 'bg-rose-950/95 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
              : 'bg-emerald-950/95 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {rescheduleToast.hasConflict ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-amber-400">{rescheduleToast.auditNumber}</span>
                <span>Rescheduled to {rescheduleToast.newDates}</span>
                {rescheduleToast.hasConflict ? (
                  <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/50">
                    Conflict Warning
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/50">
                    Database Updated
                  </span>
                )}
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">
                {rescheduleToast.hasConflict
                  ? `Auditor ${rescheduleToast.conflictAuditorName || 'Assigned Lead'} is now double-booked on this date window. Red conflict indicators updated on calendar.`
                  : `Successfully moved from ${rescheduleToast.oldDates}. Conflict detection re-evaluated with 0 conflicts.`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUndoDrag}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-mono transition-colors flex items-center gap-1"
              title="Revert audit back to previous dates"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo Move</span>
            </button>
            <button
              type="button"
              onClick={() => setRescheduleToast(null)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Official Facility Distribution Document Header (Print Only) */}
      <div className="print-only border-b-2 border-slate-900 pb-3 mb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-700 uppercase font-mono">
              {settings.companyName || 'ISO System (IMS)'}
            </div>
            <h1 className="text-xl font-extrabold text-slate-950 tracking-tight font-display mt-0.5">
              MONTHLY INDUSTRIAL AUDIT SCHEDULE — {formattedMonthYear.toUpperCase()}
            </h1>
            <div className="text-xs text-slate-700 font-medium mt-1">
              Facility Operations Compliance Governance · ISO 19011:2018 Management Framework
            </div>
          </div>
          <div className="text-right text-[11px] font-mono text-slate-700 space-y-0.5">
            <div>
              <strong>Doc ID:</strong> SCH-{currentYear}-{String(currentMonth + 1).padStart(2, '0')}-FAC
            </div>
            <div>
              <strong>Facility / Complex:</strong>{' '}
              {selectedPlantSite !== 'All' ? selectedPlantSite : (settings.facilityName || 'All Plant Complexes')}
            </div>
            <div>
              <strong>Generated:</strong>{' '}
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div>
              <strong>Classification:</strong> Official Internal Distribution
            </div>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-700">
          <div>
            <strong>Target Distribution:</strong> Facility Operations Leads, Unit Area Superintendents, HSE Managers, Plant Maintenance Directors
          </div>
          <div className="font-mono text-right">
            <strong>Audits Scheduled:</strong> {monthAudits.length}
            {enabledStandards.size < standards.length && (
              <span> · Standards: {Array.from(enabledStandards).join(', ') || 'None'}</span>
            )}
            {enabledAuditorIds.size < auditors.length && (
              <span> · Auditors: {Array.from(enabledAuditorIds).map((id) => getAuditorById(id)?.name.split(' ')[0] || id).join(', ') || 'None'}</span>
            )}
            {selectedStandard !== 'All' && ` · Std: ${selectedStandard}`}
            {selectedAuditorId !== 'All' &&
              ` · Lead: ${getAuditorById(selectedAuditorId)?.name || selectedAuditorId}`}
            {selectedPlantSite !== 'All' && ` · Site: ${selectedPlantSite}`}
          </div>
        </div>

        {/* Executive Print KPI Summary Strip */}
        <div className="mt-2.5 grid grid-cols-5 gap-2 border-t border-slate-300 pt-2 text-[10px] font-mono">
          <div className="bg-slate-100 p-1.5 rounded border border-slate-300">
            <span className="text-slate-600 block">Total Audits</span>
            <strong className="text-slate-950 text-xs">{monthStats.total} Scheduled</strong>
          </div>
          <div className="bg-slate-100 p-1.5 rounded border border-slate-300">
            <span className="text-slate-600 block">Planned / Active</span>
            <strong className="text-slate-950 text-xs">{monthStats.plannedCount} Planned · {monthStats.inProgressCount} Active</strong>
          </div>
          <div className="bg-slate-100 p-1.5 rounded border border-slate-300">
            <span className="text-slate-600 block">Completed</span>
            <strong className="text-emerald-800 text-xs">{monthStats.completedCount} Completed</strong>
          </div>
          <div className="bg-slate-100 p-1.5 rounded border border-slate-300">
            <span className="text-slate-600 block">Plant Facilities</span>
            <strong className="text-slate-950 text-xs">{Object.keys(monthStats.sitesCount).length} Facilities</strong>
          </div>
          <div className="bg-slate-100 p-1.5 rounded border border-slate-300">
            <span className="text-slate-600 block">ISO Standards</span>
            <strong className="text-slate-950 text-xs">{Object.keys(monthStats.standardsCount).length} Standards</strong>
          </div>
        </div>

        {/* Print Standard Color Legend */}
        <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3 text-[10px]">
          <span className="font-bold text-slate-800 font-mono">ISO Standards Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-600 inline-block"></span>
            <span className="text-slate-700">ISO 9001 (Quality)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block"></span>
            <span className="text-slate-700">ISO 14001 (Environmental)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 inline-block"></span>
            <span className="text-slate-700">ISO 45001 (H&S)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block"></span>
            <span className="text-slate-700">ISO 50001 (Energy)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-600 inline-block"></span>
            <span className="text-slate-700">ISO 55001 (Assets)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-600 inline-block"></span>
            <span className="text-slate-700">PSM Procedures</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block"></span>
            <span className="text-slate-700">Regulatory</span>
          </div>
        </div>
      </div>

      {/* ================= CALENDAR TOP CONTROL BAR ================= */}
      <div className="no-print flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        {/* Left: Title & Month Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
                  Industrial Audit Planning Calendar
                </h1>
                {isFullScreen && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    FULL-SCREEN VIEW
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Visualizing schedules across ISO Standards, Lead Auditors, and Plant Sites
              </p>
            </div>
          </div>

          {/* Month Switcher Controls */}
          <div className="flex items-center gap-1.5 ml-0 md:ml-4 bg-slate-900 border border-slate-800 rounded p-1">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick Month & Year Pickers */}
            <select
              value={currentMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-white px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx} className="bg-slate-900 text-white">
                  {name}
                </option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="bg-transparent text-xs font-mono font-semibold text-white px-2 py-0.5 focus:outline-none cursor-pointer border-l border-slate-800"
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr} className="bg-slate-900 text-white font-mono">
                  {yr}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleGoToToday}
              className="px-2 py-0.5 text-[11px] font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded transition-colors ml-1 border-l border-slate-800"
              title="Jump to Current Month (October 2026)"
            >
              Today
            </button>
          </div>
        </div>

        {/* Right: Actions & View Toggles */}
        <div className="flex items-center gap-2">
          {/* Pre-Print Filter Dropdown Menu: Toggle visibility of audits by ISO standard or auditor */}
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => setIsFilterMenuOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-all shadow-sm ${
                isFilterMenuOpen || isVisibilityCustomized
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 ring-1 ring-amber-500/30'
                  : 'text-slate-100 bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-amber-400'
              }`}
              title="Filter Visibility: Toggle visibility of audits by specific ISO standard or auditor before printing"
            >
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Filter Visibility</span>
              {isVisibilityCustomized && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400 text-slate-950">
                  {enabledStandards.size}/{standards.length} std
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  isFilterMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Panel */}
            {isFilterMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden text-xs">
                {/* Dropdown Header */}
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Filter className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-white leading-tight">Audit Visibility Filters</div>
                      <div className="text-[10px] text-slate-400">
                        Toggle visibility before printing or reviewing
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFilterMenuOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Close filter menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Bar */}
                <div className="px-3 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">
                    Visible Audits: <strong className="text-amber-400 font-mono font-bold">{monthAudits.length}</strong> in {formattedMonthYear}
                  </span>
                  {isVisibilityCustomized && (
                    <button
                      type="button"
                      onClick={handleResetVisibility}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Sub-Tabs: Standards vs Auditors */}
                <div className="grid grid-cols-2 bg-slate-950/70 border-b border-slate-800 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterMenuTab('standards')}
                    className={`py-1.5 px-2 rounded font-semibold text-center transition-colors flex items-center justify-center gap-1.5 ${
                      filterMenuTab === 'standards'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>ISO Standards ({enabledStandards.size}/{standards.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterMenuTab('auditors')}
                    className={`py-1.5 px-2 rounded font-semibold text-center transition-colors flex items-center justify-center gap-1.5 ${
                      filterMenuTab === 'auditors'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Auditors ({enabledAuditorIds.size}/{auditors.length})</span>
                  </button>
                </div>

                {/* Tab 1: ISO Standards List */}
                {filterMenuTab === 'standards' && (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800/60">
                      <span>Toggle ISO standards to display on calendar</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={handleSelectAllStandards}
                          className="text-amber-400 hover:underline font-mono"
                        >
                          Select All
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={handleClearAllStandards}
                          className="text-slate-400 hover:text-slate-200 font-mono"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {standards.map((std) => {
                        const isEnabled = enabledStandards.has(std.code);
                        const count = auditCountByStandard[std.code] || 0;
                        const stdStyle = STANDARD_STYLES[std.code] || {
                          bar: 'bg-slate-500',
                          border: 'border-slate-700',
                          text: 'text-slate-300',
                          bg: 'bg-slate-900',
                        };

                        return (
                          <div
                            key={std.id}
                            onClick={() => toggleStandard(std.code)}
                            className={`flex items-center justify-between p-2 rounded border cursor-pointer select-none transition-colors ${
                              isEnabled
                                ? 'bg-slate-800/70 border-slate-700 hover:border-slate-600'
                                : 'bg-slate-950/50 border-slate-800/50 opacity-40 hover:opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => {}}
                                className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer pointer-events-none"
                              />
                              <span className={`w-2 h-4 rounded-sm ${stdStyle.bar} shrink-0`} />
                              <div className="min-w-0">
                                <div className="font-mono font-bold text-white text-xs truncate">
                                  {std.code}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {std.title}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                                count > 0
                                  ? 'bg-amber-400/10 text-amber-300 font-bold border border-amber-400/30'
                                  : 'text-slate-500 bg-slate-900'
                              }`}
                            >
                              {count} {count === 1 ? 'audit' : 'audits'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab 2: Auditors List */}
                {filterMenuTab === 'auditors' && (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800/60">
                      <span>Toggle auditor assignments to display on calendar</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={handleSelectAllAuditors}
                          className="text-amber-400 hover:underline font-mono"
                        >
                          Select All
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={handleClearAllAuditors}
                          className="text-slate-400 hover:text-slate-200 font-mono"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {auditors.map((aud) => {
                        const isEnabled = enabledAuditorIds.has(aud.id);
                        const count = auditCountByAuditor[aud.id] || 0;

                        return (
                          <div
                            key={aud.id}
                            onClick={() => toggleAuditor(aud.id)}
                            className={`flex items-center justify-between p-2 rounded border cursor-pointer select-none transition-colors ${
                              isEnabled
                                ? 'bg-slate-800/70 border-slate-700 hover:border-slate-600'
                                : 'bg-slate-950/50 border-slate-800/50 opacity-40 hover:opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => {}}
                                className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer pointer-events-none"
                              />
                              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                                {aud.name.split(' ').map((n) => n[0]).join('')}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-white text-xs truncate flex items-center gap-1.5">
                                  <span>{aud.name}</span>
                                  {aud.isLead && (
                                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      LEAD
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {aud.department} · {aud.qualification}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                                count > 0
                                  ? 'bg-amber-400/10 text-amber-300 font-bold border border-amber-400/30'
                                  : 'text-slate-500 bg-slate-900'
                              }`}
                            >
                              {count} {count === 1 ? 'audit' : 'audits'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dropdown Footer Actions */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleResetVisibility}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Reset All
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFilterMenuOpen(false);
                        handlePrintToPdf();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-sm"
                      title="Print this filtered view to PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Filtered</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFilterMenuOpen(false)}
                      className="px-3 py-1.5 rounded text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Print to PDF (Browser Print Functionality) */}
          <button
            onClick={handlePrintToPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 transition-colors shadow-sm"
            title="Print to PDF: Export complete industrial audit calendar for facility distribution"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print to PDF</span>
          </button>

          {/* Toggle Facility Leads Roster preview */}
          <button
            type="button"
            onClick={() => setShowFacilityRoster((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors ${
              showFacilityRoster
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800 hover:bg-slate-800'
            }`}
            title="Toggle Facility Leads Roster Table preview on screen"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">
              {showFacilityRoster ? 'Hide Roster' : 'Facility Roster'}
            </span>
          </button>

          {/* Toggle Auditor Workload breakdown panel */}
          <button
            type="button"
            onClick={() => setShowWorkloadPanel((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors ${
              showWorkloadPanel
                ? 'bg-sky-500/10 text-sky-300 border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800 hover:bg-slate-800'
            }`}
            title="Toggle Auditor Workload & Balance Breakdown Summary Panel"
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">
              {showWorkloadPanel ? 'Hide Workload' : 'Auditor Workload'}
            </span>
          </button>

          {/* Quick Excel Export of this Month */}
          <button
            onClick={() => ExcelService.exportAudits(monthAudits, 'xlsx')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
            title="Export this month's scheduled audits to Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Export to iCal (.ics) for Outlook / Google Calendar */}
          <button
            type="button"
            onClick={() => {
              ICalGenerator.exportMultipleAudits(
                monthAudits,
                auditors,
                `petroapex-audits-${formattedMonthYear.toLowerCase().replace(/\s+/g, '-')}`
              );
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/60 rounded transition-colors"
            title="Export to iCal (.ics): Download calendar for Microsoft Outlook, Microsoft 365, or Google Calendar"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Export iCal (.ics)</span>
          </button>

          {/* Schedule New Audit Button */}
          {canPerform('manage_audits') && (
            <button
              onClick={() => {
                setPrefilledDate('2026-10-05');
                setShowScheduleModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Audit</span>
            </button>
          )}

          {/* Full Screen Toggle Button */}
          <button
            onClick={toggleFullScreen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              isFullScreen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
            }`}
            title={isFullScreen ? 'Exit Full Screen Mode (Esc)' : 'Expand to Full Screen Calendar'}
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= MULTI-DIMENSION FILTER BAR ================= */}
      <div className="no-print bg-slate-900/80 border border-slate-800 rounded p-3 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Dimension 1: ISO Standard Filter */}
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span>ISO Standard</span>
            </label>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All ISO Standards ({standards.length})</option>
              {standards.map((std) => (
                <option key={std.id} value={std.code}>
                  {std.code} - {std.category}
                </option>
              ))}
            </select>
          </div>

          {/* Dimension 2: Auditor Filter & Role Mode */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Auditor</span>
              </label>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setAuditorRoleMode('All')}
                  className={`px-1 py-0.5 rounded ${
                    auditorRoleMode === 'All' ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Any
                </button>
                <span className="text-slate-700">·</span>
                <button
                  type="button"
                  onClick={() => setAuditorRoleMode('Lead')}
                  className={`px-1 py-0.5 rounded ${
                    auditorRoleMode === 'Lead' ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Lead
                </button>
                <span className="text-slate-700">·</span>
                <button
                  type="button"
                  onClick={() => setAuditorRoleMode('Team')}
                  className={`px-1 py-0.5 rounded ${
                    auditorRoleMode === 'Team' ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Team
                </button>
              </div>
            </div>
            <select
              value={selectedAuditorId}
              onChange={(e) => setSelectedAuditorId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Auditors ({auditors.length})</option>
              {auditors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.isLead ? 'Lead' : 'Auditor'})
                </option>
              ))}
            </select>
          </div>

          {/* Dimension 3: Plant Site Filter */}
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Plant Site / Facility</span>
            </label>
            <select
              value={selectedPlantSite}
              onChange={(e) => setSelectedPlantSite(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Plant Sites ({plantSites.length})</option>
              {plantSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>

          {/* Status & Search */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-slate-400 font-medium mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="All">All Statuses</option>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-slate-400 font-medium mb-1">Search</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Unit, title, AUD#..."
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-2 py-1.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Indicators & Quick Clear */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-400">
            <span className="font-medium text-slate-300">
              Showing <strong className="text-white font-mono">{monthAudits.length}</strong> audits in {formattedMonthYear}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Total filtered: <strong className="text-white font-mono">{filteredAudits.length}</strong></span>

            {isAnyFilterActive && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-amber-400 font-mono text-[11px]">Filters applied</span>
              </>
            )}

            {isVisibilityCustomized && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMenuTab('standards');
                    setIsFilterMenuOpen(true);
                  }}
                  className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 font-mono text-[11px] flex items-center gap-1 transition-colors"
                  title="Click to adjust ISO standards or auditor visibility before printing"
                >
                  <Filter className="w-3 h-3 text-amber-400" />
                  <span>
                    Visibility: {enabledStandards.size}/{standards.length} std · {enabledAuditorIds.size}/{auditors.length} aud
                  </span>
                </button>
              </>
            )}

            <span aria-hidden="true" className="text-slate-600 hidden md:inline">·</span>
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline-flex items-center gap-1">
              <Move className="w-3 h-3 text-amber-400" />
              <span>Drag & drop cards to reschedule</span>
            </span>
          </div>

          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= MONTH SUMMARY & WORKLOAD METRICS STRIP ================= */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 rounded p-2.5">
          <div className="text-[11px] text-slate-400">Total Month Audits</div>
          <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
            {monthStats.total}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-2.5">
          <div className="text-[11px] text-slate-400">Planned / In Progress</div>
          <div className="text-lg font-bold text-amber-400 font-mono tabular-nums mt-0.5">
            {monthStats.plannedCount} <span className="text-xs text-slate-500 font-normal">/ {monthStats.inProgressCount}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-2.5">
          <div className="text-[11px] text-slate-400">Completed This Month</div>
          <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
            {monthStats.completedCount}
          </div>
        </div>

        {/* Scheduling Conflicts KPI card with immediate red highlight if conflicts exist */}
        <div
          onClick={() => {
            if (monthConflicts.length > 0) {
              handleDayClick(monthConflicts[0].dateStr);
            }
          }}
          className={`border rounded p-2.5 transition-all ${
            monthConflicts.length > 0
              ? 'bg-rose-950/60 border-rose-500/80 hover:bg-rose-950/80 cursor-pointer shadow-sm ring-1 ring-rose-500/40'
              : 'bg-slate-900/60 border-slate-800'
          }`}
          title={
            monthConflicts.length > 0
              ? 'Click to inspect the first scheduling conflict date'
              : 'No auditor double-bookings in this month'
          }
        >
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Scheduling Conflicts</span>
            {monthConflicts.length > 0 && (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            )}
          </div>
          <div
            className={`text-lg font-bold font-mono tabular-nums mt-0.5 flex items-baseline gap-1.5 ${
              monthConflicts.length > 0 ? 'text-rose-400' : 'text-slate-500'
            }`}
          >
            {monthConflicts.length}
            <span className="text-xs font-normal text-slate-400">
              {monthConflicts.length === 1 ? 'conflict day' : 'conflict days'}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded p-2.5 col-span-2 lg:col-span-2 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="shrink-0">
            <div className="text-[11px] text-slate-400">Site Distribution</div>
            <div className="flex items-center gap-2 mt-1">
              {Object.entries(monthStats.sitesCount).slice(0, 2).map(([s, count]) => (
                <span key={s} className="text-[11px] font-mono text-slate-300">
                  <strong className="text-white">{SITE_ABBREVIATIONS[s] || s}:</strong> {count}
                </span>
              ))}
              {Object.keys(monthStats.sitesCount).length === 0 && (
                <span className="text-[11px] text-slate-500">None in month</span>
              )}
            </div>
          </div>

          <div className="shrink-0 border-l border-slate-800 pl-3">
            <div className="text-[11px] text-slate-400">Standard Distribution</div>
            <div className="flex items-center gap-2 mt-1">
              {Object.entries(monthStats.standardsCount).slice(0, 2).map(([std, count]) => (
                <span key={std} className="text-[11px] font-mono text-slate-300">
                  <strong className="text-amber-400">{std.replace('ISO ', '')}:</strong> {count}
                </span>
              ))}
              {Object.keys(monthStats.standardsCount).length === 0 && (
                <span className="text-[11px] text-slate-500">None</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= SCHEDULING CONFLICT ALERT BANNER ================= */}
      {monthConflicts.length > 0 && (
        <div className="no-print bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/70 border-2 border-rose-500/80 rounded-lg p-3 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ring-1 ring-rose-500/40">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 border border-rose-500/50">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <span>Auditor Scheduling Conflict Detected</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 font-mono text-[10px] font-bold border border-rose-500/50">
                  {monthConflicts.length} {monthConflicts.length === 1 ? 'Day Double-Booked' : 'Days Double-Booked'}
                </span>
              </div>
              <div className="text-[11px] text-rose-200/90 mt-0.5">
                One or more auditors are assigned to overlapping audits for the same calendar day (highlighted in red below). Click any conflicting audit card to reschedule dates or resolve resource bottlenecks.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleDayClick(monthConflicts[0].dateStr)}
              className="px-3 py-1.5 rounded bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 border border-rose-500/70 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Jump to first conflict date"
            >
              <span>Inspect {monthConflicts[0].dateStr}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ================= 7-DAY MONTHLY CALENDAR GRID ================= */}
      <div className="calendar-print-grid bg-slate-900 border border-slate-800 rounded overflow-hidden shadow-lg flex-1 flex flex-col min-h-[580px]">
        {/* Days of the Week Header */}
        <div className="calendar-print-header-row grid grid-cols-7 border-b border-slate-800 bg-slate-950/60 text-center font-mono text-xs font-semibold py-2">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((dayName, idx) => (
            <div
              key={dayName}
              className={`calendar-print-header-cell tracking-wider ${idx >= 5 ? 'text-slate-500' : 'text-slate-300'}`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Day Matrix */}
        <div className="calendar-print-matrix grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-slate-800/80 bg-slate-950/40">
          {calendarCells.map((cell, idx) => {
            const isToday = cell.isToday;
            const hasAudits = cell.audits.length > 0;
            const isDoubleBooked = cell.isDoubleBooked;

            return (
              <div
                key={cell.dateStr + '-' + idx}
                onClick={() => handleDayClick(cell.dateStr)}
                onDragOver={(e) => handleCellDragOver(e, cell.dateStr)}
                onDragEnter={(e) => handleCellDragOver(e, cell.dateStr)}
                onDragLeave={(e) => handleCellDragLeave(e, cell.dateStr)}
                onDrop={(e) => handleCellDrop(e, cell.dateStr)}
                className={`calendar-print-cell group relative flex flex-col p-1.5 min-h-[110px] transition-all cursor-pointer ${
                  dragOverDate === cell.dateStr
                    ? 'ring-2 ring-amber-400 bg-amber-500/20 border-2 border-amber-400 shadow-xl scale-[1.01] z-10'
                    : isDoubleBooked
                    ? 'is-double-booked bg-rose-950/40 hover:bg-rose-950/60 border-2 border-rose-500/90 shadow-[inset_0_0_14px_rgba(244,63,94,0.22)] ring-1 ring-rose-500/50'
                    : cell.isCurrentMonth
                    ? cell.isWeekend
                      ? 'bg-slate-950/50 hover:bg-slate-900/60'
                      : 'bg-slate-900/20 hover:bg-slate-900/70'
                    : 'is-outside-month bg-slate-950/90 opacity-40 hover:opacity-70'
                } ${isToday && dragOverDate !== cell.dateStr ? (isDoubleBooked ? 'ring-2 ring-amber-400' : 'ring-1 ring-amber-500/70 bg-amber-500/5') : ''}`}
              >
                {/* Drag Over Active Target Dropzone Banner */}
                {dragOverDate === cell.dateStr && draggingAudit && (
                  <div className="no-print my-1 py-1 px-1.5 rounded bg-amber-400 text-slate-950 text-[10px] font-mono font-bold flex items-center justify-center gap-1 shadow-md animate-pulse">
                    <Move className="w-3 h-3 text-slate-950" />
                    <span>Drop to move {draggingAudit.auditNumber}</span>
                  </div>
                )}
                {/* Cell Header: Day Number & Affordances */}
                <div className="flex items-center justify-between mb-1 select-none">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-xs font-mono tabular-nums leading-none ${
                        isDoubleBooked
                          ? 'px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold shadow-sm'
                          : isToday
                          ? 'px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold'
                          : cell.isCurrentMonth
                          ? 'font-semibold text-slate-200'
                          : 'text-slate-600'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-tight hidden sm:inline">
                        TODAY
                      </span>
                    )}
                    {isDoubleBooked && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-500/60 text-[9px] font-mono font-bold tracking-tight animate-pulse"
                        title={cell.conflicts.map((c) => c.details).join(' | ')}
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                        <span className="hidden sm:inline">CONFLICT</span>
                        <span className="sm:hidden font-bold">!</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {hasAudits && (
                      <span
                        className={`text-[10px] font-mono tabular-nums px-1 rounded ${
                          isDoubleBooked
                            ? 'bg-rose-500/30 text-rose-200 font-bold border border-rose-500/40'
                            : 'bg-slate-800/80 text-slate-400'
                        }`}
                      >
                        {cell.audits.length}
                      </span>
                    )}
                    {/* Add Schedule Button on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrefilledDate(cell.dateStr);
                        setShowScheduleModal(true);
                      }}
                      className="no-print opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-opacity"
                      title={`Schedule audit on ${cell.dateStr}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Double-Booking Conflict Alert Strip inside cell */}
                {isDoubleBooked && (
                  <div
                    className="no-print mb-1 px-1.5 py-1 rounded bg-rose-950/90 border border-rose-500/70 text-[10px] text-rose-200 flex flex-col gap-0.5 shadow-sm"
                    title={cell.conflicts.map((c) => c.details).join('\n')}
                  >
                    <div className="flex items-center justify-between font-semibold leading-tight text-rose-300">
                      <div className="flex items-center gap-1 min-w-0">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                        <span className="truncate">
                          Double-Booked: {cell.conflicts.map((c) => c.auditorName.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] px-1 rounded bg-rose-500/40 text-rose-100 shrink-0 font-bold">
                        {cell.conflicts.length}
                      </span>
                    </div>
                    <div className="text-[9px] text-rose-300/90 truncate font-mono">
                      {cell.conflicts.map((c) => c.details).join(' • ')}
                    </div>
                  </div>
                )}

                {/* Day Audit Cards Container */}
                <div className="calendar-print-cell-audits flex-1 space-y-1 overflow-y-auto max-h-[140px] pr-0.5">
                  {cell.audits.map((audit) => {
                    const leadAud = getAuditorById(audit.leadAuditorId);
                    const stdStyle = getStandardStyle(audit.standardIds);
                    const siteShort = SITE_ABBREVIATIONS[audit.site || ''] || audit.site || 'Plant';
                    const isStart = cell.dateStr === audit.plannedStartDate;
                    const isEnd = cell.dateStr === audit.plannedEndDate;

                    // Check if this audit participates in the double-booking conflict
                    const isConflictingAudit = cell.conflicts.some(
                      (c) =>
                        c.conflictingAuditIds.includes(audit.id) ||
                        c.auditorId === audit.leadAuditorId ||
                        audit.teamAuditorIds.includes(c.auditorId)
                    );

                    return (
                      <div
                        key={audit.id + '-' + cell.dateStr}
                        data-standard={audit.standardIds.join(' ')}
                        draggable={canPerform('manage_audits')}
                        onDragStart={(e) => handleDragStart(e, audit)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectAudit(audit);
                        }}
                        className={`calendar-print-card text-[11px] p-1.5 rounded border transition-all cursor-pointer shadow-sm relative overflow-hidden group/item ${
                          draggingAudit?.id === audit.id
                            ? 'opacity-40 scale-95 border-dashed border-amber-400 bg-amber-500/10'
                            : isConflictingAudit
                            ? 'is-conflict-card border-rose-500/80 bg-rose-950/60 ring-1 ring-rose-500/40 hover:border-rose-400'
                            : `${stdStyle.border} ${stdStyle.bg} hover:border-amber-400`
                        } ${canPerform('manage_audits') ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        title={
                          canPerform('manage_audits')
                            ? `Click to view or drag to reschedule ${audit.auditNumber}`
                            : `Click to inspect ${audit.auditNumber}`
                        }
                      >
                        {/* Colored Left Accent Bar (rose if in conflict) */}
                        <div
                          className={`print-bar absolute left-0 top-0 bottom-0 w-1 ${
                            isConflictingAudit ? 'bg-rose-500' : stdStyle.bar
                          }`}
                        />

                        {/* Conflict warning pill on conflicting audit card */}
                        {isConflictingAudit && (
                          <div className="no-print pl-1 mb-1 flex items-center justify-between text-[9px] text-rose-300 font-mono font-bold bg-rose-900/50 rounded px-1 py-0.5 border border-rose-500/40">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                              <span>DOUBLE-BOOKED</span>
                            </span>
                            {canPerform('manage_audits') && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenReschedule(audit, e)}
                                className="hover:underline text-amber-300 font-semibold"
                                title="Reschedule audit to resolve conflict"
                              >
                                Reschedule
                              </button>
                            )}
                          </div>
                        )}

                        {/* Top row: Standard & Audit Number */}
                        <div className="pl-1 flex items-center justify-between gap-1 leading-tight">
                          <div className="flex items-center gap-1 min-w-0">
                            {canPerform('manage_audits') && (
                              <GripVertical className="no-print w-2.5 h-2.5 text-slate-500 group-hover/item:text-amber-400 shrink-0 cursor-grab" />
                            )}
                            <span className={`print-standard-tag font-mono font-bold text-[10px] ${stdStyle.text} truncate`}>
                              {stdStyle.label}
                            </span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400 truncate">
                            {audit.auditNumber}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="pl-1 text-white font-medium truncate mt-0.5 text-[11px]">
                          {audit.title}
                        </div>

                        {/* Plant Site & Lead Auditor */}
                        <div className="pl-1 flex items-center justify-between gap-1 text-[10px] text-slate-400 mt-1">
                          <span className="truncate flex items-center gap-1 text-slate-300">
                            <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            {siteShort}
                          </span>
                          {leadAud && (
                            <span
                              className={`truncate shrink-0 font-mono text-[9px] ${
                                isConflictingAudit && cell.conflicts.some((c) => c.auditorId === audit.leadAuditorId)
                                  ? 'text-rose-400 font-bold'
                                  : 'text-slate-400'
                              }`}
                            >
                              {leadAud.name.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        {/* Duration pill-less indicator if multi-day */}
                        {(isStart || isEnd) && (
                          <div className="pl-1 mt-0.5 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            {isStart ? (
                              <span className="text-amber-400">▶ Start</span>
                            ) : (
                              <span className="text-slate-400">■ End</span>
                            )}
                            <span className="text-[9px] text-slate-500">
                              {audit.status}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= AUDITOR WORKLOAD & BALANCE BREAKDOWN SUMMARY PANEL ================= */}
      {showWorkloadPanel && (
        <div className="no-print mt-6 bg-slate-900 border border-slate-800 rounded p-4 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Auditor Workload & Resource Balance Breakdown ({formattedMonthYear})
                </h2>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-mono">
                  {auditorWorkloadBreakdown.breakdown.length} Auditors Monitored
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor resource allocation across Lead and Team roles to prevent scheduling burnout and eliminate resource bottlenecks.
              </p>
            </div>

            {/* Imbalance Alert or Balanced Badge */}
            {auditorWorkloadBreakdown.hasImbalance ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Workload Imbalance Detected: Some auditors have {auditorWorkloadBreakdown.maxAudits} audits while others have 0.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Workload Distribution Healthy (Avg: {auditorWorkloadBreakdown.averageAudits} audits/auditor)</span>
              </div>
            )}
          </div>

          {/* Auditor Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {auditorWorkloadBreakdown.breakdown.map((item) => (
              <div
                key={'workload-' + item.auditor.id}
                className="bg-slate-950 p-3.5 rounded border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-2">
                    {editingAuditorNameId === item.auditor.id ? (
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="text"
                          value={editingAuditorNameVal}
                          onChange={(e) => setEditingAuditorNameVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveAuditorName(item.auditor.id);
                            if (e.key === 'Escape') setEditingAuditorNameId(null);
                          }}
                          className="bg-slate-900 border border-amber-400 px-1.5 py-0.5 rounded text-xs text-white focus:outline-none w-36"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveAuditorName(item.auditor.id)}
                          className="p-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded text-xs font-semibold"
                          title="Save Name"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAuditorNameId(null)}
                          className="p-1 text-slate-400 hover:text-white text-xs"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="font-bold text-white text-xs flex items-center gap-1.5 group">
                        <span>{item.auditor.name}</span>
                        {canPerform('manage_audits') && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAuditorNameId(item.auditor.id);
                              setEditingAuditorNameVal(item.auditor.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-400 transition-opacity p-0.5"
                            title="Edit auditor name anytime"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                        {item.hasConflictsInMonth && (
                          <span className="px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-mono font-bold">
                            CONFLICT
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.auditor.department || 'Auditing Dept'} • {item.auditor.competencyLevel || 'Auditor'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold ${item.statusBg}`}>
                    {item.status}
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-1.5 text-center bg-slate-900/60 p-2 rounded border border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono">Total</span>
                    <span className="font-bold text-white font-mono">{item.totalAudits}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono">As Lead</span>
                    <span className="font-bold text-amber-400 font-mono">{item.leadAudits.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono">Days</span>
                    <span className="font-bold text-sky-400 font-mono">{item.scheduledDaysCount}d</span>
                  </div>
                </div>

                {/* Progress / Capacity Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Monthly Capacity</span>
                    <span>{item.capacityPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        item.status === 'Overloaded'
                          ? 'bg-rose-500'
                          : item.status === 'High'
                          ? 'bg-amber-500'
                          : item.status === 'Balanced'
                          ? 'bg-emerald-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${item.capacityPercent}%` }}
                    />
                  </div>
                </div>

                {/* Quick Audits List */}
                {item.totalAudits > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[...item.leadAudits, ...item.teamAudits].map((a) => (
                      <button
                        key={'chip-' + item.auditor.id + '-' + a.id}
                        type="button"
                        onClick={() => setInspectAudit(a)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-amber-400 transition-colors truncate max-w-[140px]"
                        title={`${a.auditNumber}: ${a.title}`}
                      >
                        {a.auditNumber}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= FACILITY LEADS AUDIT ROSTER & SIGN-OFF ================= */}
      <div className={`mt-6 print-page-break print-avoid-break ${showFacilityRoster ? 'block' : 'print-only'}`}>
        <div className="border-t-2 border-slate-800 print:border-slate-900 pt-4 mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white print:text-slate-950 uppercase tracking-wider font-mono flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400 print:text-slate-800" />
              Facility Leads Audit Roster & Operational Boundaries ({formattedMonthYear})
            </h2>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
              Authorized distribution dossier for Plant Superintendents and Area Operations Leads
            </p>
          </div>
          <span className="text-xs text-slate-400 print:text-slate-600 font-mono">
            Total Audits: {monthAudits.length}
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 print:border-slate-300 rounded">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 print:bg-slate-100 text-slate-300 print:text-slate-900 border-b border-slate-800 print:border-slate-300 font-semibold font-mono text-[11px]">
                <th className="p-2 border-r border-slate-800 print:border-slate-300 w-24">Audit #</th>
                <th className="p-2 border-r border-slate-800 print:border-slate-300">Audit Title & Scope</th>
                <th className="p-2 border-r border-slate-800 print:border-slate-300 w-44">Plant Facility & Area</th>
                <th className="p-2 border-r border-slate-800 print:border-slate-300 w-28">Standard(s)</th>
                <th className="p-2 border-r border-slate-800 print:border-slate-300 w-32">Lead Auditor</th>
                <th className="p-2 border-r border-slate-800 print:border-slate-300 w-28">Planned Window</th>
                <th className="p-2 w-24">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-[11px]">
              {monthAudits.map((a) => {
                const lead = getAuditorById(a.leadAuditorId);
                const site = a.site || DbService.deriveSite(a.area, a.department);
                return (
                  <tr key={'roster-' + a.id} className="hover:bg-slate-900/40 print:hover:bg-transparent">
                    <td className="p-2 font-mono font-bold text-amber-400 print:text-slate-950 border-r border-slate-800 print:border-slate-300">
                      {a.auditNumber}
                    </td>
                    <td className="p-2 border-r border-slate-800 print:border-slate-300">
                      <div className="font-semibold text-white print:text-slate-950">{a.title}</div>
                      <div className="text-[10px] text-slate-400 print:text-slate-600 truncate mt-0.5">
                        {a.process || a.criteria}
                      </div>
                    </td>
                    <td className="p-2 border-r border-slate-800 print:border-slate-300">
                      <div className="font-medium text-slate-200 print:text-slate-950">{site}</div>
                      <div className="text-[10px] text-slate-400 print:text-slate-600">{a.area}</div>
                    </td>
                    <td className="p-2 font-mono text-sky-400 print:text-slate-900 border-r border-slate-800 print:border-slate-300">
                      {a.standardIds.join(', ')}
                    </td>
                    <td className="p-2 border-r border-slate-800 print:border-slate-300">
                      <div className="text-slate-200 print:text-slate-950">{lead?.name || a.leadAuditorId}</div>
                      <div className="text-[10px] text-slate-400 print:text-slate-600">{lead?.department || ''}</div>
                    </td>
                    <td className="p-2 font-mono border-r border-slate-800 print:border-slate-300 text-slate-300 print:text-slate-900">
                      <div>{a.plannedStartDate}</div>
                      <div className="text-[10px] text-slate-500 print:text-slate-600">to {a.plannedEndDate}</div>
                    </td>
                    <td className="p-2 font-bold font-mono">
                      <span
                        className={
                          a.riskLevel === 'Critical'
                            ? 'text-rose-400 print:text-red-700'
                            : a.riskLevel === 'High'
                            ? 'text-amber-400 print:text-amber-700'
                            : 'text-emerald-400 print:text-slate-800'
                        }
                      >
                        {a.riskLevel} ({a.riskScore}/25)
                      </span>
                    </td>
                  </tr>
                );
              })}
              {monthAudits.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-500 italic">
                    No audits scheduled for {formattedMonthYear} matching selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Formal Facility Sign-Off Blocks */}
        <div className="mt-5 pt-3 border-t border-slate-800 print:border-slate-400 grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] text-slate-400 print:text-slate-800">
          <div className="border-t border-slate-700 print:border-slate-400 pt-1.5">
            <div className="font-semibold text-slate-200 print:text-slate-900">Facility Operations Superintendent</div>
            <div className="text-slate-500 text-[10px] mt-0.5">Signature & Date: _______________________________</div>
          </div>
          <div className="border-t border-slate-700 print:border-slate-400 pt-1.5">
            <div className="font-semibold text-slate-200 print:text-slate-900">Lead ISO Compliance Auditor</div>
            <div className="text-slate-500 text-[10px] mt-0.5">Signature & Date: _______________________________</div>
          </div>
          <div className="border-t border-slate-700 print:border-slate-400 pt-1.5">
            <div className="font-semibold text-slate-200 print:text-slate-900">HSE & Process Safety Director</div>
            <div className="text-slate-500 text-[10px] mt-0.5">Signature & Date: _______________________________</div>
          </div>
        </div>
      </div>

      {/* ================= AUDIT QUICK INSPECTOR DRAWER / MODAL ================= */}
      {inspectAudit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold border border-slate-700">
                    {inspectAudit.auditNumber}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                      inspectAudit.status === 'Completed'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : inspectAudit.status === 'In Progress'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {inspectAudit.status}
                  </span>
                  <span className="text-xs text-rose-400 font-mono font-bold">
                    Risk: {inspectAudit.riskLevel} ({inspectAudit.riskScore}/25)
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1.5 leading-snug">
                  {inspectAudit.title}
                </h2>
              </div>
              <button
                onClick={() => setInspectAudit(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scheduling Conflict Alert Banner in Inspector */}
            {inspectConflicts.length > 0 && (
              <div className="bg-rose-950/70 border border-rose-500/80 p-3 rounded text-rose-200 text-xs space-y-2">
                <div className="font-bold flex items-center justify-between text-rose-300">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                    <span>Auditor Scheduling Conflict Detected</span>
                  </div>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-100 font-bold border border-rose-500/40">
                    {inspectConflicts.length} Conflicting {inspectConflicts.length === 1 ? 'Audit' : 'Audits'}
                  </span>
                </div>
                <p className="text-[11px] text-rose-200/90">
                  An assigned auditor has overlapping commitments on the following audit(s) during these scheduled dates:
                </p>
                <div className="space-y-1.5">
                  {inspectConflicts.map((confAudit) => {
                    const lead = getAuditorById(confAudit.leadAuditorId);
                    return (
                      <div
                        key={confAudit.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-rose-900/40 p-2 rounded border border-rose-500/40 text-[11px]"
                      >
                        <div>
                          <div className="font-mono font-semibold text-white">
                            {confAudit.auditNumber}: <span className="font-normal text-rose-200">{confAudit.title}</span>
                          </div>
                          <div className="text-[10px] text-rose-300/80 mt-0.5">
                            Dates: <span className="font-mono text-white">{confAudit.plannedStartDate} → {confAudit.plannedEndDate}</span> · Lead: {lead?.name || confAudit.leadAuditorId}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setInspectAudit(confAudit)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[10px] transition-colors"
                          >
                            Switch to Audit
                          </button>
                          {canPerform('manage_audits') && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenReschedule(inspectAudit, e)}
                              className="px-2 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold font-mono text-[10px] transition-colors"
                            >
                              Reschedule
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Core Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded border border-slate-800">
              <div>
                <span className="text-slate-400 block font-medium">Plant Site</span>
                <span className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  {inspectAudit.site || DbService.deriveSite(inspectAudit.area, inspectAudit.department)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Facility Area / Battery Limit</span>
                <span className="text-slate-200 mt-0.5 block">{inspectAudit.area || 'General Facility'}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">ISO Standards In Scope</span>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {inspectAudit.standardIds.map((std) => (
                    <span
                      key={std}
                      className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-sky-300 border border-slate-700"
                    >
                      {std}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Audit Criteria & Clauses</span>
                <span className="text-slate-300 mt-0.5 block truncate" title={inspectAudit.criteria}>
                  {inspectAudit.criteria || 'Formal ISO 19011 Compliance'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Lead Auditor</span>
                <span className="text-white font-medium flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  {getAuditorById(inspectAudit.leadAuditorId)?.name || inspectAudit.leadAuditorId}
                  <span className="text-slate-400 text-[11px]">
                    ({getAuditorById(inspectAudit.leadAuditorId)?.qualification || 'Certified'})
                  </span>
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Audit Team Members</span>
                <span className="text-slate-300 mt-0.5 block">
                  {inspectAudit.teamAuditorIds.length > 0
                    ? inspectAudit.teamAuditorIds
                        .map((id) => getAuditorById(id)?.name || id)
                        .join(', ')
                    : 'Solo Lead Auditor'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Scheduled Schedule Dates</span>
                <span className="text-amber-400 font-mono font-semibold mt-0.5 block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {inspectAudit.plannedStartDate} → {inspectAudit.plannedEndDate}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Process Unit / Line</span>
                <span className="text-slate-200 mt-0.5 block">{inspectAudit.process || 'N/A'}</span>
              </div>
            </div>

            {/* Scope & Objectives Preview */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-semibold text-slate-300">Audit Scope:</span>
                <p className="text-slate-400 mt-0.5">{inspectAudit.scope || 'No specific scope text.'}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-300">Objectives:</span>
                <p className="text-slate-400 mt-0.5">{inspectAudit.objectives || 'Standard conformance.'}</p>
              </div>
              {inspectAudit.specialInstructions && (
                <div>
                  <span className="font-semibold text-amber-400">Special Instructions / PPE:</span>
                  <p className="text-slate-300 mt-0.5 font-mono text-[11px]">
                    {inspectAudit.specialInstructions}
                  </p>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleOpenReschedule(inspectAudit, e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reschedule Dates</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const lead = getAuditorById(inspectAudit.leadAuditorId) || null;
                    const team = inspectAudit.teamAuditorIds
                      .map((id) => getAuditorById(id))
                      .filter(Boolean) as Auditor[];
                    PdfReportGenerator.generateAuditPlan(inspectAudit, lead, team, settings);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download Plan PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAuditId(inspectAudit.id);
                    if (onSelectAuditToEdit) {
                      onSelectAuditToEdit(inspectAudit.id);
                    }
                    setInspectAudit(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Audit Plan Specification</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAuditId(inspectAudit.id);
                    setActiveModule('execution');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <span>Field Execution</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= RESCHEDULE MODAL ================= */}
      {rescheduleAuditTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Reschedule Audit Dates
              </h3>
              <button
                onClick={() => setRescheduleAuditTarget(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300">
              <div className="font-semibold text-white">{rescheduleAuditTarget.title}</div>
              <div className="text-slate-400 font-mono mt-0.5">
                {rescheduleAuditTarget.auditNumber} · {rescheduleAuditTarget.site}
              </div>
            </div>

            <form onSubmit={handleSaveReschedule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Planned Start Date
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Planned End Date
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleEnd}
                  onChange={(e) => setRescheduleEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleAuditTarget(null)}
                  className="px-3 py-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-sm"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SCHEDULE NEW AUDIT MODAL ================= */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">
                  Schedule New Industrial Audit
                </h2>
                <p className="text-xs text-slate-400">
                  Assign plant site, ISO standards, lead assessor, and schedule dates
                </p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewAudit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">
                    Audit Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAuditData.title || ''}
                    onChange={(e) =>
                      setNewAuditData({ ...newAuditData, title: e.target.value })
                    }
                    placeholder="e.g. Flare Recovery & Hazardous Waste Storage Compliance Audit"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Plant Site / Complex *
                  </label>
                  <select
                    value={newAuditData.site || 'Baytown Refinery Complex'}
                    onChange={(e) =>
                      setNewAuditData({ ...newAuditData, site: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    {plantSites.map((site) => (
                      <option key={site} value={site}>
                        {site}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Audit Type
                  </label>
                  <select
                    value={newAuditData.auditType || 'HSE Audit'}
                    onChange={(e) =>
                      setNewAuditData({
                        ...newAuditData,
                        auditType: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    {auditTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newAuditData.department || ''}
                    onChange={(e) =>
                      setNewAuditData({ ...newAuditData, department: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Facility Area / Unit
                  </label>
                  <input
                    type="text"
                    value={newAuditData.area || ''}
                    onChange={(e) =>
                      setNewAuditData({ ...newAuditData, area: e.target.value })
                    }
                    placeholder="e.g. Tank Farm B, Flare #2, CDU-1"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Target Process
                  </label>
                  <input
                    type="text"
                    value={newAuditData.process || ''}
                    onChange={(e) =>
                      setNewAuditData({ ...newAuditData, process: e.target.value })
                    }
                    placeholder="e.g. Steam Cracking, Effluent Biological Basin"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Lead Auditor *
                  </label>
                  <select
                    value={newAuditData.leadAuditorId || ''}
                    onChange={(e) =>
                      setNewAuditData({
                        ...newAuditData,
                        leadAuditorId: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
                  >
                    {auditors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {a.qualification} ({a.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Planned Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newAuditData.plannedStartDate || ''}
                    onChange={(e) =>
                      setNewAuditData({
                        ...newAuditData,
                        plannedStartDate: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Planned End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newAuditData.plannedEndDate || ''}
                    onChange={(e) =>
                      setNewAuditData({
                        ...newAuditData,
                        plannedEndDate: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white font-mono"
                  />
                </div>

                {/* ISO Standards Checkboxes */}
                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Governing Standards in Scope
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                    {standards.map((std) => {
                      const isChecked = (newAuditData.standardIds || []).includes(
                        std.code
                      );
                      return (
                        <label
                          key={std.id}
                          className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const curr = newAuditData.standardIds || [];
                              const updated = e.target.checked
                                ? [...curr, std.code]
                                : curr.filter((c) => c !== std.code);
                              setNewAuditData({
                                ...newAuditData,
                                standardIds: updated,
                              });
                            }}
                            className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                          />
                          <span className="font-mono">{std.code}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3.5 py-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
                >
                  Confirm & Schedule Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
