import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import type {
  ProjectTask,
  TaskAuditLog,
  TaskComment,
  TaskDueDateChange,
  TaskPriority,
  TaskStatus,
  TaskTimeEntry,
  Workspace,
  WorkspaceFeedPost,
  WorkspaceTagOption
} from '../../types';
import { supabase } from '../../lib/supabase';
import { IconBriefcase, IconLayers } from '../../components/icons';
import { CustomSelect } from '../../components/CustomSelect';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutList,
  List,
  Sparkles,
  X
} from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format as formatDateFns,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek
} from 'date-fns';

const STATUS_COLORS: Record<TaskStatus, string> = {
  Backlog: '#94a3b8',
  Pendente: '#6366f1',
  'Em Execução': '#3b82f6',
  'Em Validação': '#f59e0b',
  Concluída: '#10b981',
  Bloqueada: '#f43f5e',
  Cancelada: '#64748b'
};

const PRIORITY_OPTIONS: TaskPriority[] = ['Baixa', 'Média', 'Alta', 'Crítica'];
const weekDayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;

type DashboardTab = 'dashboard' | 'tasks' | 'feed';
type TaskSituation = 'No Prazo' | 'Finalizada' | 'Atrasada';
type TaskViewMode = 'list' | 'board' | 'calendar';
type CalendarViewMode = 'month' | 'week' | 'day';

type TaskGridFilters = {
  description: string;
  projects: string[];
  sectors: string[];
  taskTypes: string[];
  priorities: TaskPriority[];
  statuses: TaskStatus[];
  dueDate: string;
  executors: string[];
  situations: TaskSituation[];
};

const DEFAULT_TASK_GRID_FILTERS: TaskGridFilters = {
  description: '',
  projects: [],
  sectors: [],
  taskTypes: [],
  priorities: [],
  statuses: [],
  dueDate: '',
  executors: [],
  situations: []
};

const normalizeDateValue = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (date.toString() === 'Invalid Date') {
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  return date.toISOString().slice(0, 10);
};

const getRelativeIsoDate = (daysFromToday: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromToday);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDatePtBr = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (date.toString() === 'Invalid Date') return value;
  return date.toLocaleDateString('pt-BR');
};

const getTaskSituation = (task: ProjectTask): TaskSituation => {
  if (task.status === 'Concluída') return 'Finalizada';
  const dueDateValue = normalizeDateValue(task.dueDateCurrent || task.dueDateOriginal || '');
  const today = normalizeDateValue(new Date().toISOString());
  if (dueDateValue && dueDateValue < today) return 'Atrasada';
  return 'No Prazo';
};

type MultiFilterSelectProps = {
  options: Array<{ value: string; label: string }>;
  values: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
};

