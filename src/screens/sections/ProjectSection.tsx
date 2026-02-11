import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../components/CustomSelect';
import { SingleDatePicker } from '../../components/SingleDatePicker';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  LayoutList,
  List,
  Plus,
  Timer,
  Trash2,
  X
} from 'lucide-react';
import type {
  Project,
  ProjectTask,
  TaskAuditLog,
  TaskDueDateChange,
  TaskPriority,
  TaskStatus,
  TaskTimeEntry
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
  members: MemberOption[];
  sectors: string[];
  taskTypes: string[];
  currentUserId: string;
  timeEntries: Record<string, TaskTimeEntry[]>;
  dueDateChanges: Record<string, TaskDueDateChange[]>;
  auditLogs: Record<string, TaskAuditLog[]>;
  onLoadTaskExtras: (taskId: string) => void;
  onAddTask: (task: Omit<ProjectTask, 'id'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<ProjectTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTimeEntry: (
    taskId: string,
    entry: Omit<TaskTimeEntry, 'id' | 'taskId' | 'createdBy'>
  ) => void;
  onAddDueDateChange: (taskId: string, newDate: string, reason: string) => void;
};

const priorityOptions: TaskPriority[] = ['Baixa', 'Média', 'Alta', 'Crítica'];
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
  priority: 'Média',
  status
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

const toIsoDate = (value: string) => value;

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
  members,
  sectors,
  taskTypes,
  currentUserId,
  timeEntries,
  dueDateChanges,
  auditLogs,
  onLoadTaskExtras,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddTimeEntry,
  onAddDueDateChange
}: ProjectSectionProps) {
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<TaskStatus, boolean>>(
    () =>
      statusOptions.reduce<Record<TaskStatus, boolean>>((acc, status) => {
        acc[status] = false;
        return acc;
      }, {} as Record<TaskStatus, boolean>)
  );
  const [newTaskNames, setNewTaskNames] = useState<Record<string, string>>({});
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'time' | 'deadline' | 'logs'>('info');

  const [timerTaskId, setTimerTaskId] = useState<string | null>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<Date | null>(null);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [manualNote, setManualNote] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [dueDateReason, setDueDateReason] = useState('');

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
    onLoadTaskExtras(taskId);
  };

  const closeDrawer = () => {
    setDrawerTaskId(null);
    setNewDueDate('');
    setDueDateReason('');
    setManualMinutes(0);
    setManualNote('');
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

  const formatAuditValue = (field: string, value: string | null) => {
    if (!value) return '-';
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

  if (!project) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--muted-bg)] p-8 text-center text-sm text-[var(--text-secondary)]">
        Selecione um projeto para começar a organizar as tarefas.
      </div>
    );
  }

  const groupedTasks = statusOptions.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status)
  }));

  const gridTemplate =
    '40px minmax(260px, 1.4fr) minmax(180px, 1fr) minmax(160px, 1fr) minmax(120px, 0.7fr) minmax(200px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr) minmax(160px, 1fr) minmax(180px, 1fr) minmax(200px, 1fr) minmax(160px, 0.9fr) minmax(160px, 0.9fr) 48px';

  const handleQuickAddTask = (status: TaskStatus) => {
    const description = newTaskNames[status]?.trim();
    if (!description) return;
    onAddTask(getEmptyTask(description, status));
    setNewTaskNames((prev) => ({ ...prev, [status]: '' }));
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    const newStatus = destination.droppableId as TaskStatus;
    onUpdateTask(draggableId, { status: newStatus });
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

  const stopDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
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
          </div>

          {viewMode === 'list' && (
            <>
              <div className="px-6 py-2 flex items-center gap-4 border-b border-[var(--panel-border)]">
                <div className="text-xs text-[var(--text-secondary)]">
                  Colunas obrigatorias ativas.
                </div>
                <div className="flex-1" />
              </div>

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
                                <button
                                  onClick={() => openDrawer(task.id)}
                                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-border)] rounded transition"
                                >
                                  <Eye size={16} />
                                </button>
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
                                      value: sector,
                                      label: sector
                                    }))
                                  ]}
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
                                      value: type,
                                      label: type
                                    }))
                                  ]}
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
                                      dueDateCurrent: task.dueDateCurrent || val
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
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {viewMode === 'board' && (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-4 p-6 min-w-[1000px]">
                  {statusOptions.map((status) => {
                    const statusTasks = tasks.filter((task) => task.status === status);
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
            <div className="p-6">
              <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-6">
                <div className="text-sm text-[var(--text-secondary)] mb-4">
                  Visao por prazo atual.
                </div>
                <div className="space-y-3">
                  {tasks
                    .filter((task) => task.dueDateCurrent || task.dueDateOriginal)
                    .sort((a, b) =>
                      (a.dueDateCurrent || a.dueDateOriginal).localeCompare(
                        b.dueDateCurrent || b.dueDateOriginal
                      )
                    )
                    .map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openDrawer(task.id)}
                        className="w-full flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-left hover:bg-[var(--muted-bg)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-semibold text-[var(--text-muted)]">
                            {formatDate(task.dueDateCurrent || task.dueDateOriginal)}
                          </div>
                          <div className="text-sm text-[var(--text-primary)] line-clamp-1">
                            {task.description || 'Sem descrição'}
                          </div>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {task.status}
                        </div>
                      </button>
                    ))}
                  {!tasks.some((task) => task.dueDateCurrent || task.dueDateOriginal) && (
                    <div className="text-sm text-[var(--text-muted)]">
                      Nenhuma tarefa com prazo atual definido.
                    </div>
                  )}
                </div>
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
                        value: sector,
                        label: sector
                      }))
                    ]}
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
                        value: type,
                        label: type
                      }))
                    ]}
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
                        dueDateCurrent: selectedTask.dueDateCurrent || val
                      })
                    }
                  />
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
                          Parar ({formatMinutes(Math.round(timerElapsed / 60000))})
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
                        </div>
                      ))}
                      {(auditLogs[selectedTask.id] ?? []).length === 0 && (
                        <div className="text-xs text-[var(--text-muted)]">Sem registros.</div>
                      )}
                    </div>
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
