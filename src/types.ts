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

export type WorkspaceTagOption = {
  name: string;
  color: string;
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

export type TaskExecutionPeriod = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type ProjectTask = {
  id: string;
  projectId?: string;
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
  executionPeriods: TaskExecutionPeriod[];
  priority: TaskPriority;
  status: TaskStatus;
  displayOrder?: number;
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

export type TaskComment = {
  id: string;
  taskId: string;
  content: string;
  createdBy: string;
  createdAt: string;
};

export type ProjectExtraWorkEntry = {
  id: string;
  projectId: string;
  description: string;
  durationMinutes: number;
  workedAt: string;
  note?: string | null;
  createdBy: string;
  createdAt: string;
};

export type WorkspaceFeedPost = {
  id: string;
  workspaceId: string;
  content: string;
  taskIds: string[];
  mentionedUserIds: string[];
  createdBy: string;
  createdAt: string;
};

export type WorkspaceNotification = {
  id: string;
  workspaceId: string;
  postId: string;
  mentionedUserId: string;
  createdBy: string;
  createdAt: string;
  readAt?: string | null;
  postContent?: string | null;
};