function MultiFilterSelect({ options, values, placeholder, onChange }: MultiFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideContainer = containerRef.current?.contains(target);
      const clickedInsideDropdown = dropdownRef.current?.contains(target);
      
      if (!clickedInsideContainer && !clickedInsideDropdown) {
        setOpen(false);
      }
    };
    
    const handleScroll = () => {
      if (open) setOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setOpen((prev) => !prev);
  };

  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text-primary)] hover:border-cyan-500/40 transition-colors"
      >
        <span className="truncate text-left">
          {!selectedLabels.length
            ? placeholder
            : selectedLabels.length === 1
              ? selectedLabels[0]
              : `${selectedLabels.length} selecionados`}
        </span>
        <ChevronDown
          size={13}
          className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && createPortal(
        <div 
          ref={dropdownRef}
          style={{
            top: position.top + 4,
            left: position.left,
            width: Math.max(position.width, 180)
          }}
          className="absolute z-[9999] rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1.5 shadow-2xl"
        >
          <div className="mb-1 flex items-center justify-end">
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Limpar
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {options.map((option) => {
              const selected = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onChange(
                      selected
                        ? values.filter((item) => item !== option.value)
                        : [...values, option.value]
                    )
                  }
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                    selected
                      ? 'bg-cyan-500/15 text-cyan-200'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--muted-bg)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      selected
                        ? 'border-cyan-400 bg-cyan-500/30 text-cyan-200'
                        : 'border-[var(--panel-border)] text-transparent'
                    }`}
                  >
                    <Check size={11} />
                  </span>
                  <span className="truncate text-left">{option.label}</span>
                </button>
              );
            })}
            {!options.length && (
              <div className="px-2 py-2 text-center text-xs text-[var(--text-muted)]">
                Sem opções
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

type DashboardSectionProps = {
  loadingWorkspaces: boolean;
  loadError: string | null;
  selectedWorkspace: Workspace | null;
  canManageWorkspaces: boolean;
  tasks: ProjectTask[];
  sectors: WorkspaceTagOption[];
  taskTypes: WorkspaceTagOption[];
  dashboardEvents: Array<{
    id: string;
    taskId: string;
    createdAt: string;
    userId: string;
    type: 'audit' | 'time' | 'due' | 'comment' | 'extra';
    summary: string;
  }>;
  dashboardFeedPosts: WorkspaceFeedPost[];
  dashboardLoading: boolean;
  isManager: boolean;
  canPostFeed: boolean;
  currentUserId: string;
  projectFilterId: string;
  onChangeProjectFilter: (projectId: string) => void;
  workspaceMembers: Array<{
    userId: string;
    fullName?: string | null;
    title?: string | null;
    avatarUrl?: string | null;
    email?: string | null;
  }>;
  timeEntries: Record<string, TaskTimeEntry[]>;
  dueDateChanges: Record<string, TaskDueDateChange[]>;
  auditLogs: Record<string, TaskAuditLog[]>;
  taskComments: Record<string, TaskComment[]>;
  onLoadTaskExtras: (taskId: string) => Promise<void> | void;
  onAddTaskComment: (taskId: string, content: string) => Promise<void> | void;
  onUpdateTaskComment: (taskId: string, commentId: string, content: string) => Promise<void> | void;
  onDeleteTaskComment: (taskId: string, commentId: string) => Promise<void> | void;
  onAddFeedPost: (workspaceId: string, content: string, taskIds: string[]) => Promise<void> | void;
  onNewProject: () => void;
};

export function DashboardSection({
  loadingWorkspaces,
  loadError,
  selectedWorkspace,
  canManageWorkspaces,
  tasks,
  sectors,
  taskTypes,
  dashboardEvents,
  dashboardFeedPosts,
  dashboardLoading,
  isManager,
  canPostFeed,
  currentUserId,
  projectFilterId,
  onChangeProjectFilter,
  workspaceMembers,
  timeEntries,
  dueDateChanges,
  auditLogs,
  taskComments,
  onLoadTaskExtras,
  onAddTaskComment,
  onUpdateTaskComment,
  onDeleteTaskComment,
  onAddFeedPost,
  onNewProject
}: DashboardSectionProps) {
  const dashboardCaptureRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailTaskTab, setDetailTaskTab] = useState<'info' | 'time' | 'deadline' | 'comments' | 'logs'>('info');
  const [commentDraft, setCommentDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState('');
  const [loadingTaskDetails, setLoadingTaskDetails] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string>('');
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState<string | null>(null);
  const [taskGridFilters, setTaskGridFilters] = useState<TaskGridFilters>(DEFAULT_TASK_GRID_FILTERS);
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('list');
  const [calendarView, setCalendarView] = useState<CalendarViewMode>('month');
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  const [typeSectorFilter, setTypeSectorFilter] = useState<'all' | 'not_done'>('all');
  const [feedDraft, setFeedDraft] = useState('');
  const [feedMentions, setFeedMentions] = useState<string[]>([]);
  const [feedSubmitting, setFeedSubmitting] = useState(false);

  useEffect(() => {
    setSummaryGeneratedAt(null);
    setSummaryText('');
    setSummaryMessage(null);
    setFeedDraft('');
    setFeedMentions([]);
    setEditingCommentId(null);
    setEditingCommentDraft('');
  }, [selectedWorkspace?.id, projectFilterId]);

  const statusOptions: TaskStatus[] = [
    'Backlog',
    'Pendente',
    'Em Execução',
    'Em Validação',
    'Concluída',
    'Bloqueada',
    'Cancelada'
  ];

  const statusCounts = useMemo(() => {
    return statusOptions.reduce<Record<TaskStatus, number>>((acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status).length;
      return acc;
    }, {} as Record<TaskStatus, number>);
  }, [tasks]);

  const totalTasks = tasks.length;
  const backlogCount = statusCounts.Backlog ?? 0;
  const inProgressCount = statusCounts['Em Execução'] ?? 0;
  const validationCount = statusCounts['Em Validação'] ?? 0;
  const doneCount = statusCounts['Concluída'] ?? 0;
  const blockedCount = statusCounts.Bloqueada ?? 0;

  const overdueCount = useMemo(() => {
    const today = new Date();
    return tasks.filter((task) => {
      if (!task.dueDateCurrent && !task.dueDateOriginal) return false;
      if (task.status === 'Concluída' || task.status === 'Cancelada') return false;
      const dateStr = task.dueDateCurrent || task.dueDateOriginal;
      const date = new Date(dateStr);
      return date.toString() !== 'Invalid Date' && date < today;
    }).length;
  }, [tasks]);

  const userCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((task) => {
      task.executorIds.forEach((userId) => {
        counts.set(userId, (counts.get(userId) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([userId, count]) => {
        const member = workspaceMembers.find((item) => item.userId === userId);
        return {
          userId,
          count,
          label: member?.fullName || member?.email || userId
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tasks, workspaceMembers]);

  const typeSectorFilteredTasks = useMemo(() => {
    if (typeSectorFilter === 'not_done') {
      return tasks.filter((task) => task.status !== 'Concluída');
    }
    return tasks;
  }, [tasks, typeSectorFilter]);

  const sectorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    typeSectorFilteredTasks.forEach((task) => {
      const key = task.sector?.trim() || 'Sem setor';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [typeSectorFilteredTasks]);

  const taskTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    typeSectorFilteredTasks.forEach((task) => {
      const key = task.taskType?.trim() || 'Sem tipo';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [typeSectorFilteredTasks]);

  const typeSectorTotal = typeSectorFilteredTasks.length;

  const memberMap = useMemo(() => {
    return new Map(
      workspaceMembers.map((member) => [
        member.userId,
        member.fullName || member.email || member.userId
      ])
    );
  }, [workspaceMembers]);
  const memberAvatarMap = useMemo(() => {
    return new Map(
      workspaceMembers.map((member) => [member.userId, member.avatarUrl || null])
    );
  }, [workspaceMembers]);

  const getInitials = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return value.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  );

  const formatMinutes = (minutes: number) => {
    const total = Math.max(0, Math.round(minutes || 0));
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  };

  const formatAuditValue = (field: string, value: string | null) => {
    if (!value) return '-';

    if (field === 'Tempo de Execução efetivado' || field === 'Tempo de Execução estimado') {
      const minutes = parseInt(value, 10);
      if (!isNaN(minutes)) {
        return `${minutes}m`;
      }
    }

    if (field === 'Executor' || field === 'Validador' || field === 'Informar') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          if (!parsed.length) return '-';
          return parsed
            .map((id) => (typeof id === 'string' ? memberMap.get(id) ?? id : String(id)))
            .join(', ');
        }
      } catch {
        return value;
      }
    }
    return value;
  };

  const openTaskDetail = async (taskId: string) => {
    setDetailTaskId(taskId);
    setDetailTaskTab('info');
    setCommentDraft('');
    setLoadingTaskDetails(true);
    try {
      await Promise.resolve(onLoadTaskExtras(taskId));
    } finally {
      setLoadingTaskDetails(false);
    }
  };

  const focusTodayAgenda = () => {
    setCalendarDate(new Date());
    setCalendarView('day');
    setTaskViewMode('calendar');
    setActiveTab('tasks');
  };

  const submitFeedPost = async () => {
    if (!selectedWorkspace?.id) return;
    const trimmed = feedDraft.trim();
    if (!trimmed) return;
    setFeedSubmitting(true);
    try {
      await Promise.resolve(onAddFeedPost(selectedWorkspace.id, trimmed, feedMentions));
      setFeedDraft('');
      setFeedMentions([]);
    } finally {
      setFeedSubmitting(false);
    }
  };

  const feedItems = useMemo(() => {
    const eventItems = dashboardEvents.map((event) => ({
      id: `event-${event.id}`,
      kind: 'event' as const,
      createdAt: event.createdAt,
      userId: event.userId,
      content: event.summary,
      taskIds: event.taskId ? [event.taskId] : [],
      taskId: event.taskId,
      eventType: event.type,
      commentId: event.type === 'comment' ? event.id : undefined
    }));
    const postItems = dashboardFeedPosts.map((post) => ({
      id: `post-${post.id}`,
      kind: 'post' as const,
      createdAt: post.createdAt,
      userId: post.createdBy,
      content: post.content,
      taskIds: post.taskIds ?? []
    }));
    return [...postItems, ...eventItems].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }, [dashboardEvents, dashboardFeedPosts]);

  const sectorColorMap = useMemo(
    () => new Map(sectors.map((item) => [item.name, item.color])),
    [sectors]
  );
  const taskTypeColorMap = useMemo(
    () => new Map(taskTypes.map((item) => [item.name, item.color])),
    [taskTypes]
  );
  const projectNameById = useMemo(
    () => new Map((selectedWorkspace?.projects ?? []).map((project) => [project.id, project.name])),
    [selectedWorkspace]
  );
  const feedTaskOptions = useMemo(() => {
    return tasks
      .map((task) => {
        const projectLabel = task.projectId
          ? projectNameById.get(task.projectId) ?? 'Projeto'
          : 'Projeto';
        return {
          value: task.id,
          label: `${task.description || task.name || 'Sem descrição'} • ${projectLabel}`
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projectNameById, tasks]);
  const projectFilterOptions = useMemo(() => {
    const entries = new Map<string, string>();
    tasks.forEach((task) => {
      if (!task.projectId) return;
      entries.set(task.projectId, projectNameById.get(task.projectId) ?? 'Projeto');
    });
    return Array.from(entries.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tasks, projectNameById]);
  const executorFilterOptions = useMemo(() => {
    const entries = new Map<string, string>();
    tasks.forEach((task) => {
      task.executorIds.forEach((userId) => {
        entries.set(userId, memberMap.get(userId) ?? userId);
      });
    });
    return Array.from(entries.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tasks, memberMap]);

  const taskHighlights = useMemo(() => {
    const todayIso = getRelativeIsoDate(0);
    const yesterdayIso = getRelativeIsoDate(-1);
    const tomorrowIso = getRelativeIsoDate(1);

    const finishedYesterdayIds = new Set(
      dashboardEvents
        .filter((event) => {
          if (event.type !== 'audit') return false;
          if (normalizeDateValue(event.createdAt) !== yesterdayIso) return false;
          const summary = event.summary.toLowerCase();
          return summary.includes('status da tarefa') && summary.includes('concluída');
        })
        .map((event) => event.taskId)
    );

    const buildItems = (list: ProjectTask[]) =>
      list
        .map((task) => ({
          id: task.id,
          description: task.description || task.name || 'Sem descrição',
          projectLabel: task.projectId ? (projectNameById.get(task.projectId) ?? 'Projeto') : 'Projeto'
        }))
        .sort((a, b) => a.projectLabel.localeCompare(b.projectLabel));

    const finishedYesterday = buildItems(tasks.filter((task) => finishedYesterdayIds.has(task.id)));

    const dueToday = buildItems(
      tasks.filter((task) => {
        if (task.status === 'Concluída' || task.status === 'Cancelada') return false;
        const dueDateValue = normalizeDateValue(task.dueDateCurrent || task.dueDateOriginal || '');
        return dueDateValue === todayIso;
      })
    );

    const dueTomorrow = buildItems(
      tasks.filter((task) => {
        if (task.status === 'Concluída' || task.status === 'Cancelada') return false;
        const dueDateValue = normalizeDateValue(task.dueDateCurrent || task.dueDateOriginal || '');
        return dueDateValue === tomorrowIso;
      })
    );

    return { finishedYesterday, dueToday, dueTomorrow };
  }, [dashboardEvents, projectNameById, tasks]);

  const taskGridRows = useMemo(() => {
    const normalizeText = (value: string) => value.trim().toLowerCase();
    const includesText = (source: string, query: string) =>
      !query || normalizeText(source).includes(normalizeText(query));

    return tasks
      .map((task) => {
        const dueDateValue = normalizeDateValue(task.dueDateCurrent || task.dueDateOriginal || '');
        const situation = getTaskSituation(task);
        const executorLabel = task.executorIds
          .map((userId) => memberMap.get(userId) ?? userId)
          .join(', ');
        const projectLabel = task.projectId
          ? (projectNameById.get(task.projectId) ?? 'Projeto')
          : '-';

        return {
          task,
          projectLabel,
          situation,
          executorLabel,
          dueDateValue
        };
      })
      .filter((row) => {
        if (!includesText(row.task.description || row.task.name || '', taskGridFilters.description)) {
          return false;
        }
        if (
          taskGridFilters.projects.length &&
          (!row.task.projectId || !taskGridFilters.projects.includes(row.task.projectId))
        ) {
          return false;
        }
        if (taskGridFilters.sectors.length && !taskGridFilters.sectors.includes(row.task.sector)) return false;
        if (taskGridFilters.taskTypes.length && !taskGridFilters.taskTypes.includes(row.task.taskType)) {
          return false;
        }
        if (taskGridFilters.priorities.length && !taskGridFilters.priorities.includes(row.task.priority)) {
          return false;
        }
        if (taskGridFilters.statuses.length && !taskGridFilters.statuses.includes(row.task.status)) {
          return false;
        }
        if (taskGridFilters.dueDate && row.dueDateValue !== taskGridFilters.dueDate) return false;
        if (
          taskGridFilters.executors.length &&
          !taskGridFilters.executors.some((executorId) => row.task.executorIds.includes(executorId))
        ) {
          return false;
        }
        if (taskGridFilters.situations.length && !taskGridFilters.situations.includes(row.situation)) {
          return false;
        }
        return true;
      });
  }, [memberMap, projectNameById, taskGridFilters, tasks]);

  const filteredTasks = useMemo(() => taskGridRows.map((row) => row.task), [taskGridRows]);

  const groupedTasksByStatus = useMemo(() => {
    return statusOptions.map((status) => ({
      status,
      tasks: filteredTasks.filter((task) => task.status === status)
    }));
  }, [filteredTasks, statusOptions]);

  const scheduledEvents = useMemo(() => {
    return filteredTasks.flatMap((task) =>
      (task.executionPeriods ?? [])
        .filter((period) => period.date && period.startTime && period.endTime)
        .map((period) => {
          const start = new Date(`${period.date}T${period.startTime}`);
          const end = new Date(`${period.date}T${period.endTime}`);
          return {
            task,
            period,
            start,
            end
          };
        })
        .filter((event) => !Number.isNaN(event.start.getTime()) && !Number.isNaN(event.end.getTime()))
    );
  }, [filteredTasks]);

  const todayAgenda = useMemo(() => {
    const todayIso = getRelativeIsoDate(0);
    const events = tasks
      .flatMap((task) =>
        (task.executionPeriods ?? [])
          .filter(
            (period) =>
              normalizeDateValue(period.date) === todayIso &&
              period.startTime &&
              period.endTime
          )
          .map((period) => {
            const start = new Date(`${period.date}T${period.startTime}`);
            const end = new Date(`${period.date}T${period.endTime}`);
            return {
              task,
              period,
              start,
              end
            };
          })
          .filter((event) => !Number.isNaN(event.start.getTime()) && !Number.isNaN(event.end.getTime()))
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const totalMinutes = events.reduce((acc, event) => {
      const minutes = (event.end.getTime() - event.start.getTime()) / 60000;
      return acc + (Number.isFinite(minutes) ? Math.max(0, minutes) : 0);
    }, 0);

    const taskCount = new Set(events.map((event) => event.task.id)).size;
    const rangeLabel = events.length
      ? `${formatDateFns(events[0].start, 'HH:mm')} - ${formatDateFns(events[events.length - 1].end, 'HH:mm')}`
      : '';

    return {
      events,
      totalMinutes,
      taskCount,
      rangeLabel
    };
  }, [tasks]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof scheduledEvents>();
    scheduledEvents.forEach((event) => {
      const key = formatDateFns(event.start, 'yyyy-MM-dd');
      const previous = map.get(key) ?? [];
      map.set(key, [...previous, event]);
    });
    map.forEach((events, key) => {
      map.set(
        key,
        [...events].sort((a, b) => a.start.getTime() - b.start.getTime())
      );
    });
    return map;
  }, [scheduledEvents]);

  const detailTask = useMemo(
    () => taskGridRows.find((row) => row.task.id === detailTaskId)?.task ?? null,
    [detailTaskId, taskGridRows]
  );

  const downloadTaskGrid = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tarefas');
    sheet.addRow([
      'descricao',
      'projeto',
      'setor',
      'tipo',
      'prioridade',
      'status',
      'prazo',
      'executor',
      'situacao'
    ]);

    taskGridRows.forEach((row) => {
      sheet.addRow([
        row.task.description || row.task.name || '',
        row.projectLabel,
        row.task.sector || '',
        row.task.taskType || '',
        row.task.priority,
        row.task.status,
        normalizeDateValue(row.task.dueDateCurrent || row.task.dueDateOriginal || ''),
        row.executorLabel || '',
        row.situation
      ]);
    });

    sheet.columns = [
      { width: 48 },
      { width: 26 },
      { width: 22 },
      { width: 22 },
      { width: 14 },
      { width: 18 },
      { width: 14 },
      { width: 34 },
      { width: 14 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dashboard_tarefas.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadDashboardPdf = async () => {
    const captureNode = dashboardCaptureRef.current;
    if (!captureNode) {
      setSummaryMessage('Não foi possível capturar o dashboard para gerar o PDF.');
      return;
    }

    const now = new Date();
    const dateSuffix = now.toISOString().slice(0, 10);
    const canvas = await html2canvas(captureNode, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#020617'
    });
    const imageData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageRatio = canvas.width / canvas.height;
    const pageRatio = pageWidth / pageHeight;

    let renderWidth = pageWidth;
    let renderHeight = pageWidth / imageRatio;
    if (imageRatio < pageRatio) {
      renderHeight = pageHeight;
      renderWidth = pageHeight * imageRatio;
    }

    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;
    pdf.addImage(imageData, 'PNG', x, y, renderWidth, renderHeight);
    pdf.save(`dashboard_${dateSuffix}.pdf`);
  };

  const generateDailySummary = async () => {
    if (!selectedWorkspace?.id) return;

    setSummaryLoading(true);
    setSummaryMessage('Gerando resumo IA...');

    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data, error } = await supabase.functions.invoke('send-daily-dashboard-summary', {
        body: {
          generateOnly: true,
          workspaceId: selectedWorkspace.id,
          projectId: projectFilterId === 'all' ? null : projectFilterId,
          workspaceName: selectedWorkspace.name,
          dayStart: start.toISOString(),
          dayEnd: end.toISOString()
        }
      });

      if (error) {
        let detailedMessage = `Falha ao chamar a Edge Function: ${error.message}`;

        if (error instanceof FunctionsHttpError) {
          try {
            const payload = await error.context.json();
            const bodyError =
              typeof payload?.error === 'string'
                ? payload.error
                : typeof payload?.message === 'string'
                  ? payload.message
                  : JSON.stringify(payload);
            detailedMessage = `Edge Function retornou erro HTTP: ${bodyError}`;
          } catch {
            detailedMessage = `Edge Function retornou erro HTTP sem corpo legível: ${error.message}`;
          }
        } else if (error instanceof FunctionsFetchError) {
          detailedMessage =
            `Não foi possível alcançar a Edge Function (fetch error). ` +
            `Verifique deploy/nome da função e conectividade. Detalhe: ${error.message}`;
        } else if (error instanceof FunctionsRelayError) {
          detailedMessage =
            `Erro de relay ao chamar a Edge Function. ` +
            `Tente novamente e verifique status do Supabase. Detalhe: ${error.message}`;
        }

        console.error('Erro detalhado Edge Function:', error);
        throw new Error(detailedMessage);
      }
      if (data?.error) throw new Error(data.error);
      if (typeof data?.summaryText === 'string') {
        setSummaryText(data.summaryText);
      }
      setSummaryGeneratedAt(now.toISOString());

      setSummaryMessage('Resumo gerado com sucesso. Agora você pode baixar o PDF.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gerar resumo diário.';
      setSummaryMessage(message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const statusShare = useMemo(() => {
    if (!totalTasks) return [] as Array<{ status: TaskStatus; percent: number }>;
    return statusOptions.map((status) => ({
      status,
      percent: Math.round(((statusCounts[status] ?? 0) / totalTasks) * 100)
    }));
  }, [statusCounts, totalTasks]);

  const completionStats = useMemo(() => {
    const nonBacklogTotal = totalTasks - backlogCount;
    if (nonBacklogTotal <= 0) {
      return { done: 0, other: 0, percent: 0 };
    }
    const other = nonBacklogTotal - doneCount;
    const percent = Math.round((doneCount / nonBacklogTotal) * 100);
    return { done: doneCount, other, percent };
  }, [totalTasks, backlogCount, doneCount]);

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="flex flex-col gap-6">
        {loadingWorkspaces ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-sm text-[var(--text-secondary)]">
            Carregando workspaces...
          </div>
        ) : null}
        {loadError ? (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {loadError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-2">
          <div className="inline-flex w-full flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--muted-bg)]'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'tasks'
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--muted-bg)]'
              }`}
            >
              Tarefas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'feed'
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--muted-bg)]'
              }`}
            >
              Feed
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div ref={dashboardCaptureRef} className="space-y-4">
            <div className="rounded-3xl border border-[var(--panel-border)] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_rgba(15,23,42,0.08)_55%,_rgba(15,23,42,0.25))] p-6">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-secondary)]">
                    Dashboard
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    {selectedWorkspace?.name ?? 'Nenhum workspace'}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {selectedWorkspace?.description || 'Selecione ou crie um workspace.'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>Visao consolidada do workspace</span>
                    <span>•</span>
                    <span>{totalTasks} tarefas monitoradas</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 min-w-[260px]">
                  <CustomSelect
                    value={projectFilterId}
                    onChange={(val) => onChangeProjectFilter(val)}
                    options={[
                      { value: 'all', label: 'Todos os projetos' },
                      ...(selectedWorkspace?.projects ?? []).map((project) => ({
                        value: project.id,
                        label: project.name
                      }))
                    ]}
                    placeholder="Filtrar por projeto"
                  />
                  <button
                    type="button"
                    onClick={onNewProject}
                    disabled={!selectedWorkspace || !canManageWorkspaces}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-cyan-400/40 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IconLayers />
                    Novo projeto
                  </button>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void generateDailySummary();
                      }}
                      disabled={!selectedWorkspace || summaryLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-cyan-400/40 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      {summaryLoading ? 'Gerando...' : 'Gerar resumo IA'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void downloadDashboardPdf();
                      }}
                      disabled={!summaryGeneratedAt}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-cyan-400/40 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download size={14} />
                      Baixar PDF do dashboard
                    </button>
                  </div>
                  {summaryMessage && (
                    <p className="text-xs text-[var(--text-secondary)]">{summaryMessage}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Total de tarefas
                </p>
                <div className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
                  {totalTasks}
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--panel-border)]">
                  <div
                    className="h-1.5 rounded-full bg-cyan-400"
                    style={{ width: `${Math.min(100, totalTasks * 4)}%` }}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Em execução
                </p>
                <div className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
                  {inProgressCount}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  +{validationCount} em validação
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Concluídas
                </p>
                <div className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
                  {doneCount}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {blockedCount} bloqueadas
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Atrasadas
                </p>
                <div className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
                  {overdueCount}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Backlog: {backlogCount}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Distribuição por status
                  </h3>
                  {dashboardLoading && (
                    <span className="text-xs text-[var(--text-muted)]">Atualizando...</span>
                  )}
                </div>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-40 w-40 rounded-full"
                      style={{
                        background: `conic-gradient(${statusShare
                          .map((item) => `${STATUS_COLORS[item.status]} ${item.percent}%`)
                          .join(',')})`
                      }}
                    />
                    <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                      {statusOptions.map((status) => (
                        <div key={status} className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: STATUS_COLORS[status] }}
                          />
                          <span className="w-24">{status}</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {statusCounts[status] ?? 0}
                          </span>
                        </div>
                      ))}
                      <div className="text-[var(--text-muted)]">Total: {totalTasks}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                    <div className="text-xs text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                      Percentual de conclusão
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div
                        className="h-32 w-32 rounded-full flex items-center justify-center"
                        style={{
                          background: `conic-gradient(#10b981 ${completionStats.percent}%, #1f2937 0)`
                        }}
                      >
                        <div className="h-20 w-20 rounded-full bg-[var(--card-bg)] flex items-center justify-center">
                          <span className="text-lg font-semibold text-[var(--text-primary)]">
                            {completionStats.percent}%
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] space-y-1">
                        <div>
                          Concluídas:{' '}
                          <span className="text-[var(--text-primary)] font-semibold">{completionStats.done}</span>
                        </div>
                        <div>
                          Outras (exceto backlog):{' '}
                          <span className="text-[var(--text-primary)] font-semibold">{completionStats.other}</span>
                        </div>
                        <div className="text-[var(--text-muted)]">
                          Base sem backlog: {totalTasks - backlogCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Tarefas por executor
                </h3>
                <div className="mt-4 space-y-3">
                  {userCounts.map((item) => (
                    <div key={item.userId}>
                      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <span>{item.label}</span>
                        <span className="font-semibold text-[var(--text-primary)]">{item.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-[var(--panel-border)]">
                        <div
                          className="h-1.5 rounded-full bg-cyan-400"
                          style={{ width: `${Math.min(100, item.count * 10)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {!userCounts.length && (
                    <div className="text-xs text-[var(--text-muted)]">
                      Sem distribuicao por executor.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Tarefas por setor
                  </h3>
                  <div className="flex items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1">
                    <button
                      type="button"
                      onClick={() => setTypeSectorFilter('all')}
                      className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                        typeSectorFilter === 'all'
                          ? 'bg-[var(--accent)] text-white'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeSectorFilter('not_done')}
                      className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                        typeSectorFilter === 'not_done'
                          ? 'bg-[var(--accent)] text-white'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Não concluídas
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {sectorCounts.map((item) => {
                    const color = sectorColorMap.get(item.label) ?? '#38bdf8';
                    const percent = typeSectorTotal ? Math.round((item.count / typeSectorTotal) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span>{item.label}</span>
                          </div>
                          <span className="font-semibold text-[var(--text-primary)]">{item.count}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-[var(--panel-border)]">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, percent)}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {!sectorCounts.length && (
                    <div className="text-xs text-[var(--text-muted)]">
                      Sem distribuicao por setor.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Tarefas por tipo
                </h3>
                <div className="mt-4 space-y-3">
                  {taskTypeCounts.map((item) => {
                    const color = taskTypeColorMap.get(item.label) ?? '#f97316';
                    const percent = typeSectorTotal ? Math.round((item.count / typeSectorTotal) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span>{item.label}</span>
                          </div>
                          <span className="font-semibold text-[var(--text-primary)]">{item.count}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-[var(--panel-border)]">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, percent)}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {!taskTypeCounts.length && (
                    <div className="text-xs text-[var(--text-muted)]">
                      Sem distribuicao por tipo.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Finalizadas ontem
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {taskHighlights.finishedYesterday.length} tarefa(s)
                </p>
                <div className="mt-3 space-y-2">
                  {taskHighlights.finishedYesterday.slice(0, 6).map((task) => (
                    <div key={task.id} className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2">
                      <div className="text-xs font-medium text-[var(--text-primary)] line-clamp-2">
                        {task.description}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{task.projectLabel}</div>
                    </div>
                  ))}
                  {!taskHighlights.finishedYesterday.length && (
                    <div className="text-xs text-[var(--text-muted)]">Nenhuma tarefa finalizada ontem.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Vencem hoje
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {taskHighlights.dueToday.length} tarefa(s)
                </p>
                <div className="mt-3 space-y-2">
                  {taskHighlights.dueToday.slice(0, 6).map((task) => (
                    <div key={task.id} className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2">
                      <div className="text-xs font-medium text-[var(--text-primary)] line-clamp-2">
                        {task.description}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{task.projectLabel}</div>
                    </div>
                  ))}
                  {!taskHighlights.dueToday.length && (
                    <div className="text-xs text-[var(--text-muted)]">Nenhuma tarefa vencendo hoje.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Programadas para amanhã
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {taskHighlights.dueTomorrow.length} tarefa(s)
                </p>
                <div className="mt-3 space-y-2">
                  {taskHighlights.dueTomorrow.slice(0, 6).map((task) => (
                    <div key={task.id} className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2">
                      <div className="text-xs font-medium text-[var(--text-primary)] line-clamp-2">
                        {task.description}
                      </div>
                      <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">{task.projectLabel}</div>
                    </div>
                  ))}
                  {!taskHighlights.dueTomorrow.length && (
                    <div className="text-xs text-[var(--text-muted)]">
                      Nenhuma tarefa programada para amanhã.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 lg:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Agendas do dia
                  </h3>
                  {todayAgenda.events.length > 2 && (
                    <button
                      type="button"
                      onClick={focusTodayAgenda}
                      className="text-[10px] text-[var(--accent)] hover:text-[var(--accent-strong)]"
                    >
                      Ver todas
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  <div className="text-xs text-[var(--text-muted)]">
                    {todayAgenda.events.length} períodos • {todayAgenda.taskCount} tarefas •{' '}
                    {formatMinutes(todayAgenda.totalMinutes)} planejados
                  </div>
                  {todayAgenda.rangeLabel && (
                    <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                      {todayAgenda.rangeLabel} • Períodos de execução
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  {todayAgenda.events.slice(0, 6).map((event) => (
                    <button
                      key={event.period.id}
                      type="button"
                      onClick={() => {
                        void openTaskDetail(event.task.id);
                      }}
                      className="w-full truncate rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--muted-bg)]"
                    >
                      {formatDateFns(event.start, 'HH:mm')} - {formatDateFns(event.end, 'HH:mm')} •{' '}
                      {event.task.description || 'Sem descrição'}
                    </button>
                  ))}
                  {!todayAgenda.events.length && (
                    <div className="text-xs text-[var(--text-muted)]">
                      Nenhum período planejado hoje.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Projetos do workspace
                </h3>
                <div className="mt-4 space-y-3">
                  {selectedWorkspace?.projects.length ? (
                    selectedWorkspace.projects.map((project) => (
                      <div
                        key={project.id}
                        className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                              {project.name}
                            </h4>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              {project.summary || 'Sem resumo definido.'}
                            </p>
                          </div>
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                            {project.status ?? 'Ativo'}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <IconBriefcase />
                          Workspace: {selectedWorkspace?.name}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--muted-bg)] p-6 text-center">
                      <p className="text-sm text-[var(--text-secondary)]">
                        Nenhum projeto por aqui ainda. Crie o primeiro projeto do workspace.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {summaryText && (
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Resumo IA do dia
                </h3>
                <pre className="mt-3 whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
                  {summaryText}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[linear-gradient(160deg,rgba(14,165,233,0.06),rgba(2,6,23,0.12))] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Feed do workspace
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Pipeline de postagens e logs do time.
                </p>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {feedItems.length} interação(ões)
              </div>
            </div>

            {canPostFeed && (
              <div className="mt-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Nova postagem
                </div>
                <textarea
                  value={feedDraft}
                  onChange={(event) => setFeedDraft(event.target.value)}
                  placeholder="Compartilhe uma atualização com o time..."
                  className="mt-2 min-h-[96px] w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-[240px] flex-1">
                    <MultiFilterSelect
                      options={feedTaskOptions}
                      values={feedMentions}
                      onChange={setFeedMentions}
                      placeholder="Mencionar tarefas"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void submitFeedPost();
                    }}
                    disabled={feedSubmitting || !feedDraft.trim()}
                    className="inline-flex items-center justify-center rounded-lg border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-cyan-400/40 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {feedSubmitting ? 'Publicando...' : 'Publicar'}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                  Use as menções para relacionar tarefas no feed.
                </p>
              </div>
            )}

            <div className="relative mt-6">
              <div className="absolute left-3 top-0 h-full w-px bg-[var(--panel-border)]" />
              <div className="space-y-4">
                {feedItems.map((item) => {
                  const taskIds = item.taskIds ?? [];
                  const isPost = item.kind === 'post';
                  const eventTypeLabel =
                    item.kind === 'event'
                      ? item.eventType === 'time'
                        ? 'Tempo'
                        : item.eventType === 'due'
                          ? 'Prazo'
                          : item.eventType === 'comment'
                            ? 'Comentário'
                            : item.eventType === 'extra'
                              ? 'Trabalho extra'
                            : 'Auditoria'
                      : '';
                  const canEditComment =
                    item.kind === 'event' &&
                    item.eventType === 'comment' &&
                    item.userId === currentUserId;
                  const isEditing = Boolean(
                    canEditComment && item.commentId && editingCommentId === item.commentId
                  );
                  return (
                    <div key={item.id} className="relative pl-10">
                      <div
                        className={`absolute left-1.5 top-4 h-3 w-3 rounded-full border ${
                          isPost
                            ? 'border-cyan-400/60 bg-cyan-400/30'
                            : 'border-[var(--panel-border)] bg-[var(--panel-bg)]'
                        }`}
                      />
                      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            {isPost ? 'Postagem' : `Log • ${eventTypeLabel}`}
                          </span>
                          <div className="flex items-center gap-3">
                            {canEditComment && (
                              <div className="flex items-center gap-2 text-[10px]">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentDraft('');
                                      }}
                                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!item.commentId || !item.taskId) return;
                                        void Promise.resolve(
                                          onUpdateTaskComment(item.taskId, item.commentId, editingCommentDraft)
                                        ).then(() => {
                                          setEditingCommentId(null);
                                          setEditingCommentDraft('');
                                        });
                                      }}
                                      className="text-[var(--accent)] hover:text-[var(--accent-strong)]"
                                      disabled={!editingCommentDraft.trim()}
                                    >
                                      Salvar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!item.commentId) return;
                                        setEditingCommentId(item.commentId);
                                        setEditingCommentDraft(item.content);
                                      }}
                                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!item.commentId || !item.taskId) return;
                                        if (!window.confirm('Remover este comentário?')) return;
                                        void Promise.resolve(
                                          onDeleteTaskComment(item.taskId, item.commentId)
                                        ).then(() => {
                                          setEditingCommentId(null);
                                          setEditingCommentDraft('');
                                        });
                                      }}
                                      className="text-rose-300 hover:text-rose-200"
                                    >
                                      Remover
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {new Date(item.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        {isEditing ? (
                          <textarea
                            value={editingCommentDraft}
                            onChange={(event) => setEditingCommentDraft(event.target.value)}
                            className="mt-2 w-full min-h-20 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          />
                        ) : (
                          <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                            {item.content}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          {memberAvatarMap.get(item.userId) ? (
                            <img
                              src={memberAvatarMap.get(item.userId) ?? ''}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[10px] font-semibold text-[var(--text-primary)]">
                              {getInitials(memberMap.get(item.userId) ?? item.userId)}
                            </div>
                          )}
                          <span>{memberMap.get(item.userId) ?? item.userId}</span>
                        </div>
                        {taskIds.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {taskIds.map((taskId) => {
                              const task = taskById.get(taskId);
                              const label = task?.description || task?.name || taskId;
                              return (
                                <button
                                  key={taskId}
                                  type="button"
                                  onClick={() => {
                                    void openTaskDetail(taskId);
                                  }}
                                  className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-[10px] text-cyan-200 hover:bg-cyan-500/20"
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!feedItems.length && (
                  <div className="pl-10 text-xs text-[var(--text-muted)]">
                    Sem interações registradas ainda.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[linear-gradient(160deg,rgba(14,165,233,0.08),rgba(2,6,23,0.06))] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Tarefas
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Visualize em lista, board ou calendário.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1">
                  <button
                    type="button"
                    onClick={() => setTaskViewMode('list')}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition ${
                      taskViewMode === 'list'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <List size={13} />
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskViewMode('board')}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition ${
                      taskViewMode === 'board'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <LayoutList size={13} />
                    Board
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskViewMode('calendar')}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition ${
                      taskViewMode === 'calendar'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Calendar size={13} />
                    Calendário
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskGridFilters(DEFAULT_TASK_GRID_FILTERS)}
                  className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Limpar filtros
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void downloadTaskGrid();
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <Download size={13} />
                  Baixar planilha
                </button>
              </div>
            </div>

            {taskViewMode === 'list' && (
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] overflow-visible">
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="min-w-[1260px] w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--panel-border)] text-left text-[var(--text-secondary)] uppercase tracking-[0.15em] bg-[var(--panel-bg-soft)]">
                      <th className="px-3 py-3 font-semibold">Descrição</th>
                      <th className="px-3 py-2 font-semibold">Projeto</th>
                      <th className="px-3 py-2 font-semibold">Setor</th>
                      <th className="px-3 py-2 font-semibold">Tipo</th>
                      <th className="px-3 py-2 font-semibold">Prioridade</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Prazo</th>
                      <th className="px-3 py-2 font-semibold">Executor</th>
                      <th className="px-3 py-2 font-semibold">Situação</th>
                    </tr>
                    <tr className="border-b border-[var(--panel-border)] bg-[var(--panel-bg)]">
                      <th className="px-2 py-2">
                        <input
                          value={taskGridFilters.description}
                          onChange={(event) =>
                            setTaskGridFilters((prev) => ({ ...prev, description: event.target.value }))
                          }
                          className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs"
                          placeholder="Filtrar..."
                        />
                      </th>
                      <th className="px-2 py-2">
                        <MultiFilterSelect
                          options={projectFilterOptions}
                          values={taskGridFilters.projects}
                          onChange={(next) =>
                            setTaskGridFilters((prev) => ({
                              ...prev,
                              projects: next
                            }))
                          }
                          placeholder="Projetos"
                        />
                      </th>
                      <th className="px-2 py-2">
                        <MultiFilterSelect
                          options={sectors.map((sector) => ({
                            value: sector.name,
                            label: sector.name
                          }))}
                          values={taskGridFilters.sectors}
                          onChange={(next) =>
                            setTaskGridFilters((prev) => ({
                              ...prev,
                              sectors: next
                            }))
                          }
                          placeholder="Setores"
                        />
                      </th>
                      <th className="px-2 py-2">
                        <MultiFilterSelect
                          options={taskTypes.map((type) => ({
                            value: type.name,
                            label: type.name
                          }))}
                          values={taskGridFilters.taskTypes}
                          onChange={(next) =>
                            setTaskGridFilters((prev) => ({
                              ...prev,
                              taskTypes: next
                            }))
                          }
                          placeholder="Tipos"
                        />
                      </th>
                      <th className="px-2 py-2">
                        <MultiFilterSelect
                          options={PRIORITY_OPTIONS.map((priority) => ({
                            value: priority,
                            label: priority
                          }))}
                          values={taskGridFilters.priorities}
                          onChange={(next) =>
                            setTaskGridFilters((prev) => ({
                              ...prev,
                              priorities: next as TaskPriority[]
                            }))
                          }
                          placeholder="Prioridades"
                        />
                      </th>
                      <th className="px-2 py-2">
                        <MultiFilterSelect
                          options={statusOptions.map((status) => ({
                            value: status,
                            label: status
                          }))}
                          values={taskGridFilters.statuses}
                          onChange={(next) =>
                            setTaskGridFilters((prev) => ({
                              ...prev,
                              statuses: next as TaskStatus[]
                            }))
                          }
                          placeholder="Status"
                        />
                      </th>
                      <th className="px-2 py-2">
                        <input
                          type="date"
                          value={taskGridFilters.dueDate}
                          onChange={(event) =>
                            setTaskGridFilters((prev) => ({ ...prev, dueDate: event.target.value }))
                          }
                          className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1.5 text-xs"
                        />
                      </th>
                      <th className="px-2 py-2">
                        <MultiFilterSelect
                          options={executorFilterOptions}
                          values={taskGridFilters.executors}
                          onChange={(next) =>
                            setTaskGridFilters((prev) => ({
                              ...prev,
                              executors: next
                            }))
                          }
                          placeholder="Executores"
                        />
                      </th>
                      <th className="px-2 py-2">
                        <MultiFilterSelect
                          options={[
                            { value: 'No Prazo', label: 'No Prazo' },
                            { value: 'Finalizada', label: 'Finalizada' },
                            { value: 'Atrasada', label: 'Atrasada' }
                          ]}
                          values={taskGridFilters.situations}
                          onChange={(next) =>
                            setTaskGridFilters((prev) => ({
                              ...prev,
                              situations: next as TaskSituation[]
                            }))
                          }
                          placeholder="Situação"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskGridRows.map((row) => (
                      <tr
                        key={row.task.id}
                        onDoubleClick={() => {
                          void openTaskDetail(row.task.id);
                        }}
                        className="border-b border-[var(--panel-border)] align-top transition-colors odd:bg-[var(--panel-bg)] even:bg-[var(--card-bg)] hover:bg-[var(--muted-bg)] cursor-pointer"
                      >
                        <td className="px-3 py-3">
                          <p className="text-[var(--text-primary)] line-clamp-2 font-medium">
                            {row.task.description || 'Sem descrição'}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-[var(--text-secondary)]">
                          {row.projectLabel}
                        </td>
                        <td className="px-3 py-3 text-[var(--text-secondary)]">
                          {row.task.sector ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5"
                              style={{
                                borderColor: `${sectorColorMap.get(row.task.sector) ?? '#475569'}55`,
                                color: sectorColorMap.get(row.task.sector) ?? '#94a3b8'
                              }}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor: sectorColorMap.get(row.task.sector) ?? '#94a3b8'
                                }}
                              />
                              {row.task.sector}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-3 text-[var(--text-secondary)]">
                          {row.task.taskType ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5"
                              style={{
                                borderColor: `${taskTypeColorMap.get(row.task.taskType) ?? '#475569'}55`,
                                color: taskTypeColorMap.get(row.task.taskType) ?? '#94a3b8'
                              }}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor: taskTypeColorMap.get(row.task.taskType) ?? '#94a3b8'
                                }}
                              />
                              {row.task.taskType}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-3 text-[var(--text-secondary)]">{row.task.priority}</td>
                        <td className="px-3 py-3 text-[var(--text-secondary)]">{row.task.status}</td>
                        <td className="px-3 py-3 text-[var(--text-secondary)]">
                          {formatDatePtBr(row.task.dueDateCurrent || row.task.dueDateOriginal)}
                        </td>
                        <td className="px-3 py-3 text-[var(--text-secondary)]">
                          {row.executorLabel || '-'}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              row.situation === 'Finalizada'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : row.situation === 'Atrasada'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {row.situation}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            )}

            {taskViewMode === 'board' && (
              <div className="overflow-x-auto">
                <div className="flex min-w-[1100px] gap-4">
                  {groupedTasksByStatus.map((group) => (
                    <div
                      key={group.status}
                      className="w-72 flex-shrink-0 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {group.status}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">{group.tasks.length}</div>
                      </div>
                      <div className="space-y-2">
                        {group.tasks.map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => {
                              void openTaskDetail(task.id);
                            }}
                            className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-2 text-left hover:bg-[var(--muted-bg)]"
                          >
                            <div className="line-clamp-2 text-xs font-medium text-[var(--text-primary)]">
                              {task.description || 'Sem descrição'}
                            </div>
                            <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                              Prazo: {formatDatePtBr(task.dueDateCurrent || task.dueDateOriginal)}
                            </div>
                          </button>
                        ))}
                        {!group.tasks.length && (
                          <div className="rounded-md border border-dashed border-[var(--panel-border)] p-2 text-[11px] text-[var(--text-muted)]">
                            Sem tarefas
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {taskViewMode === 'calendar' && (
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const delta =
                          calendarView === 'month'
                            ? addMonths(calendarDate, -1)
                            : calendarView === 'week'
                              ? addWeeks(calendarDate, -1)
                              : addDays(calendarDate, -1);
                        setCalendarDate(delta);
                      }}
                      className="rounded-md border border-[var(--panel-border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarDate(new Date())}
                      className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const delta =
                          calendarView === 'month'
                            ? addMonths(calendarDate, 1)
                            : calendarView === 'week'
                              ? addWeeks(calendarDate, 1)
                              : addDays(calendarDate, 1);
                        setCalendarDate(delta);
                      }}
                      className="rounded-md border border-[var(--panel-border)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatDateFns(calendarDate, 'dd/MM/yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    {(['month', 'week', 'day'] as const).map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setCalendarView(view)}
                        className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                          calendarView === view
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {view === 'month' ? 'Mês' : view === 'week' ? 'Semana' : 'Dia'}
                      </button>
                    ))}
                  </div>
                </div>

                {calendarView === 'month' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label) => (
                        <div key={label} className="py-1 text-center">{label}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {eachDayOfInterval({
                        start: startOfWeek(startOfMonth(calendarDate)),
                        end: endOfWeek(endOfMonth(calendarDate))
                      }).map((day) => {
                        const dayKey = formatDateFns(day, 'yyyy-MM-dd');
                        const dayEvents = eventsByDay.get(dayKey) ?? [];
                        const currentMonth = isSameMonth(day, calendarDate);
                        const currentDay = isToday(day);
                        return (
                          <div
                            key={dayKey}
                            className={`min-h-[110px] rounded-md border p-2 ${
                              currentDay
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                                : currentMonth
                                  ? 'border-[var(--panel-border)] bg-[var(--panel-bg-soft)]'
                                  : 'border-[var(--panel-border)] bg-[var(--muted-bg)] opacity-70'
                            }`}
                          >
                            <div
                              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                                currentDay ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              {formatDateFns(day, 'dd')}
                            </div>
                            <div className="mt-2 space-y-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <button
                                  key={event.period.id}
                                  type="button"
                                  onClick={() => {
                                    void openTaskDetail(event.task.id);
                                  }}
                                  className="w-full truncate rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-1.5 py-1 text-left text-[10px] text-[var(--text-primary)] hover:bg-[var(--muted-bg)]"
                                >
                                  {formatDateFns(event.start, 'HH:mm')} {event.task.description || 'Sem descrição'}
                                </button>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-[10px] text-[var(--text-muted)]">
                                  +{dayEvents.length - 2} períodos
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {calendarView === 'week' && (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
                    {eachDayOfInterval({
                      start: startOfWeek(calendarDate),
                      end: endOfWeek(calendarDate)
                    }).map((day) => {
                      const dayKey = formatDateFns(day, 'yyyy-MM-dd');
                      const dayEvents = eventsByDay.get(dayKey) ?? [];
                      const currentDay = isToday(day);
                      return (
                        <div
                          key={dayKey}
                          className={`rounded-md border p-2 ${
                            currentDay
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                              : 'border-[var(--panel-border)] bg-[var(--panel-bg-soft)]'
                          }`}
                        >
                          <div className={`text-[11px] font-semibold ${currentDay ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
                            {weekDayNames[day.getDay()]} • {formatDateFns(day, 'dd/MM')} {currentDay ? '• Hoje' : ''}
                          </div>
                          <div className="mt-2 space-y-1">
                            {dayEvents.map((event) => (
                              <button
                                key={event.period.id}
                                type="button"
                                onClick={() => {
                                  void openTaskDetail(event.task.id);
                                }}
                                className="w-full truncate rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-1.5 py-1 text-left text-[10px] text-[var(--text-primary)] hover:bg-[var(--muted-bg)]"
                              >
                                {formatDateFns(event.start, 'HH:mm')} {event.task.description || 'Sem descrição'}
                              </button>
                            ))}
                            {!dayEvents.length && (
                              <div className="text-[10px] text-[var(--text-muted)]">Sem períodos</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {calendarView === 'day' && (
                  <div
                    className={`rounded-md border p-3 ${
                      isToday(calendarDate)
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--panel-border)] bg-[var(--panel-bg-soft)]'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${isToday(calendarDate) ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                      {formatDateFns(calendarDate, 'dd/MM/yyyy')} {isToday(calendarDate) ? '• Hoje' : ''}
                    </div>
                    <div className="mt-3 space-y-2">
                      {(eventsByDay.get(formatDateFns(calendarDate, 'yyyy-MM-dd')) ?? []).map((event) => (
                        <button
                          key={event.period.id}
                          type="button"
                          onClick={() => {
                            void openTaskDetail(event.task.id);
                          }}
                          className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--muted-bg)]"
                        >
                          {formatDateFns(event.start, 'HH:mm')} - {formatDateFns(event.end, 'HH:mm')} •{' '}
                          {event.task.description || 'Sem descrição'}
                        </button>
                      ))}
                      {!((eventsByDay.get(formatDateFns(calendarDate, 'yyyy-MM-dd')) ?? []).length) && (
                        <div className="text-xs text-[var(--text-muted)]">Nenhum período planejado.</div>
                      )}
                    </div>
                  </div>
                )}

                {!scheduledEvents.length && (
                  <div className="mt-3 text-xs text-[var(--text-muted)]">
                    Nenhuma tarefa filtrada possui períodos de execução definidos.
                  </div>
                )}
              </div>
            )}

            {!taskGridRows.length && (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--muted-bg)] p-5 text-center text-sm text-[var(--text-secondary)]">
                Nenhuma tarefa encontrada com os filtros atuais.
              </div>
            )}
          </div>
        )}
      </div>

      {detailTask && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setDetailTaskId(null)}
          />
          <div className="fixed top-0 right-0 z-50 h-full w-[800px] border-l border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-6 py-4">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Detalhes da tarefa</h3>
                  <p className="text-xs text-[var(--text-muted)]">{detailTask.status}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailTaskId(null)}
                  className="rounded p-1 hover:bg-[var(--muted-bg)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--panel-border)] px-6">
                <button
                  type="button"
                  onClick={() => setDetailTaskTab('info')}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    detailTaskTab === 'info'
                      ? 'border-[var(--accent)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Informações
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTaskTab('time')}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    detailTaskTab === 'time'
                      ? 'border-[var(--accent)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Controle de Tempo
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTaskTab('deadline')}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    detailTaskTab === 'deadline'
                      ? 'border-[var(--accent)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Prazos
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTaskTab('comments')}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    detailTaskTab === 'comments'
                      ? 'border-[var(--accent)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Comentários
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTaskTab('logs')}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    detailTaskTab === 'logs'
                      ? 'border-[var(--accent)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Logs
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingTaskDetails && (
                  <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] px-3 py-2 text-xs text-[var(--text-muted)]">
                    Carregando dados da tarefa...
                  </div>
                )}

                {detailTaskTab === 'info' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Descrição</label>
                      <div className="min-h-20 rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--text-primary)]">
                        {detailTask.description || 'Sem descrição'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">Setor</label>
                        <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                          {detailTask.sector || '-'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">Tipo</label>
                        <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                          {detailTask.taskType || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">Prioridade</label>
                        <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                          {detailTask.priority}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">Status</label>
                        <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                          {detailTask.status}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Executor</label>
                      <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                        {detailTask.executorIds.map((id) => memberMap.get(id) ?? id).join(', ') || '-'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Validador</label>
                      <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                        {detailTask.validatorIds.map((id) => memberMap.get(id) ?? id).join(', ') || '-'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Informar</label>
                      <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                        {detailTask.informIds.map((id) => memberMap.get(id) ?? id).join(', ') || '-'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">Início</label>
                        <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                          {formatDatePtBr(detailTask.startDate)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">Prazo de Entrega</label>
                        <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                          {formatDatePtBr(detailTask.dueDateOriginal)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {detailTaskTab === 'time' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">Tempo estimado</label>
                        <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                          {formatMinutes(detailTask.estimatedMinutes)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-[var(--text-secondary)]">Tempo efetivado</label>
                        <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                          {formatMinutes(detailTask.actualMinutes)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-[var(--text-secondary)]">Histórico de tempo</div>
                      <div className="space-y-2">
                        {(timeEntries[detailTask.id] ?? []).map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs"
                          >
                            <div>
                              <div className="font-medium text-[var(--text-primary)]">
                                {formatMinutes(entry.durationMinutes)} ({entry.source})
                              </div>
                              <div className="text-[var(--text-muted)]">
                                {formatDatePtBr(entry.startedAt)} - {formatDatePtBr(entry.endedAt)}
                              </div>
                            </div>
                            <div className="text-[var(--text-muted)]">{entry.note || '-'}</div>
                          </div>
                        ))}
                        {(timeEntries[detailTask.id] ?? []).length === 0 && (
                          <div className="text-xs text-[var(--text-muted)]">Sem registros.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {detailTaskTab === 'deadline' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Prazo Atual</label>
                      <div className="rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm">
                        {formatDatePtBr(detailTask.dueDateCurrent || detailTask.dueDateOriginal)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-[var(--text-secondary)]">Histórico de prazo</div>
                      <div className="space-y-2">
                        {(dueDateChanges[detailTask.id] ?? []).map((change) => (
                          <div
                            key={change.id}
                            className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs"
                          >
                            <div className="font-medium text-[var(--text-primary)]">
                              {formatDatePtBr(change.previousDate)} → {formatDatePtBr(change.newDate)}
                            </div>
                            <div className="text-[var(--text-muted)]">{change.reason || '-'}</div>
                          </div>
                        ))}
                        {(dueDateChanges[detailTask.id] ?? []).length === 0 && (
                          <div className="text-xs text-[var(--text-muted)]">Sem alterações.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {detailTaskTab === 'logs' && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">Auditoria</div>
                    <div className="space-y-2">
                      {(auditLogs[detailTask.id] ?? []).map((log) => (
                        <div
                          key={log.id}
                          className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs"
                        >
                          <div className="font-medium text-[var(--text-primary)]">{log.field}</div>
                          <div className="text-[var(--text-muted)]">
                            {formatAuditValue(log.field, log.oldValue)} →{' '}
                            {formatAuditValue(log.field, log.newValue)}
                          </div>
                          <div className="text-[var(--text-muted)]">
                            {memberMap.get(log.changedBy) ?? log.changedBy} •{' '}
                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      ))}
                      {(auditLogs[detailTask.id] ?? []).length === 0 && (
                        <div className="text-xs text-[var(--text-muted)]">Sem registros.</div>
                      )}
                    </div>
                  </div>
                )}

                {detailTaskTab === 'comments' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">
                        Novo comentário
                      </label>
                      <textarea
                        value={commentDraft}
                        onChange={(event) => setCommentDraft(event.target.value)}
                        className="w-full min-h-20 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        placeholder="Escreva um comentário..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void Promise.resolve(onAddTaskComment(detailTask.id, commentDraft)).then(() => {
                            setCommentDraft('');
                          });
                        }}
                        className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                        disabled={!commentDraft.trim()}
                      >
                        Comentar
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(taskComments[detailTask.id] ?? []).map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                            <span>
                              {memberMap.get(comment.createdBy) ?? comment.createdBy} •{' '}
                              {new Date(comment.createdAt).toLocaleString('pt-BR')}
                            </span>
                            {comment.createdBy === currentUserId && (
                              <div className="flex items-center gap-2">
                                {editingCommentId === comment.id ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentDraft('');
                                      }}
                                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void Promise.resolve(
                                          onUpdateTaskComment(detailTask.id, comment.id, editingCommentDraft)
                                        ).then(() => {
                                          setEditingCommentId(null);
                                          setEditingCommentDraft('');
                                        });
                                      }}
                                      className="text-[var(--accent)] hover:text-[var(--accent-strong)]"
                                      disabled={!editingCommentDraft.trim()}
                                    >
                                      Salvar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingCommentDraft(comment.content);
                                      }}
                                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!window.confirm('Remover este comentário?')) return;
                                        void Promise.resolve(
                                          onDeleteTaskComment(detailTask.id, comment.id)
                                        ).then(() => {
                                          setEditingCommentId(null);
                                          setEditingCommentDraft('');
                                        });
                                      }}
                                      className="text-rose-300 hover:text-rose-200"
                                    >
                                      Remover
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          {editingCommentId === comment.id ? (
                            <textarea
                              value={editingCommentDraft}
                              onChange={(event) => setEditingCommentDraft(event.target.value)}
                              className="mt-2 w-full min-h-20 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                          ) : (
                            <div className="mt-1 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                              {comment.content}
                            </div>
                          )}
                        </div>
                      ))}
                      {(taskComments[detailTask.id] ?? []).length === 0 && (
                        <div className="text-xs text-[var(--text-muted)]">Sem comentários.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
