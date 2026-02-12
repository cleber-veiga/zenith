import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CustomSelect } from '../../components/CustomSelect';
import { SingleDatePicker } from '../../components/SingleDatePicker';
import { TimeInput } from '../../components/TimeInput';
import ExcelJS from 'exceljs';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Flag,
  LayoutList,
  List,
  Plus,
  Timer,
  Trash2,
  Upload,
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
import type {
  Project,
  ProjectExtraWorkEntry,
  ProjectTask,
  TaskAuditLog,
  TaskComment,
  TaskDueDateChange,
  TaskExecutionPeriod,
  TaskPriority,
  TaskStatus,
  TaskTimeEntry,
  WorkspaceTagOption
} from '../../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type MemberOption = {
  id: string;
  label: string;
  email?: string;
  avatarUrl?: string | null;
};

type ProjectSectionProps = {
  project: Project | null;
  tasks: ProjectTask[];
  extraWorkEntries: ProjectExtraWorkEntry[];
  members: MemberOption[];
  sectors: WorkspaceTagOption[];
  taskTypes: WorkspaceTagOption[];
  currentUserId: string;
  timeEntries: Record<string, TaskTimeEntry[]>;
  dueDateChanges: Record<string, TaskDueDateChange[]>;
  auditLogs: Record<string, TaskAuditLog[]>;
  taskComments: Record<string, TaskComment[]>;
  onLoadTaskExtras: (taskId: string) => void;
  onAddTask: (task: Omit<ProjectTask, 'id'>) => void;
  onAddTasksBulk: (
    tasks: Array<Omit<ProjectTask, 'id'>>
  ) => Promise<{ created: number; failed: number; message?: string }>;
  onUpdateTask: (taskId: string, updates: Partial<ProjectTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTimeEntry: (
    taskId: string,
    entry: Omit<TaskTimeEntry, 'id' | 'taskId' | 'createdBy'>
  ) => void;
  onAddDueDateChange: (taskId: string, newDate: string, reason: string) => void;
  onAddTaskComment: (taskId: string, content: string) => Promise<void> | void;
  onAddExtraWorkEntry: (
    entry: Omit<ProjectExtraWorkEntry, 'id' | 'projectId' | 'createdBy' | 'createdAt'>
  ) => void;
};

type TaskFilters = {
  query: string;
  sector: string;
  taskType: string;
  priority: TaskPriority | '';
  status: TaskStatus | '';
  executorId: string;
  dueDate: string;
};

const priorityOptions: TaskPriority[] = ['Baixa', 'Média', 'Alta', 'Crítica'];
const weekDayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;
const statusOptions: TaskStatus[] = [
  'Backlog',
  'Pendente',
  'Em Execução',
  'Em Validação',
  'Concluída',
  'Bloqueada',
  'Cancelada'
];

const statusColors: Record<TaskStatus, string> = {
  Backlog: 'bg-slate-500 text-white',
  Pendente: 'bg-indigo-500 text-white',
  'Em Execução': 'bg-blue-500 text-white',
  'Em Validação': 'bg-amber-500 text-white',
  Concluída: 'bg-emerald-500 text-white',
  Bloqueada: 'bg-rose-500 text-white',
  Cancelada: 'bg-neutral-500 text-white'
};

const statusTextColors: Record<TaskStatus, string> = {
  Backlog: 'text-slate-500',
  Pendente: 'text-indigo-500',
  'Em Execução': 'text-blue-500',
  'Em Validação': 'text-amber-500',
  Concluída: 'text-emerald-500',
  Bloqueada: 'text-rose-500',
  Cancelada: 'text-neutral-500'
};

const priorityFlags: Record<TaskPriority, string> = {
  Baixa: 'text-emerald-500',
  Média: 'text-amber-500',
  Alta: 'text-orange-500',
  Crítica: 'text-rose-500'
};

const createExecutionPeriod = (): TaskExecutionPeriod => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `period-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  date: '',
  startTime: '',
  endTime: ''
});

const getEmptyTask = (description: string, status: TaskStatus): Omit<ProjectTask, 'id'> => ({
  name: description.trim() || '',
  description: description.trim() || '',
  sector: '',
  taskType: '',
  executorIds: [],
  validatorIds: [],
  informIds: [],
  startDate: '',
  dueDateOriginal: '',
  dueDateCurrent: '',
  estimatedMinutes: 0,
  actualMinutes: 0,
  executionPeriods: [],
  priority: 'Média',
  status,
  displayOrder: 0
});

const formatDate = (value?: string) => {
  if (!value) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
};

const formatMinutes = (minutes: number) => {
  const total = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
};

const formatStopwatch = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const toIsoDate = (value: string) => value;
const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDateValue = (value: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

const getExecutionPeriodError = (period: TaskExecutionPeriod, dueDateCurrent: string) => {
  if (period.date && dueDateCurrent && period.date > dueDateCurrent) {
    return 'Deve ser até o prazo atual.';
  }
  if (period.date && period.startTime && period.endTime && period.endTime <= period.startTime) {
    return 'Fim deve ser depois do início.';
  }
  return '';
};

const DEFAULT_TASK_FILTERS: TaskFilters = {
  query: '',
  sector: '',
  taskType: '',
  priority: '',
  status: '',
  executorId: '',
  dueDate: ''
};

function MultiSelect({
  valueIds,
  options,
  placeholder,
  onChange
}: {
  valueIds: string[];
  options: MemberOption[];
  placeholder: string;
  onChange: (nextIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((opt) => valueIds.includes(opt.id));

  const toggleId = (id: string) => {
    if (valueIds.includes(id)) {
      onChange(valueIds.filter((item) => item !== id));
      return;
    }
    onChange([...valueIds, id]);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected.length === 0 ? (
            <span className="text-[var(--text-muted)]">{placeholder}</span>
          ) : selected.length === 1 ? (
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-full border border-[var(--panel-border)] bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                title={selected[0].label}
              >
                {selected[0].label.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs truncate">{selected[0].label}</span>
            </div>
          ) : (
            <div className="flex -space-x-2">
              {selected.slice(0, 3).map((opt) => (
                <div
                  key={opt.id}
                  className="h-6 w-6 rounded-full border border-[var(--panel-border)] bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold"
                  title={opt.label}
                >
                  {opt.label.charAt(0).toUpperCase()}
                </div>
              ))}
              {selected.length > 3 && (
                <div className="h-6 w-6 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[10px] font-bold text-[var(--text-secondary)] flex items-center justify-center">
                  +{selected.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
        <ChevronDown size={14} className="text-[var(--text-muted)]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-xl p-2">
          <div className="max-h-56 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleId(opt.id);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--muted-bg)]"
              >
                <span
                  className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold"
                  title={opt.label}
                >
                  {opt.label.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 text-left truncate">{opt.label}</span>
                {valueIds.includes(opt.id) && <Check size={14} className="text-[var(--accent)]" />}
              </button>
            ))}
            {!options.length && (
              <div className="px-2 py-3 text-xs text-[var(--text-muted)]">Sem membros.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectSection({
  project,
  tasks,
  extraWorkEntries,
  members,
  sectors,
  taskTypes,
  currentUserId,
  timeEntries,
  dueDateChanges,
  auditLogs,
  taskComments,
  onLoadTaskExtras,
  onAddTask,
  onAddTasksBulk,
  onUpdateTask,
  onDeleteTask,
  onAddTimeEntry,
  onAddDueDateChange,
  onAddTaskComment,
  onAddExtraWorkEntry
}: ProjectSectionProps) {
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar' | 'extras'>('list');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<TaskStatus, boolean>>(
    () =>
      statusOptions.reduce<Record<TaskStatus, boolean>>((acc, status) => {
        acc[status] = false;
        return acc;
      }, {} as Record<TaskStatus, boolean>)
  );
  const [newTaskNames, setNewTaskNames] = useState<Record<string, string>>({});
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'time' | 'deadline' | 'comments' | 'logs'>('info');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  const [executionErrors, setExecutionErrors] = useState<Record<string, string>>({});
  const [taskFilters, setTaskFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS);

  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<Date | null>(null);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [manualNote, setManualNote] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [dueDateReason, setDueDateReason] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [extraDescription, setExtraDescription] = useState('');
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [extraWorkedAt, setExtraWorkedAt] = useState(getTodayIsoDate());
  const [extraNote, setExtraNote] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  useEffect(() => {
    if (!timerTaskId || !timerStartedAt) return;
    const interval = window.setInterval(() => {
      setTimerElapsed(Date.now() - timerStartedAt.getTime());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerTaskId, timerStartedAt]);

  const openDrawer = (taskId: string) => {
    setDrawerTaskId(taskId);
    setActiveTab('info');
    setNewDueDate('');
    setDueDateReason('');
    setManualMinutes(0);
    setManualNote('');
    setCommentDraft('');
    setExecutionErrors({});
    onLoadTaskExtras(taskId);
  };

  const closeDrawer = () => {
    setDrawerTaskId(null);
    setNewDueDate('');
    setDueDateReason('');
    setManualMinutes(0);
    setManualNote('');
    setCommentDraft('');
    setExecutionErrors({});
  };

  const selectedTask = tasks.find((task) => task.id === drawerTaskId) ?? null;

  const memberOptions = useMemo(() => {
    const seen = new Set<string>();
    const options = members.filter((member) => {
      if (seen.has(member.id)) return false;
      seen.add(member.id);
      return true;
    });
    return options.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [members, currentUserId]);

  const memberLabelById = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => {
      map.set(member.id, member.label);
    });
    return map;
  }, [members]);

  const memberIdByEmail = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => {
      const email = member.email?.trim().toLowerCase();
      if (email) {
        map.set(email, member.id);
      }
    });
    return map;
  }, [members]);

  const executorFilterOptions = useMemo(
    () => [
      { value: '', label: 'Todos executores' },
      ...memberOptions.map((member) => ({
        value: member.id,
        label: member.label,
        id: member.id,
        email: member.email,
        avatarUrl: member.avatarUrl ?? undefined
      }))
    ],
    [memberOptions]
  );

  const hasActiveFilters = useMemo(
    () =>
      Object.values(taskFilters).some((value) =>
        typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
      ),
    [taskFilters]
  );

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
            .map((id) => (typeof id === 'string' ? memberLabelById.get(id) ?? id : String(id)))
            .join(', ');
        }
      } catch {
        // Fall back to raw value when not valid JSON.
      }
    }
    return value;
  };

  const filteredTasks = useMemo(() => {
    const query = taskFilters.query.trim().toLowerCase();
    const indexed = tasks.map((task, index) => ({ task, index }));
    return indexed
      .filter(({ task }) => {
      if (query) {
        const haystack = `${task.description || ''} ${task.name || ''}`.trim().toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (taskFilters.sector && task.sector !== taskFilters.sector) return false;
      if (taskFilters.taskType && task.taskType !== taskFilters.taskType) return false;
      if (taskFilters.priority && task.priority !== taskFilters.priority) return false;
      if (taskFilters.status && task.status !== taskFilters.status) return false;
      if (taskFilters.executorId && !task.executorIds.includes(taskFilters.executorId)) return false;
      if (taskFilters.dueDate) {
        const dueDateValue = normalizeDateValue(
          task.dueDateCurrent || task.dueDateOriginal || ''
        );
        if (dueDateValue !== taskFilters.dueDate) return false;
      }
      return true;
    })
      .sort((a, b) => {
        if (a.task.status !== b.task.status) return 0;
        const orderA = a.task.displayOrder ?? a.index;
        const orderB = b.task.displayOrder ?? b.index;
        return orderA - orderB;
      })
      .map(({ task }) => task);
  }, [taskFilters, tasks]);

  const scheduledEvents = useMemo(() => {
    return filteredTasks.flatMap((task) =>
      (task.executionPeriods ?? [])
        .map((period) => {
          if (!period.date || !period.startTime || !period.endTime) return null;
          const start = new Date(`${period.date}T${period.startTime}:00`);
          const end = new Date(`${period.date}T${period.endTime}:00`);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
          return { task, period, start, end };
        })
        .filter(Boolean)
    ) as Array<{ task: ProjectTask; period: TaskExecutionPeriod; start: Date; end: Date }>;
  }, [filteredTasks]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Array<{ task: ProjectTask; period: TaskExecutionPeriod; start: Date; end: Date }>>();
    scheduledEvents.forEach((event) => {
      const key = formatDateFns(event.start, 'yyyy-MM-dd');
      const items = map.get(key) ?? [];
      items.push(event);
      map.set(key, items);
    });
    map.forEach((items) =>
      items.sort((a, b) => a.start.getTime() - b.start.getTime())
    );
    return map;
  }, [scheduledEvents]);

  if (!project) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--muted-bg)] p-8 text-center text-sm text-[var(--text-secondary)]">
        Selecione um projeto para começar a organizar as tarefas.
      </div>
    );
  }

  const groupedTasks = statusOptions
    .map((status) => ({
      status,
      tasks: filteredTasks.filter((task) => task.status === status)
    }))
    .filter((group) => (!hasActiveFilters ? true : group.tasks.length > 0));

  const gridTemplate =
    '100px minmax(260px, 1.4fr) minmax(180px, 1fr) minmax(160px, 1fr) minmax(120px, 0.7fr) minmax(200px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr) minmax(160px, 1fr) minmax(180px, 1fr) minmax(200px, 1fr) minmax(160px, 0.9fr) minmax(160px, 0.9fr) 48px';

  const handleQuickAddTask = (status: TaskStatus) => {
    const description = newTaskNames[status]?.trim();
    if (!description) return;
    onAddTask(getEmptyTask(description, status));
    setNewTaskNames((prev) => ({ ...prev, [status]: '' }));
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (hasActiveFilters) {
      alert('Limpe os filtros para reordenar tarefas.');
      return;
    }
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    const sourceStatus = source.droppableId as TaskStatus;
    const destinationStatus = destination.droppableId as TaskStatus;
    const getOrder = (task: ProjectTask) => {
      const fallback = tasks.findIndex((item) => item.id === task.id);
      return task.displayOrder ?? fallback;
    };
    const allSourceTasks = tasks
      .filter((task) => task.status === sourceStatus)
      .slice()
      .sort((a, b) => getOrder(a) - getOrder(b));
    const allDestinationTasks =
      sourceStatus === destinationStatus
        ? allSourceTasks
        : tasks
            .filter((task) => task.status === destinationStatus)
            .slice()
            .sort((a, b) => getOrder(a) - getOrder(b));

    const sourceIndex = allSourceTasks.findIndex((task) => task.id === draggableId);
    if (sourceIndex < 0) return;
    const [movedTask] = allSourceTasks.splice(sourceIndex, 1);
    allDestinationTasks.splice(destination.index, 0, movedTask);

    if (sourceStatus === destinationStatus) {
      allSourceTasks.forEach((task, index) => {
        if (task.displayOrder !== index) {
          onUpdateTask(task.id, { displayOrder: index });
        }
      });
      return;
    }

    allSourceTasks.forEach((task, index) => {
      if (task.displayOrder !== index) onUpdateTask(task.id, { displayOrder: index });
    });
    allDestinationTasks.forEach((task, index) => {
      const updates: Partial<ProjectTask> = {};
      if (task.displayOrder !== index) updates.displayOrder = index;
      if (task.id === movedTask.id) updates.status = destinationStatus;
      if (Object.keys(updates).length) onUpdateTask(task.id, updates);
    });
  };

  const moveTaskInList = (taskId: string, status: TaskStatus, direction: 'up' | 'down') => {
    const getOrder = (task: ProjectTask) => {
      const fallback = tasks.findIndex((item) => item.id === task.id);
      return task.displayOrder ?? fallback;
    };
    const statusTasks = tasks
      .filter((task) => task.status === status)
      .slice()
      .sort((a, b) => getOrder(a) - getOrder(b));
    const currentIndex = statusTasks.findIndex((task) => task.id === taskId);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= statusTasks.length) return;
    const [moved] = statusTasks.splice(currentIndex, 1);
    statusTasks.splice(targetIndex, 0, moved);
    statusTasks.forEach((task, index) => {
      if ((task.displayOrder ?? 0) !== index) {
        onUpdateTask(task.id, { displayOrder: index });
      }
    });
  };

  const renderPeople = (ids: string[]) => {
    if (!ids.length) {
      return <span className="text-[var(--text-muted)]">-</span>;
    }
    return (
      <div className="flex -space-x-2">
        {ids.slice(0, 3).map((id) => {
          const member = memberMap.get(id);
          const label = member?.label ?? 'U';
          return (
            <div
              key={id}
              className="h-6 w-6 rounded-full border border-[var(--panel-border)] bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold"
              title={label}
            >
              {label.charAt(0).toUpperCase()}
            </div>
          );
        })}
        {ids.length > 3 && (
          <div className="h-6 w-6 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[10px] font-bold text-[var(--text-secondary)] flex items-center justify-center">
            +{ids.length - 3}
          </div>
        )}
      </div>
    );
  };

  const handleAddExecutionPeriod = () => {
    if (!selectedTask) return;
    const nextPeriods = [...(selectedTask.executionPeriods ?? []), createExecutionPeriod()];
    onUpdateTask(selectedTask.id, { executionPeriods: nextPeriods });
  };

  const handleUpdateExecutionPeriod = (
    periodId: string,
    updates: Partial<TaskExecutionPeriod>
  ) => {
    if (!selectedTask) return;
    const current = selectedTask.executionPeriods ?? [];
    const next = current.map((period) =>
      period.id === periodId ? { ...period, ...updates } : period
    );
    const updated = next.find((period) => period.id === periodId);
    if (!updated) return;
    const error = getExecutionPeriodError(updated, selectedTask.dueDateCurrent);
    setExecutionErrors((prev) => ({ ...prev, [periodId]: error }));
    if (error) return;
    onUpdateTask(selectedTask.id, { executionPeriods: next });
  };

  const handleRemoveExecutionPeriod = (periodId: string) => {
    if (!selectedTask) return;
    const next = (selectedTask.executionPeriods ?? []).filter((period) => period.id !== periodId);
    onUpdateTask(selectedTask.id, { executionPeriods: next });
    setExecutionErrors((prev) => {
      const { [periodId]: _, ...rest } = prev;
      return rest;
    });
  };

  const stopDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const downloadTemplate = () => {
    const header = [
      'descricao',
      'setor',
      'tipo',
      'prioridade',
      'status',
      'prazo_entrega',
      'prazo_entrega_atual',
      'executor_email',
      'validador_email',
      'tempo_estimado_min'
    ];
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tarefas');
    const optionsSheet = workbook.addWorksheet('Opcoes');

    sheet.addRow(header);
    sheet.addRow([
      'Exemplo de tarefa',
      sectors[0]?.name ?? '',
      taskTypes[0]?.name ?? '',
        'Média',
        'Pendente',
        '2026-02-28',
        '',
        members.find((member) => member.email)?.email ?? '',
        members.find((member) => member.email)?.email ?? '',
        120
      ]);

    const prioridades = priorityOptions;
    const statuses = statusOptions;

    optionsSheet.getCell('A1').value = 'setores';
    sectors.forEach((sector, idx) => {
      optionsSheet.getCell(`A${idx + 2}`).value = sector.name;
    });
    optionsSheet.getCell('B1').value = 'tipos';
    taskTypes.forEach((type, idx) => {
      optionsSheet.getCell(`B${idx + 2}`).value = type.name;
    });
    optionsSheet.getCell('C1').value = 'prioridades';
    prioridades.forEach((priority, idx) => {
      optionsSheet.getCell(`C${idx + 2}`).value = priority;
    });
    optionsSheet.getCell('D1').value = 'status';
    statuses.forEach((status, idx) => {
      optionsSheet.getCell(`D${idx + 2}`).value = status;
    });
    optionsSheet.getCell('E1').value = 'emails_executor';
    optionsSheet.getCell('F1').value = 'emails_validador';
    const memberEmails = members
      .map((member) => member.email?.trim())
      .filter((email): email is string => Boolean(email));
    memberEmails.forEach((email, idx) => {
      optionsSheet.getCell(`E${idx + 2}`).value = email;
      optionsSheet.getCell(`F${idx + 2}`).value = email;
    });
    optionsSheet.state = 'hidden';

    const maxRows = 500;
    for (let row = 2; row <= maxRows; row += 1) {
      sheet.getCell(`B${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Opcoes!$A$2:$A$${Math.max(2, sectors.length + 1)}`]
      };
      sheet.getCell(`C${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Opcoes!$B$2:$B$${Math.max(2, taskTypes.length + 1)}`]
      };
      sheet.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Opcoes!$C$2:$C$${prioridades.length + 1}`]
      };
      sheet.getCell(`E${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Opcoes!$D$2:$D$${statuses.length + 1}`]
      };
      sheet.getCell(`H${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Opcoes!$E$2:$E$${Math.max(2, memberEmails.length + 1)}`]
      };
      sheet.getCell(`I${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Opcoes!$F$2:$F$${Math.max(2, memberEmails.length + 1)}`]
      };
    }

    sheet.columns = [
      { width: 42 },
      { width: 22 },
      { width: 22 },
      { width: 16 },
      { width: 18 },
      { width: 16 },
      { width: 20 },
      { width: 34 },
      { width: 34 },
      { width: 18 }
    ];

    void workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'modelo_tarefas.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  const parseCsvLine = (line: string, delimiter: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && char === delimiter) {
        result.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    result.push(current.trim());
    return result;
  };

  const normalizeStatus = (value: string): TaskStatus | null => {
    const normalized = value.trim().toLowerCase();
    const statusMap: Record<string, TaskStatus> = {
      backlog: 'Backlog',
      pendente: 'Pendente',
      'em execução': 'Em Execução',
      'em execucao': 'Em Execução',
      'em validacao': 'Em Validação',
      'em validação': 'Em Validação',
      concluida: 'Concluída',
      concluída: 'Concluída',
      bloqueada: 'Bloqueada',
      cancelada: 'Cancelada'
    };
    return statusMap[normalized] ?? null;
  };

  const normalizePriority = (value: string): TaskPriority | null => {
    const normalized = value.trim().toLowerCase();
    const priorityMap: Record<string, TaskPriority> = {
      baixa: 'Baixa',
      media: 'Média',
      média: 'Média',
      alta: 'Alta',
      critica: 'Crítica',
      crítica: 'Crítica'
    };
    return priorityMap[normalized] ?? null;
  };

  const parseTasksFromRows = (
    rows: string[][]
  ): { parsedTasks: Array<Omit<ProjectTask, 'id'>>; errors: string[] } => {
    if (rows.length < 2) {
      return { parsedTasks: [], errors: ['A planilha está vazia ou sem linhas de tarefas.'] };
    }
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const headerIndex = new Map(headers.map((h, i) => [h, i]));
    const required = ['descricao'];
    const missing = required.filter((key) => !headerIndex.has(key));
    if (missing.length) {
      return {
        parsedTasks: [],
        errors: [`Coluna obrigatória ausente: ${missing.join(', ')}`]
      };
    }

    const parsedTasks: Array<Omit<ProjectTask, 'id'>> = [];
    const errors: string[] = [];
    for (let lineIndex = 1; lineIndex < rows.length; lineIndex += 1) {
      const cols = rows[lineIndex];
      const get = (key: string) => cols[headerIndex.get(key) ?? -1]?.trim() ?? '';

      const description = get('descricao');
      if (!description) continue;

      const priorityRaw = get('prioridade');
      const statusRaw = get('status');
      const priority = priorityRaw ? normalizePriority(priorityRaw) : 'Média';
      const status = statusRaw ? normalizeStatus(statusRaw) : 'Backlog';

      if (!priority) {
        errors.push(`Linha ${lineIndex + 1}: prioridade inválida "${priorityRaw}"`);
        continue;
      }
      if (!status) {
        errors.push(`Linha ${lineIndex + 1}: status inválido "${statusRaw}"`);
        continue;
      }

      const estimatedRaw = get('tempo_estimado_min');
      const estimatedMinutes = estimatedRaw ? Number(estimatedRaw) : 0;
      if (Number.isNaN(estimatedMinutes) || estimatedMinutes < 0) {
        errors.push(`Linha ${lineIndex + 1}: tempo_estimado_min inválido "${estimatedRaw}"`);
        continue;
      }

      const executorEmailRaw = get('executor_email').toLowerCase();
      const validatorEmailRaw = get('validador_email').toLowerCase();

      const executorId = executorEmailRaw ? memberIdByEmail.get(executorEmailRaw) : undefined;
      const validatorId = validatorEmailRaw ? memberIdByEmail.get(validatorEmailRaw) : undefined;

      if (executorEmailRaw && !executorId) {
        errors.push(`Linha ${lineIndex + 1}: executor_email não encontrado "${executorEmailRaw}"`);
        continue;
      }
      if (validatorEmailRaw && !validatorId) {
        errors.push(`Linha ${lineIndex + 1}: validador_email não encontrado "${validatorEmailRaw}"`);
        continue;
      }

      const dueDateOriginal = get('prazo_entrega');
      const dueDateCurrent = get('prazo_entrega_atual') || dueDateOriginal;

      parsedTasks.push({
        name: description,
        description,
        sector: get('setor'),
        taskType: get('tipo'),
        executorIds: executorId ? [executorId] : [],
        validatorIds: validatorId ? [validatorId] : [],
        informIds: [],
        startDate: '',
        dueDateOriginal,
        dueDateCurrent,
        estimatedMinutes,
        actualMinutes: 0,
        executionPeriods: [],
        priority,
        status
      });
    }
    return { parsedTasks, errors };
  };

  const readCsvRows = async (file: File): Promise<string[][]> => {
    const content = await file.text();
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return [];
    const delimiter = lines[0].includes(';') ? ';' : ',';
    return lines.map((line) => parseCsvLine(line, delimiter));
  };

  const readXlsxRows = async (file: File): Promise<string[][]> => {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Tarefas') || workbook.worksheets[0];
    if (!sheet) return [];

    const rows: string[][] = [];
    sheet.eachRow((row, rowNumber) => {
      const values = row.values as Array<string | number | Date | null | undefined>;
      if (rowNumber === 1) {
        rows.push(values.slice(1).map((value) => (value ?? '').toString().trim()));
        return;
      }
      const line = values
        .slice(1)
        .map((value) => {
          if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
          }
          return (value ?? '').toString().trim();
        });
      if (line.some((col) => col)) rows.push(line);
    });
    return rows;
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
    const rows = isXlsx ? await readXlsxRows(file) : await readCsvRows(file);
    const { parsedTasks, errors } = parseTasksFromRows(rows);

    if (!parsedTasks.length) {
      alert(errors.length ? `Nenhuma tarefa válida para importar.\n${errors.slice(0, 5).join('\n')}` : 'Nenhuma tarefa encontrada.');
      event.target.value = '';
      return;
    }

    setBulkImporting(true);
    const result = await onAddTasksBulk(parsedTasks);
    setBulkImporting(false);
    event.target.value = '';

    const errorPreview = errors.length ? `\nAvisos:\n${errors.slice(0, 5).join('\n')}` : '';
    alert(
      `Importação concluída. Criadas: ${result.created}. Falhas: ${result.failed}.${result.message ? `\n${result.message}` : ''}${errorPreview}`
    );
  };

  const handleStartTimer = (taskId: string) => {
    setTimerTaskId(taskId);
    setTimerStartedAt(new Date());
    setTimerElapsed(0);
  };

  const handleStopTimer = () => {
    if (!timerTaskId || !timerStartedAt) return;
    const endedAt = new Date();
    const durationMinutes = Math.max(
      1,
      Math.round((endedAt.getTime() - timerStartedAt.getTime()) / 60000)
    );
    onAddTimeEntry(timerTaskId, {
      startedAt: timerStartedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMinutes,
      note: null,
      source: 'timer'
    });
    setTimerTaskId(null);
    setTimerStartedAt(null);
    setTimerElapsed(0);
  };

  const handleManualAdd = (taskId: string) => {
    if (!manualMinutes) return;
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - manualMinutes * 60000);
    onAddTimeEntry(taskId, {
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMinutes: manualMinutes,
      note: manualNote.trim() || null,
      source: 'manual'
    });
    setManualMinutes(0);
    setManualNote('');
  };

  const handleDueDateChange = (taskId: string) => {
    if (!newDueDate || !dueDateReason.trim()) return;
    onAddDueDateChange(taskId, toIsoDate(newDueDate), dueDateReason.trim());
    setNewDueDate('');
    setDueDateReason('');
  };

  const handleAddExtraWork = () => {
    const description = extraDescription.trim();
    if (!description || extraMinutes <= 0 || !extraWorkedAt) return;
    onAddExtraWorkEntry({
      description,
      durationMinutes: extraMinutes,
      workedAt: extraWorkedAt,
      note: extraNote.trim() || null
    });
    setExtraDescription('');
    setExtraMinutes(0);
    setExtraNote('');
    setExtraWorkedAt(getTodayIsoDate());
  };

  return (
    <div className="flex flex-col h-full min-w-0 font-sans relative">
      <div className="flex flex-col h-full min-w-0 bg-[var(--panel-bg)]">
        <div className="flex flex-col flex-1 min-h-0 min-w-0 bg-[var(--panel-bg)]">
          <div className="flex items-center gap-1 px-6 border-b border-[var(--panel-border)] overflow-x-auto no-scrollbar">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition border-b-2 ${viewMode === 'list' ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--muted-bg)] border-transparent'}`}
            >
              <List size={16} />
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition border-b-2 ${viewMode === 'board' ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--muted-bg)] border-transparent'}`}
            >
              <LayoutList size={16} />
              Board
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition border-b-2 ${viewMode === 'calendar' ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--muted-bg)] border-transparent'}`}
            >
              <Calendar size={16} />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('extras')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition border-b-2 ${viewMode === 'extras' ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--muted-bg)] border-transparent'}`}
            >
              <Clock size={16} />
              Extras
            </button>
          </div>

          {viewMode !== 'extras' && (
          <>
            {viewMode === 'list' && (
              <div className="px-6 py-2 flex items-center gap-4 border-b border-[var(--panel-border)]">
                <div className="text-xs text-[var(--text-secondary)]">
                  Colunas obrigatorias ativas.
                </div>
                <div className="flex-1" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/40 transition-colors"
                >
                  <Download size={13} />
                  Baixar modelo
                </button>
                <button
                  type="button"
                  disabled={bulkImporting}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <Upload size={13} />
                  {bulkImporting ? 'Importando...' : 'Importar planilha'}
                </button>
              </div>
            )}

            <div className="px-6 py-2.5 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Filtros
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {filteredTasks.length} de {tasks.length} tarefas
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskFilters(DEFAULT_TASK_FILTERS)}
                    disabled={!hasActiveFilters}
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--panel-border)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/40 transition-colors disabled:opacity-50"
                  >
                    Limpar filtros
                  </button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-7">
                <input
                  value={taskFilters.query}
                  onChange={(event) =>
                    setTaskFilters((prev) => ({ ...prev, query: event.target.value }))
                  }
                  placeholder="Buscar por descrição..."
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <CustomSelect
                  value={taskFilters.sector}
                  onChange={(val) => setTaskFilters((prev) => ({ ...prev, sector: val }))}
                  options={[
                    { value: '', label: 'Todos setores' },
                    ...sectors.map((sector) => ({
                      value: sector.name,
                      label: sector.name,
                      color: sector.color
                    }))
                  ]}
                  placeholder="Todos setores"
                  triggerClassName="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  renderTrigger={(opt) => (
                    <span className="inline-flex items-center gap-2 text-xs">
                      {opt?.color && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      <span className={opt ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                        {opt?.label || 'Todos setores'}
                      </span>
                    </span>
                  )}
                />
                <CustomSelect
                  value={taskFilters.taskType}
                  onChange={(val) => setTaskFilters((prev) => ({ ...prev, taskType: val }))}
                  options={[
                    { value: '', label: 'Todos tipos' },
                    ...taskTypes.map((type) => ({
                      value: type.name,
                      label: type.name,
                      color: type.color
                    }))
                  ]}
                  placeholder="Todos tipos"
                  triggerClassName="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  renderTrigger={(opt) => (
                    <span className="inline-flex items-center gap-2 text-xs">
                      {opt?.color && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      <span className={opt ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}>
                        {opt?.label || 'Todos tipos'}
                      </span>
                    </span>
                  )}
                />
                <CustomSelect
                  value={taskFilters.priority}
                  onChange={(val) =>
                    setTaskFilters((prev) => ({
                      ...prev,
                      priority: val as TaskPriority | ''
                    }))
                  }
                  options={[
                    { value: '', label: 'Todas prioridades' },
                    ...priorityOptions.map((priority) => ({
                      value: priority,
                      label: priority,
                      icon: Flag,
                      color: priorityFlags[priority]
                    }))
                  ]}
                  placeholder="Todas prioridades"
                  triggerClassName="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <CustomSelect
                  value={taskFilters.status}
                  onChange={(val) =>
                    setTaskFilters((prev) => ({
                      ...prev,
                      status: val as TaskStatus | ''
                    }))
                  }
                  options={[
                    { value: '', label: 'Todos status' },
                    ...statusOptions.map((status) => ({
                      value: status,
                      label: status
                    }))
                  ]}
                  placeholder="Todos status"
                  triggerClassName="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <CustomSelect
                  value={taskFilters.executorId}
                  onChange={(val) => setTaskFilters((prev) => ({ ...prev, executorId: val }))}
                  options={executorFilterOptions}
                  placeholder="Todos executores"
                  triggerClassName="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <SingleDatePicker
                  value={taskFilters.dueDate}
                  onChange={(val) => setTaskFilters((prev) => ({ ...prev, dueDate: val }))}
                  placeholder="Prazo (dd/mm/aaaa)"
                  className="w-full"
                  inputClassName="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {viewMode === 'list' && (
              <div className="flex-1 overflow-x-auto overflow-y-auto relative w-full min-w-0">
                <div
                  className="hidden md:grid gap-4 px-6 py-2 border-b border-[var(--panel-border)] bg-[var(--panel-bg)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider items-center min-w-[2000px] sticky top-0 z-20 w-max min-w-full"
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div></div>
                  <div>Descrição</div>
                  <div>Setor</div>
                  <div>Tipo</div>
                  <div>Prioridade</div>
                  <div>Executor</div>
                  <div>Validador</div>
                  <div>Informar</div>
                  <div>Status da Tarefa</div>
                  <div>Prazo de Entrega</div>
                  <div>Prazo de Entrega Atual</div>
                  <div>Tempo estimado</div>
                  <div>Tempo efetivado</div>
                  <div></div>
                </div>

                <div className="flex flex-col min-w-[2000px] w-max min-w-full">
                  {groupedTasks.map((group) => (
                    <div key={group.status} className="group/section">
                      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-[var(--panel-bg)] hover:bg-[var(--muted-bg)] transition-colors border-b border-[var(--panel-border)] w-max min-w-full">
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedGroups((prev) => ({
                              ...prev,
                              [group.status]: !prev[group.status]
                            }))
                          }
                          className="p-1 rounded hover:bg-[var(--panel-border)] text-[var(--text-secondary)] transition"
                        >
                          {collapsedGroups[group.status] ? (
                            <ChevronRight size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>

                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${statusColors[group.status]}`}
                        >
                          {group.status}
                        </span>

                        <span className="text-xs text-[var(--text-muted)] font-medium">
                          {group.tasks.length}
                        </span>

                        <div className="ml-auto flex items-center gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                          <button
                            onClick={() => onAddTask(getEmptyTask('', group.status))}
                            className="p-1 hover:bg-[var(--panel-border)] rounded text-[var(--text-secondary)]"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      {!collapsedGroups[group.status] && (
                        <div className="flex flex-col w-max min-w-full">
                          {group.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="group/task relative grid gap-4 px-6 py-2 items-center border-b border-[var(--panel-border)] hover:bg-[var(--card-bg)] transition-colors w-max min-w-full"
                              style={{ gridTemplateColumns: gridTemplate }}
                            >
                              <div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => moveTaskInList(task.id, task.status, 'up')}
                                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-border)] rounded transition"
                                    title="Mover para cima"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveTaskInList(task.id, task.status, 'down')}
                                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-border)] rounded transition"
                                    title="Mover para baixo"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    onClick={() => openDrawer(task.id)}
                                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-border)] rounded transition"
                                    title="Abrir detalhes"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </div>
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <input
                                  value={task.description}
                                  onChange={(event) =>
                                    onUpdateTask(task.id, { description: event.target.value })
                                  }
                                  className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
                                  placeholder="-"
                                />
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <CustomSelect
                                  value={task.sector}
                                  onChange={(val) => onUpdateTask(task.id, { sector: val })}
                                  options={[
                                    { value: '', label: '-' },
                                    ...sectors.map((sector) => ({
                                      value: sector.name,
                                      label: sector.name,
                                      color: sector.color
                                    }))
                                  ]}
                                  renderTrigger={(opt) => (
                                    <span className="inline-flex items-center gap-1.5 text-xs">
                                      {opt?.color && (
                                        <span
                                          className="h-2 w-2 rounded-full"
                                          style={{ backgroundColor: opt.color }}
                                        />
                                      )}
                                      <span>{opt?.label || '-'}</span>
                                    </span>
                                  )}
                                  placeholder="-"
                                />
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <CustomSelect
                                  value={task.taskType}
                                  onChange={(val) => onUpdateTask(task.id, { taskType: val })}
                                  options={[
                                    { value: '', label: '-' },
                                    ...taskTypes.map((type) => ({
                                      value: type.name,
                                      label: type.name,
                                      color: type.color
                                    }))
                                  ]}
                                  renderTrigger={(opt) => (
                                    <span className="inline-flex items-center gap-1.5 text-xs">
                                      {opt?.color && (
                                        <span
                                          className="h-2 w-2 rounded-full"
                                          style={{ backgroundColor: opt.color }}
                                        />
                                      )}
                                      <span>{opt?.label || '-'}</span>
                                    </span>
                                  )}
                                  placeholder="-"
                                />
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <CustomSelect
                                  value={task.priority}
                                  onChange={(val) =>
                                    onUpdateTask(task.id, { priority: val as TaskPriority })
                                  }
                                  options={priorityOptions.map((p) => ({
                                    value: p,
                                    label: p,
                                    icon: Flag,
                                    color: priorityFlags[p]
                                  }))}
                                  renderTrigger={(opt) => (
                                    <div
                                      className={`flex items-center gap-1 text-xs font-medium ${opt?.color || priorityFlags[task.priority]}`}
                                    >
                                      <Flag size={12} />
                                      <span>{opt?.label || task.priority}</span>
                                    </div>
                                  )}
                                />
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <MultiSelect
                                  valueIds={task.executorIds}
                                  options={memberOptions}
                                  placeholder="-"
                                  onChange={(ids) => onUpdateTask(task.id, { executorIds: ids })}
                                />
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <MultiSelect
                                  valueIds={task.validatorIds}
                                  options={memberOptions}
                                  placeholder="-"
                                  onChange={(ids) => onUpdateTask(task.id, { validatorIds: ids })}
                                />
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <MultiSelect
                                  valueIds={task.informIds}
                                  options={memberOptions}
                                  placeholder="-"
                                  onChange={(ids) => onUpdateTask(task.id, { informIds: ids })}
                                />
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <CustomSelect
                                  value={task.status}
                                  onChange={(val) => {
                                    const nextStatus = val as TaskStatus;
                                    const updates: Partial<ProjectTask> = { status: nextStatus };
                                    if (
                                      nextStatus !== 'Backlog' &&
                                      !task.dueDateCurrent &&
                                      task.dueDateOriginal
                                    ) {
                                      updates.dueDateCurrent = task.dueDateOriginal;
                                    }
                                    onUpdateTask(task.id, updates);
                                  }}
                                  options={statusOptions.map((s) => ({
                                    value: s,
                                    label: s
                                  }))}
                                  renderTrigger={(opt) => (
                                    <span className={`text-xs font-semibold ${statusTextColors[task.status]}`}>
                                      {opt?.label || task.status}
                                    </span>
                                  )}
                                />
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <SingleDatePicker
                                  value={task.dueDateOriginal}
                                  onChange={(val) =>
                                    onUpdateTask(task.id, {
                                      dueDateOriginal: val,
                                      dueDateCurrent:
                                        task.status === 'Backlog'
                                          ? val
                                          : task.dueDateCurrent || val
                                    })
                                  }
                                  className="w-full"
                                  inputClassName="w-full bg-transparent text-xs text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-muted)]"
                                />
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <div className="text-xs text-[var(--text-secondary)]">
                                  {formatDate(task.dueDateCurrent || task.dueDateOriginal)}
                                </div>
                              </div>
                              <div onDoubleClick={stopDoubleClick}>
                                <input
                                  type="number"
                                  min={0}
                                  value={task.estimatedMinutes}
                                  onChange={(event) =>
                                    task.status === 'Backlog'
                                      ? onUpdateTask(task.id, {
                                          estimatedMinutes: Number(event.target.value || 0)
                                        })
                                      : undefined
                                  }
                                  disabled={task.status !== 'Backlog'}
                                  className="w-full bg-transparent text-xs text-[var(--text-secondary)] outline-none disabled:opacity-50"
                                />
                              </div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                {formatMinutes(task.actualMinutes)}
                              </div>
                              <div className="flex items-center justify-end opacity-0 group-hover/task:opacity-100 transition-opacity">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDeleteTask(task.id);
                                  }}
                                  className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}

                          {!hasActiveFilters && (
                            <div className="grid grid-cols-[1fr_auto] gap-4 px-6 py-2 items-center border-b border-[var(--panel-border)] border-dashed hover:bg-[var(--card-bg)] transition-colors opacity-60 hover:opacity-100 group-hover/section:opacity-80 w-max min-w-full">
                              <div className="flex items-center gap-3">
                                <Plus size={14} className="text-[var(--text-muted)]" />
                                <input
                                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                                  placeholder="Adicionar nova tarefa..."
                                  value={newTaskNames[group.status] || ''}
                                  onChange={(event) =>
                                    setNewTaskNames((prev) => ({
                                      ...prev,
                                      [group.status]: event.target.value
                                    }))
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      handleQuickAddTask(group.status);
                                    }
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => handleQuickAddTask(group.status)}
                                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              >
                                Criar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {!filteredTasks.length && (
                    <div className="px-6 py-6 text-sm text-[var(--text-muted)]">
                      Nenhuma tarefa encontrada com os filtros atuais.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
          )}

          {viewMode === 'extras' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      Trabalhos extras
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Registre atividades executadas fora do planejamento original.
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Total acumulado: {formatMinutes(extraWorkEntries.reduce((acc, entry) => acc + entry.durationMinutes, 0))}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 space-y-3">
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">Novo lançamento</div>
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-[2fr_120px_180px_1.5fr_auto]">
                    <input
                      value={extraDescription}
                      onChange={(event) => setExtraDescription(event.target.value)}
                      className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      placeholder="Descreva o trabalho extra executado"
                    />
                    <input
                      type="number"
                      min={1}
                      value={extraMinutes}
                      onChange={(event) => setExtraMinutes(Number(event.target.value || 0))}
                      className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      placeholder="Minutos"
                    />
                    <SingleDatePicker
                      value={extraWorkedAt}
                      onChange={setExtraWorkedAt}
                      className="w-full"
                      inputClassName="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
                    />
                    <input
                      value={extraNote}
                      onChange={(event) => setExtraNote(event.target.value)}
                      className="rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      placeholder="Observação (opcional)"
                    />
                    <button
                      type="button"
                      onClick={handleAddExtraWork}
                      disabled={!extraDescription.trim() || extraMinutes <= 0 || !extraWorkedAt}
                      className="rounded-md bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Registrar
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">Histórico</div>
                  <div className="space-y-2">
                    {extraWorkEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-1 gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs lg:grid-cols-[1fr_auto_auto]"
                      >
                        <div className="text-[var(--text-primary)]">
                          <span className="font-medium">{entry.description}</span>
                          {entry.note ? <span className="text-[var(--text-muted)]"> • {entry.note}</span> : null}
                        </div>
                        <div className="text-[var(--text-secondary)]">
                          {formatDate(entry.workedAt)} • {formatMinutes(entry.durationMinutes)}
                        </div>
                        <div className="text-[var(--text-muted)]">
                          {memberLabelById.get(entry.createdBy) ??
                            (entry.createdBy === currentUserId ? 'Você' : entry.createdBy)}
                        </div>
                      </div>
                    ))}
                    {!extraWorkEntries.length && (
                      <div className="rounded-lg border border-dashed border-[var(--panel-border)] px-3 py-4 text-xs text-[var(--text-muted)]">
                        Sem lançamentos de trabalho extra neste projeto.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'board' && (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-4 p-6 min-w-[1000px]">
                  {statusOptions.map((status) => {
                    const statusTasks = filteredTasks.filter((task) => task.status === status);
                    return (
                      <div
                        key={status}
                        className="w-80 flex-shrink-0 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${statusColors[status]}`}
                          >
                            {status}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] font-medium">
                            {statusTasks.length}
                          </span>
                        </div>
                        <Droppable droppableId={status}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="flex flex-col gap-3"
                            >
                              {statusTasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                  {(draggableProvided) => (
                                    <div
                                      ref={draggableProvided.innerRef}
                                      {...draggableProvided.draggableProps}
                                      {...draggableProvided.dragHandleProps}
                                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--card-bg)] p-3 cursor-pointer"
                                      onClick={() => openDrawer(task.id)}
                                    >
                                      <div className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                                        {task.description || 'Sem descrição'}
                                      </div>
                                      <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                          {renderPeople(task.executorIds)}
                                          <div
                                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityFlags[task.priority].replace('text-', 'bg-').replace('500', '100')} ${priorityFlags[task.priority]}`}
                                          >
                                            {task.priority}
                                          </div>
                                        </div>
                                        <div className="text-[10px] text-[var(--text-muted)]">
                                          {formatDate(task.dueDateCurrent || task.dueDateOriginal)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              <button
                                onClick={() => onAddTask(getEmptyTask('Nova tarefa', status))}
                                className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-border)] rounded-lg border border-dashed border-[var(--panel-border)] transition"
                              >
                                <Plus size={14} />
                                Add Task
                              </button>
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                </div>
              </div>
            </DragDropContext>
          )}

          {viewMode === 'calendar' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
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
                      className="p-2 rounded-md border border-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/40 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarDate(new Date())}
                      className="px-3 py-1.5 rounded-md border border-[var(--panel-border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/40 transition-colors"
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
                      className="p-2 rounded-md border border-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/40 transition-colors"
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
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                          calendarView === view
                            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--panel-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {view === 'month' ? 'Mês' : view === 'week' ? 'Semana' : 'Dia'}
                      </button>
                    ))}
                  </div>
                </div>

                {calendarView === 'month' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-7 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((label) => (
                        <div key={label} className="py-2 text-center">
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {eachDayOfInterval({
                        start: startOfWeek(startOfMonth(calendarDate)),
                        end: endOfWeek(endOfMonth(calendarDate))
                      }).map((day) => {
                        const key = formatDateFns(day, 'yyyy-MM-dd');
                        const events = eventsByDay.get(key) ?? [];
                        const isCurrentMonth = isSameMonth(day, calendarDate);
                        const isCurrentDay = isToday(day);
                        return (
                          <div
                            key={key}
                            className={`min-h-[120px] rounded-lg border p-2 ${
                              isCurrentDay
                                ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                                : isCurrentMonth
                                  ? 'border-[var(--panel-border)] bg-[var(--panel-bg)]'
                                  : 'border-[var(--panel-border)] bg-[var(--muted-bg)] opacity-70'
                            }`}
                          >
                            <div
                              className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                                isCurrentDay
                                  ? 'bg-[var(--accent)] text-white'
                                  : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              {formatDateFns(day, 'dd')}
                            </div>
                            <div className="mt-2 space-y-1">
                              {events.slice(0, 3).map((event) => (
                                <button
                                  key={event.period.id}
                                  type="button"
                                  onClick={() => openDrawer(event.task.id)}
                                  className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] px-2 py-1 text-left text-[11px] text-[var(--text-primary)] hover:bg-[var(--muted-bg)]"
                                >
                                  <div className="font-semibold text-[10px] text-[var(--text-muted)]">
                                    {formatDateFns(event.start, 'HH:mm')} - {formatDateFns(event.end, 'HH:mm')}
                                  </div>
                                  <div className="truncate">{event.task.description || 'Sem descrição'}</div>
                                </button>
                              ))}
                              {events.length > 3 && (
                                <div className="text-[10px] text-[var(--text-muted)]">
                                  +{events.length - 3} períodos
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
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
                    {eachDayOfInterval({
                      start: startOfWeek(calendarDate),
                      end: endOfWeek(calendarDate)
                    }).map((day) => {
                      const key = formatDateFns(day, 'yyyy-MM-dd');
                      const events = eventsByDay.get(key) ?? [];
                      const isCurrentDay = isToday(day);
                      return (
                        <div
                          key={key}
                          className={`rounded-lg border p-3 ${
                            isCurrentDay
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                              : 'border-[var(--panel-border)] bg-[var(--panel-bg)]'
                          }`}
                        >
                          <div
                            className={`text-xs font-semibold ${
                              isCurrentDay ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {weekDayNames[day.getDay()]} • {formatDateFns(day, 'dd/MM/yyyy')}
                            {isCurrentDay ? ' • Hoje' : ''}
                          </div>
                          <div className="mt-3 space-y-2">
                            {events.map((event) => (
                              <button
                                key={event.period.id}
                                type="button"
                                onClick={() => openDrawer(event.task.id)}
                                className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] px-2 py-1.5 text-left text-[11px] text-[var(--text-primary)] hover:bg-[var(--muted-bg)]"
                              >
                                <div className="font-semibold text-[10px] text-[var(--text-muted)]">
                                  {formatDateFns(event.start, 'HH:mm')} - {formatDateFns(event.end, 'HH:mm')}
                                </div>
                                <div className="truncate">{event.task.description || 'Sem descrição'}</div>
                              </button>
                            ))}
                            {!events.length && (
                              <div className="text-[11px] text-[var(--text-muted)]">
                                Sem períodos.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {calendarView === 'day' && (
                  <div
                    className={`rounded-xl border p-4 ${
                      isToday(calendarDate)
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--panel-border)] bg-[var(--panel-bg)]'
                    }`}
                  >
                    <div
                      className={`text-sm font-semibold ${
                        isToday(calendarDate) ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {formatDateFns(calendarDate, 'dd/MM/yyyy')}
                      {isToday(calendarDate) ? ' • Hoje' : ''}
                    </div>
                    <div className="mt-4 space-y-2">
                      {(eventsByDay.get(formatDateFns(calendarDate, 'yyyy-MM-dd')) ?? []).map(
                        (event) => (
                          <button
                            key={event.period.id}
                            type="button"
                            onClick={() => openDrawer(event.task.id)}
                            className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] px-3 py-2 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--muted-bg)]"
                          >
                            <div className="font-semibold text-[10px] text-[var(--text-muted)]">
                              {formatDateFns(event.start, 'HH:mm')} - {formatDateFns(event.end, 'HH:mm')}
                            </div>
                            <div className="truncate">{event.task.description || 'Sem descrição'}</div>
                          </button>
                        )
                      )}
                      {!((eventsByDay.get(formatDateFns(calendarDate, 'yyyy-MM-dd')) ?? []).length) && (
                        <div className="text-xs text-[var(--text-muted)]">
                          Nenhum período planejado.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!scheduledEvents.length && (
                  <div className="mt-4 text-sm text-[var(--text-muted)]">
                    Nenhuma tarefa com cronograma de execução definido.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {drawerTaskId && selectedTask && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <div className="fixed top-0 right-0 h-full w-[800px] bg-[var(--panel-bg)] shadow-2xl z-50 border-l border-[var(--panel-border)] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--panel-border)]">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Detalhes da tarefa</h3>
                <p className="text-xs text-[var(--text-muted)]">{selectedTask.status}</p>
              </div>
              <button onClick={closeDrawer} className="p-1 rounded hover:bg-[var(--muted-bg)]">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-1 px-6 border-b border-[var(--panel-border)] overflow-x-auto">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'info'
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Informações
              </button>
              <button
                onClick={() => setActiveTab('time')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'time'
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Controle de Tempo
              </button>
              <button
                onClick={() => setActiveTab('deadline')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'deadline'
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Prazos
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'logs'
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Logs
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'comments'
                    ? 'border-[var(--accent)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Comentários
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Descricao</label>
                <textarea
                  value={selectedTask.description}
                  onChange={(event) => {
                    const value = event.target.value;
                    onUpdateTask(selectedTask.id, { description: value });
                  }}
                  className="w-full h-20 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none resize-none focus:border-[var(--accent)]"
                  placeholder="Descreva a tarefa..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Setor</label>
                  <CustomSelect
                    value={selectedTask.sector}
                    onChange={(val) => onUpdateTask(selectedTask.id, { sector: val })}
                    options={[
                      { value: '', label: '-' },
                      ...sectors.map((sector) => ({
                        value: sector.name,
                        label: sector.name,
                        color: sector.color
                      }))
                    ]}
                    renderTrigger={(opt) => (
                      <span className="inline-flex items-center gap-2 text-xs">
                        {opt?.color && (
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: opt.color }} />
                        )}
                        <span>{opt?.label || 'Selecionar setor'}</span>
                      </span>
                    )}
                    placeholder="Selecionar setor"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Tipo</label>
                  <CustomSelect
                    value={selectedTask.taskType}
                    onChange={(val) => onUpdateTask(selectedTask.id, { taskType: val })}
                    options={[
                      { value: '', label: '-' },
                      ...taskTypes.map((type) => ({
                        value: type.name,
                        label: type.name,
                        color: type.color
                      }))
                    ]}
                    renderTrigger={(opt) => (
                      <span className="inline-flex items-center gap-2 text-xs">
                        {opt?.color && (
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: opt.color }} />
                        )}
                        <span>{opt?.label || 'Selecionar tipo'}</span>
                      </span>
                    )}
                    placeholder="Selecionar tipo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Prioridade</label>
                  <CustomSelect
                    value={selectedTask.priority}
                    onChange={(val) => onUpdateTask(selectedTask.id, { priority: val as TaskPriority })}
                    options={priorityOptions.map((p) => ({
                      value: p,
                      label: p,
                      icon: Flag,
                      color: priorityFlags[p]
                    }))}
                    renderTrigger={(opt) => (
                      <div className={`flex items-center gap-2 text-xs font-medium ${opt?.color || priorityFlags[selectedTask.priority]}`}>
                        <Flag size={14} />
                        <span>{opt?.label || selectedTask.priority}</span>
                      </div>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Status</label>
                  <CustomSelect
                    value={selectedTask.status}
                    onChange={(val) => {
                      const nextStatus = val as TaskStatus;
                      const updates: Partial<ProjectTask> = { status: nextStatus };
                      if (
                        nextStatus !== 'Backlog' &&
                        !selectedTask.dueDateCurrent &&
                        selectedTask.dueDateOriginal
                      ) {
                        updates.dueDateCurrent = selectedTask.dueDateOriginal;
                      }
                      onUpdateTask(selectedTask.id, updates);
                    }}
                    options={statusOptions.map((s) => ({
                      value: s,
                      label: s
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Executor</label>
                  <MultiSelect
                    valueIds={selectedTask.executorIds}
                    options={memberOptions}
                    placeholder="Selecionar executores"
                    onChange={(ids) => onUpdateTask(selectedTask.id, { executorIds: ids })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Validador</label>
                  <MultiSelect
                    valueIds={selectedTask.validatorIds}
                    options={memberOptions}
                    placeholder="Selecionar validadores"
                    onChange={(ids) => onUpdateTask(selectedTask.id, { validatorIds: ids })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Informar</label>
                  <MultiSelect
                    valueIds={selectedTask.informIds}
                    options={memberOptions}
                    placeholder="Selecionar pessoas"
                    onChange={(ids) => onUpdateTask(selectedTask.id, { informIds: ids })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Prazo de Entrega</label>
                  <SingleDatePicker
                    value={selectedTask.dueDateOriginal}
                    onChange={(val) =>
                      onUpdateTask(selectedTask.id, {
                        dueDateOriginal: val,
                        dueDateCurrent: val
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">
                      Períodos de execução
                    </label>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Defina dias e horários de trabalho. Devem ser até o prazo atual.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddExecutionPeriod}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--panel-border)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/40 transition-colors"
                  >
                    <Plus size={12} />
                    Adicionar período
                  </button>
                </div>

                <div className="space-y-2">
                  {(selectedTask.executionPeriods ?? []).map((period) => {
                    const error =
                      executionErrors[period.id] ||
                      getExecutionPeriodError(period, selectedTask.dueDateCurrent);
                    return (
                      <div
                        key={period.id}
                        className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-3"
                      >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
                          <div className="space-y-1">
                            <label className="text-[11px] text-[var(--text-muted)]">Data</label>
                            <SingleDatePicker
                              value={period.date}
                              onChange={(val) =>
                                handleUpdateExecutionPeriod(period.id, {
                                  date: val
                                })
                              }
                              placeholder="DD/MM/AAAA"
                              inputClassName="px-2.5 py-1.5 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-[var(--text-muted)]">Início</label>
                            <TimeInput
                              value={period.startTime}
                              onChange={(val) =>
                                handleUpdateExecutionPeriod(period.id, {
                                  startTime: val
                                })
                              }
                              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-[var(--text-muted)]">Fim</label>
                            <TimeInput
                              value={period.endTime}
                              onChange={(val) =>
                                handleUpdateExecutionPeriod(period.id, {
                                  endTime: val
                                })
                              }
                              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveExecutionPeriod(period.id)}
                              className="p-2 rounded-md text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {error && (
                          <div className="mt-2 text-[11px] text-rose-500">
                            {error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!(selectedTask.executionPeriods ?? []).length && (
                    <div className="text-xs text-[var(--text-muted)]">
                      Nenhum período definido.
                    </div>
                  )}
                </div>
              </div>

              </div>
              )}

              {activeTab === 'time' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Tempo estimado (min)</label>
                      <input
                        type="number"
                        min={0}
                        value={selectedTask.estimatedMinutes}
                        onChange={(event) =>
                          selectedTask.status === 'Backlog'
                            ? onUpdateTask(selectedTask.id, {
                                estimatedMinutes: Number(event.target.value || 0)
                              })
                            : undefined
                        }
                        disabled={selectedTask.status !== 'Backlog'}
                        className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {formatMinutes(selectedTask.estimatedMinutes)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">Tempo efetivado (min)</label>
                      <input
                        type="number"
                        min={0}
                        value={selectedTask.actualMinutes}
                        readOnly
                        className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--text-muted)]"
                      />
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {formatMinutes(selectedTask.actualMinutes)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Controle de Tempo</label>
                    <div className="flex items-center gap-2">
                      {timerTaskId === selectedTask.id ? (
                        <button
                          type="button"
                          onClick={handleStopTimer}
                          className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--text-primary)]"
                        >
                          <Clock size={14} />
                          Parar ({formatStopwatch(timerElapsed)})
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartTimer(selectedTask.id)}
                          disabled={Boolean(timerTaskId && timerTaskId !== selectedTask.id)}
                          className="flex items-center gap-2 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs text-[var(--text-primary)]"
                        >
                          <Timer size={14} />
                          Iniciar
                        </button>
                      )}
                    </div>
                    {timerTaskId && timerTaskId !== selectedTask.id && (
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Timer ativo em outra tarefa.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-4 space-y-3">
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">Adicionar tempo manual</div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        min={0}
                        value={manualMinutes}
                        onChange={(event) => setManualMinutes(Number(event.target.value || 0))}
                        className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
                        placeholder="Minutos"
                      />
                      <input
                        value={manualNote}
                        onChange={(event) => setManualNote(event.target.value)}
                        className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
                        placeholder="Motivo/observacao"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleManualAdd(selectedTask.id)}
                      className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Somar tempo
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">Historico de tempo</div>
                    <div className="space-y-2">
                      {(timeEntries[selectedTask.id] ?? []).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs"
                        >
                          <div>
                            <div className="font-medium text-[var(--text-primary)]">
                              {formatMinutes(entry.durationMinutes)} ({entry.source})
                            </div>
                            <div className="text-[var(--text-muted)]">
                              {formatDate(entry.startedAt)} - {formatDate(entry.endedAt)}
                            </div>
                            <div className="text-[var(--text-muted)]">
                              {memberLabelById.get(entry.createdBy) ?? entry.createdBy}
                            </div>
                          </div>
                          <div className="text-[var(--text-muted)]">{entry.note || '-'}</div>
                        </div>
                      ))}
                      {(timeEntries[selectedTask.id] ?? []).length === 0 && (
                        <div className="text-xs text-[var(--text-muted)]">Sem registros.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'deadline' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Prazo de Entrega Atual</label>
                    <div className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--text-muted)]">
                      {formatDate(selectedTask.dueDateCurrent || selectedTask.dueDateOriginal)}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Prazo atual definido automaticamente. Para alterar, registre uma alteracao abaixo.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-4 space-y-3">
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">
                      Alteracao de prazo
                    </div>
                    <SingleDatePicker
                      value={newDueDate}
                      onChange={(val) => setNewDueDate(val)}
                    />
                    <input
                      value={dueDateReason}
                      onChange={(event) => setDueDateReason(event.target.value)}
                      className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
                      placeholder="Motivo da alteracao"
                    />
                    <button
                      type="button"
                      onClick={() => handleDueDateChange(selectedTask.id)}
                      className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Registrar alteracao
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">Historico de prazo</div>
                    <div className="space-y-2">
                      {(dueDateChanges[selectedTask.id] ?? []).map((change) => (
                        <div
                          key={change.id}
                          className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs"
                        >
                          <div className="font-medium text-[var(--text-primary)]">
                            {formatDate(change.previousDate)} → {formatDate(change.newDate)}
                          </div>
                          <div className="text-[var(--text-muted)]">{change.reason}</div>
                          <div className="text-[var(--text-muted)]">
                            {memberLabelById.get(change.changedBy) ?? change.changedBy} •{' '}
                            {new Date(change.createdAt).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      ))}
                      {(dueDateChanges[selectedTask.id] ?? []).length === 0 && (
                        <div className="text-xs text-[var(--text-muted)]">Sem alteracoes.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">Auditoria</div>
                    <div className="space-y-2">
                      {(auditLogs[selectedTask.id] ?? []).map((log) => (
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
                            {memberLabelById.get(log.changedBy) ?? log.changedBy} •{' '}
                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      ))}
                      {(auditLogs[selectedTask.id] ?? []).length === 0 && (
                        <div className="text-xs text-[var(--text-muted)]">Sem registros.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'comments' && (
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
                      disabled={!commentDraft.trim()}
                      onClick={() => {
                        void Promise.resolve(onAddTaskComment(selectedTask.id, commentDraft)).then(() => {
                          setCommentDraft('');
                        });
                      }}
                      className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Comentar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(taskComments[selectedTask.id] ?? []).map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2"
                      >
                        <div className="text-xs text-[var(--text-muted)]">
                          {memberLabelById.get(comment.createdBy) ??
                            (comment.createdBy === currentUserId ? 'Você' : comment.createdBy)}{' '}
                          • {new Date(comment.createdAt).toLocaleString('pt-BR')}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                          {comment.content}
                        </div>
                      </div>
                    ))}
                    {(taskComments[selectedTask.id] ?? []).length === 0 && (
                      <div className="text-xs text-[var(--text-muted)]">Sem comentários.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
