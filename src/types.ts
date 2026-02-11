export type AuthStatus = 'idle' | 'checking' | 'ready';

export type UserRole = 'manager' | 'executor' | 'viewer';

export type UserProfile = {
  fullName?: string | null;
  title?: string | null;
  company?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role?: UserRole | null;
  passwordSet?: boolean | null;
  theme?: 'dark' | 'light' | null;
};

export type Project = {
  id: string;
  name: string;
  summary?: string;
  status?: string;
  createdBy: string;
};

export type Workspace = {
  id: string;
  name: string;
  description?: string;
  projects: Project[];
  createdBy: string;
};

export type SystemView = 'dashboard' | 'project' | 'settings' | 'members' | 'profile';

export type TaskPriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

export type TaskStatus =
  | 'Backlog'
  | 'Pendente'
  | 'Em Execução'
  | 'Em Validação'
  | 'Concluída'
  | 'Bloqueada'
  | 'Cancelada';

export type TaskPeopleRole = 'executor' | 'validator' | 'inform';

export type ProjectTask = {
  id: string;
  name: string;
  description: string;
  sector: string;
  taskType: string;
  executorIds: string[];
  validatorIds: string[];
  informIds: string[];
  startDate: string;
  dueDateOriginal: string;
  dueDateCurrent: string;
  estimatedMinutes: number;
  actualMinutes: number;
  priority: TaskPriority;
  status: TaskStatus;
};

export type TaskTimeEntry = {
  id: string;
  taskId: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  createdBy: string;
  note?: string | null;
  source: 'timer' | 'manual';
};

export type TaskDueDateChange = {
  id: string;
  taskId: string;
  previousDate: string;
  newDate: string;
  reason: string;
  changedBy: string;
  createdAt: string;
};

export type TaskAuditLog = {
  id: string;
  taskId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  createdAt: string;
};
