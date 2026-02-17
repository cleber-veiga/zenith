import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  ProjectExtraWorkEntry,
  Project,
  ProjectTask,
  SystemView,
  TaskAuditLog,
  TaskComment,
  TaskDueDateChange,
  TaskTimeEntry,
  UserProfile,
  UserRole,
  WorkspaceFeedPost,
  WorkspaceNotification,
  WorkspaceTagOption,
  Workspace
} from '../types';
import { Topbar } from '../components/Topbar';
import { Sidebar } from '../components/Sidebar';
import { DashboardSection } from './sections/DashboardSection';
import { MembersSection } from './sections/MembersSection';
import { ProfileSection } from './sections/ProfileSection';
import { ProjectSection } from './sections/ProjectSection';
import { WorkspaceModal } from '../components/modals/WorkspaceModal';
import { ProjectModal } from '../components/modals/ProjectModal';
import { EditProjectModal } from '../components/modals/EditProjectModal';

export function SystemScreen({
  session,
  onSignOut,
  userRole,
  isSuperUser,
  profile,
  theme,
  onToggleTheme,
  onProfileUpdated
}: {
  session: Session;
  onSignOut: () => void;
  userRole: UserRole | null;
  isSuperUser: boolean;
  profile: UserProfile | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onProfileUpdated: (next: UserProfile) => void;
}) {
  const userId = session.user.id;
  const [collapsed, setCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState<SystemView>('dashboard');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectSummary, setProjectSummary] = useState('');
  const [projectWorkspaceId, setProjectWorkspaceId] = useState<string | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [workspaceModalError, setWorkspaceModalError] = useState<string | null>(null);
  const [projectModalError, setProjectModalError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<{
    workspaceId: string;
    project: Project;
  } | null>(null);
  const [inviteRows, setInviteRows] = useState<
    Array<{
      id: string;
      email: string;
      role: UserRole;
      status: 'idle' | 'sending' | 'success' | 'error';
      message?: string;
    }>
  >([
    {
      id: crypto.randomUUID(),
      email: '',
      role: 'executor',
      status: 'idle'
    }
  ]);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<
    Array<{
      userId: string;
      role: UserRole;
      fullName?: string | null;
      title?: string | null;
      avatarUrl?: string | null;
      phone?: string | null;
      email?: string | null;
      validated?: boolean;
      lastSeen?: string | null;
    }>
  >([]);
  const [dashboardMembers, setDashboardMembers] = useState<
    Array<{
      userId: string;
      fullName?: string | null;
      title?: string | null;
      avatarUrl?: string | null;
      email?: string | null;
    }>
  >([]);
  const [projectMembers, setProjectMembers] = useState<
    Array<{
      userId: string;
      role: UserRole;
      fullName?: string | null;
      title?: string | null;
      avatarUrl?: string | null;
      phone?: string | null;
      email?: string | null;
      validated?: boolean;
      lastSeen?: string | null;
    }>
  >([]);
  const [profileForm, setProfileForm] = useState({
    fullName: profile?.fullName ?? '',
    title: profile?.title ?? '',
    company: profile?.company ?? '',
    phone: profile?.phone ?? '',
    avatarUrl: profile?.avatarUrl ?? ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [projectTaskState, setProjectTaskState] = useState<Record<string, ProjectTask[]>>({});
  const [projectExtraWorkEntries, setProjectExtraWorkEntries] = useState<
    Record<string, ProjectExtraWorkEntry[]>
  >({});
  const [taskTimeEntries, setTaskTimeEntries] = useState<Record<string, TaskTimeEntry[]>>({});
  const [taskDueDateChanges, setTaskDueDateChanges] = useState<Record<string, TaskDueDateChange[]>>(
    {}
  );
  const [taskAuditLogs, setTaskAuditLogs] = useState<Record<string, TaskAuditLog[]>>({});
  const [taskComments, setTaskComments] = useState<Record<string, TaskComment[]>>({});
  const [sectorOptions, setSectorOptions] = useState<WorkspaceTagOption[]>([]);
  const [taskTypeOptions, setTaskTypeOptions] = useState<WorkspaceTagOption[]>([]);
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorColor, setNewSectorColor] = useState('#0ea5e9');
  const [newTaskTypeName, setNewTaskTypeName] = useState('');
  const [newTaskTypeColor, setNewTaskTypeColor] = useState('#8b5cf6');
  const [dashboardProjectId, setDashboardProjectId] = useState<string>('all');
  const [dashboardTasks, setDashboardTasks] = useState<ProjectTask[]>([]);
  const [dashboardEvents, setDashboardEvents] = useState<
    Array<{
      id: string;
      taskId: string;
      createdAt: string;
      userId: string;
      type: 'audit' | 'time' | 'due' | 'comment' | 'extra';
      summary: string;
    }>
  >([]);
  const [dashboardFeedPosts, setDashboardFeedPosts] = useState<WorkspaceFeedPost[]>([]);
  const [dashboardEventsLoading, setDashboardEventsLoading] = useState(false);
  const [dashboardEventsHasMore, setDashboardEventsHasMore] = useState(true);
  const [dashboardEventsScope, setDashboardEventsScope] = useState<{
    workspaceId: string;
    projectIds: string[];
  } | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedWorkspaceId, setFeedWorkspaceId] = useState<string | null>(null);
  const [workspaceNotifications, setWorkspaceNotifications] = useState<WorkspaceNotification[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'members'>('general');
  const [onlineWorkspaceUserIds, setOnlineWorkspaceUserIds] = useState<string[]>([]);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  const canManageWorkspaces = isSuperUser || userRole === 'manager';
  const isViewer = userRole === 'viewer';
  const memberWorkspaces = isSuperUser
    ? workspaces
    : workspaces
        .filter((workspace) => workspace.createdBy === userId)
        .map((workspace) => ({
          ...workspace,
          projects: workspace.projects.filter((project) => project.createdBy === userId)
        }));

  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  const selectedProject =
    workspaces
      .flatMap((workspace) => workspace.projects)
      .find((project) => project.id === selectedProjectId) ?? null;
  const activeProjectTasks = selectedProjectId ? projectTaskState[selectedProjectId] ?? [] : [];
  const activeProjectExtraWorkEntries = selectedProjectId
    ? projectExtraWorkEntries[selectedProjectId] ?? []
    : [];

  const loadWorkspaces = async () => {
    setLoadingWorkspaces(true);
    setLoadError(null);

    const { data: workspaceRows, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, description, created_by, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (workspaceError) {
      console.error(workspaceError);
      setWorkspaces([]);
      setExpandedWorkspaces({});
      setSelectedWorkspaceId(null);
      setSelectedProjectId(null);
      setLoadError('Não foi possível carregar os workspaces.');
      setLoadingWorkspaces(false);
      return;
    }

    const workspaceIds = workspaceRows.map((workspace) => workspace.id);
    let projectsRows: Array<{
      id: string;
      name: string;
      summary: string | null;
      status: string | null;
      workspace_id: string;
      created_by: string;
    }> = [];

    if (workspaceIds.length) {
      const { data: projectRows, error: projectError } = await supabase
        .from('projects')
        .select('id, name, summary, status, workspace_id, created_by, created_at, updated_at')
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: true });

      if (projectError) {
        console.error(projectError);
        setLoadError('Não foi possível carregar os projetos.');
      } else if (projectRows) {
        projectsRows = projectRows;
      }
    }

    const projectsByWorkspace = new Map<string, Project[]>();
    projectsRows.forEach((project) => {
      const list = projectsByWorkspace.get(project.workspace_id) ?? [];
      list.push({
        id: project.id,
        name: project.name,
        summary: project.summary ?? undefined,
        status: project.status ?? undefined,
        createdBy: project.created_by
      });
      projectsByWorkspace.set(project.workspace_id, list);
    });

    const nextWorkspaces: Workspace[] = workspaceRows.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description ?? undefined,
      projects: projectsByWorkspace.get(workspace.id) ?? [],
      createdBy: workspace.created_by
    }));

    setWorkspaces(nextWorkspaces);
    setExpandedWorkspaces(
      nextWorkspaces.reduce<Record<string, boolean>>((acc, workspace) => {
        acc[workspace.id] = true;
        return acc;
      }, {})
    );
    setSelectedWorkspaceId((prev) =>
      nextWorkspaces.some((workspace) => workspace.id === prev)
        ? prev
        : nextWorkspaces[0]?.id ?? null
    );

    if (selectedProjectId) {
      const projectExists = nextWorkspaces.some((workspace) =>
        workspace.projects.some((project) => project.id === selectedProjectId)
      );
      if (!projectExists) {
        setSelectedProjectId(null);
        setCurrentView('dashboard');
      }
    }

    setLoadingWorkspaces(false);
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadProjectTasks = async (projectId: string) => {
    const { data: taskRows, error: tasksError } = await supabase
      .from('project_tasks')
      .select(
        [
          'id',
          'name',
          'description',
          'sector',
          'task_type',
          'executor_ids',
          'validator_ids',
          'inform_ids',
          'start_date',
          'due_date_original',
          'due_date_current',
          'completion_date',
          'execution_periods',
          'estimated_minutes',
          'actual_minutes',
          'priority',
          'status',
          'display_order'
        ].join(', ')
      )
      .eq('project_id', projectId)
      .order('status', { ascending: true })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.error('Erro ao carregar tarefas:', tasksError);
      return;
    }

    const normalizeStatus = (status: string | null): ProjectTask['status'] => {
      switch (status) {
        case 'Não iniciado':
          return 'Backlog';
        case 'Em andamento':
          return 'Em Execução';
        case 'Em revisão':
          return 'Em Validação';
        case 'Concluído':
          return 'Concluída';
        case 'Bloqueado':
          return 'Bloqueada';
        default:
          return (status as ProjectTask['status']) || 'Backlog';
      }
    };

    const mappedTasks: ProjectTask[] = (taskRows ?? []).map((row) => {
      const description = row.description ?? row.name ?? '';
      const name = row.name ?? description;
      return {
        id: row.id,
        projectId: projectId,
        name,
        description,
      sector: row.sector ?? '',
      taskType: row.task_type ?? '',
      executorIds: (row.executor_ids as string[] | null) ?? [],
      validatorIds: (row.validator_ids as string[] | null) ?? [],
      informIds: (row.inform_ids as string[] | null) ?? [],
      startDate: row.start_date ?? '',
      dueDateOriginal: row.due_date_original ?? '',
      dueDateCurrent: row.due_date_current ?? '',
      completionDate: row.completion_date ?? '',
      executionPeriods: (row.execution_periods as ProjectTask['executionPeriods'] | null) ?? [],
      estimatedMinutes: row.estimated_minutes ?? 0,
      actualMinutes: row.actual_minutes ?? 0,
        priority: (row.priority ?? 'Média') as ProjectTask['priority'],
        status: normalizeStatus(row.status ?? 'Backlog'),
        displayOrder: row.display_order ?? 0
      };
    });

    setProjectTaskState((prev) => ({
      ...prev,
      [projectId]: mappedTasks
    }));
  };

  const loadProjectExtraWorkEntries = async (projectId: string) => {
    const { data, error } = await supabase
      .from('project_extra_work_entries')
      .select('id, project_id, description, duration_minutes, worked_at, note, created_by, created_at')
      .eq('project_id', projectId)
      .order('worked_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar trabalhos extras:', error);
      return;
    }

    setProjectExtraWorkEntries((prev) => ({
      ...prev,
      [projectId]: (data ?? []).map((row) => ({
        id: row.id,
        projectId: row.project_id,
        description: row.description ?? '',
        durationMinutes: row.duration_minutes ?? 0,
        workedAt: row.worked_at ?? '',
        note: row.note,
        createdBy: row.created_by,
        createdAt: row.created_at
      }))
    }));
  };

  const FEED_PAGE_SIZE = 30;
  const FEED_EVENTS_PAGE_SIZE = 30;

  const loadWorkspaceFeedPosts = async (
    workspaceId: string,
    options?: { append?: boolean }
  ) => {
    const append = options?.append ?? false;
    const shouldReset = !append || feedWorkspaceId !== workspaceId;
    if (feedLoading && !shouldReset) return;
    if (shouldReset) {
      setFeedHasMore(true);
    }
    setFeedLoading(true);

    const from = shouldReset ? 0 : dashboardFeedPosts.length;
    const to = from + FEED_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('workspace_feed_posts')
      .select('id, workspace_id, content, task_ids, mentioned_user_ids, created_by, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Erro ao carregar feed do workspace:', error);
      if (shouldReset) {
        setDashboardFeedPosts([]);
      }
      setFeedHasMore(false);
      setFeedLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      content: row.content ?? '',
      taskIds: (row.task_ids as string[] | null) ?? [],
      mentionedUserIds: (row.mentioned_user_ids as string[] | null) ?? [],
      createdBy: row.created_by,
      createdAt: row.created_at
    }));

    setDashboardFeedPosts((prev) => {
      if (shouldReset) return mapped;
      const seen = new Set(prev.map((post) => post.id));
      const next = [...prev];
      mapped.forEach((post) => {
        if (!seen.has(post.id)) next.push(post);
      });
      return next;
    });

    setFeedHasMore((data ?? []).length === FEED_PAGE_SIZE);
    setFeedWorkspaceId(workspaceId);
    setFeedLoading(false);
  };

  const loadWorkspaceNotifications = async () => {
    const { data, error } = await supabase
      .from('workspace_notifications')
      .select('id, workspace_id, post_id, mentioned_user_id, created_by, created_at, read_at')
      .eq('mentioned_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Erro ao carregar notificações:', error);
      setWorkspaceNotifications([]);
      return;
    }

    const postIds = Array.from(new Set((data ?? []).map((row) => row.post_id).filter(Boolean)));
    let postContentById = new Map<string, string | null>();

    if (postIds.length) {
      const { data: postRows, error: postError } = await supabase
        .from('workspace_feed_posts')
        .select('id, content')
        .in('id', postIds);

      if (postError) {
        console.error('Erro ao carregar conteúdo das notificações:', postError);
      } else {
        postContentById = new Map(
          (postRows ?? []).map((row) => [row.id, row.content ?? null])
        );
      }
    }

    setWorkspaceNotifications(
      (data ?? []).map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        postId: row.post_id,
        mentionedUserId: row.mentioned_user_id,
        createdBy: row.created_by,
        createdAt: row.created_at,
        readAt: row.read_at,
        postContent: postContentById.get(row.post_id) ?? null
      }))
    );
  };

  const loadDashboardData = async (workspaceId: string, projectId: string) => {
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return;
    const projectIds =
      projectId !== 'all' ? [projectId] : workspace.projects.map((item) => item.id);
    if (!projectIds.length) {
      setDashboardTasks([]);
      setDashboardEvents([]);
      setDashboardMembers([]);
      setDashboardEventsHasMore(false);
      setDashboardEventsScope(null);
      await loadWorkspaceFeedPosts(workspaceId);
      setDashboardLoading(false);
      return;
    }
    setDashboardLoading(true);

    const { data: taskRows, error: taskError } = await supabase
      .from('project_tasks')
      .select(
        [
          'id',
          'project_id',
          'name',
          'description',
          'sector',
          'task_type',
          'executor_ids',
          'validator_ids',
          'inform_ids',
          'start_date',
          'due_date_original',
          'due_date_current',
          'completion_date',
          'execution_periods',
          'estimated_minutes',
          'actual_minutes',
          'priority',
          'status',
          'display_order'
        ].join(', ')
      )
      .in('project_id', projectIds)
      .order('status', { ascending: true })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (taskError) {
      console.error('Erro ao carregar dashboard:', taskError);
      setDashboardLoading(false);
      return;
    }

    const normalizeStatus = (status: string | null): ProjectTask['status'] => {
      switch (status) {
        case 'Não iniciado':
          return 'Backlog';
        case 'Em andamento':
          return 'Em Execução';
        case 'Em revisão':
          return 'Em Validação';
        case 'Concluído':
          return 'Concluída';
        case 'Bloqueado':
          return 'Bloqueada';
        default:
          return (status as ProjectTask['status']) || 'Backlog';
      }
    };

    const mappedTasks: ProjectTask[] = (taskRows ?? []).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name ?? row.description ?? '',
      description: row.description ?? row.name ?? '',
      sector: row.sector ?? '',
      taskType: row.task_type ?? '',
      executorIds: (row.executor_ids as string[] | null) ?? [],
      validatorIds: (row.validator_ids as string[] | null) ?? [],
      informIds: (row.inform_ids as string[] | null) ?? [],
      startDate: row.start_date ?? '',
      dueDateOriginal: row.due_date_original ?? '',
      dueDateCurrent: row.due_date_current ?? '',
      completionDate: row.completion_date ?? '',
      executionPeriods: (row.execution_periods as ProjectTask['executionPeriods'] | null) ?? [],
      estimatedMinutes: row.estimated_minutes ?? 0,
      actualMinutes: row.actual_minutes ?? 0,
      priority: (row.priority ?? 'Média') as ProjectTask['priority'],
      status: normalizeStatus(row.status ?? 'Backlog'),
      displayOrder: row.display_order ?? 0
    }));

    setDashboardTasks(mappedTasks);

    const localMemberMap = new Map<string, string>();
    workspaceMembers.forEach((m) => {
      localMemberMap.set(m.userId, m.fullName || m.email || m.userId);
    });

    const dashboardMemberIds = Array.from(
      new Set(
        mappedTasks.flatMap((task) => [
          ...task.executorIds,
          ...task.validatorIds,
          ...task.informIds
        ])
      )
    );

    if (dashboardMemberIds.length) {
      const { data: profiles, error: profilesError } = await supabase.rpc('get_profiles_with_email', {
        user_ids: dashboardMemberIds
      });
      if (profilesError) {
        console.error('Erro ao carregar perfis no dashboard:', profilesError);
      } else {
        (profiles ?? []).forEach((profile: {
            user_id: string;
            full_name?: string | null;
            title?: string | null;
            avatar_url?: string | null;
            email?: string | null;
          }) => {
            localMemberMap.set(profile.user_id, profile.full_name || profile.email || profile.user_id);
          });

        setDashboardMembers(
          (profiles ?? []).map((profile: {
            user_id: string;
            full_name?: string | null;
            title?: string | null;
            avatar_url?: string | null;
            email?: string | null;
          }) => ({
            userId: profile.user_id,
            fullName: profile.full_name ?? null,
            title: profile.title ?? null,
            avatarUrl: profile.avatar_url ?? null,
            email: profile.email ?? null
          }))
        );
      }
    } else {
      setDashboardMembers([]);
    }

    const taskIds = mappedTasks.map((item) => item.id);
    if (!taskIds.length) {
      setDashboardEvents([]);
      setDashboardEventsHasMore(false);
      setDashboardEventsScope({ workspaceId, projectIds });
      setDashboardLoading(false);
      return;
    }

    const [timeResult, dueResult, auditResult, commentResult, extraResult] = await Promise.all([
      supabase
        .from('project_task_time_entries')
        .select('id, task_id, created_at, created_by, duration_minutes, source')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
        .limit(FEED_EVENTS_PAGE_SIZE),
      supabase
        .from('project_task_due_date_changes')
        .select('id, task_id, created_at, changed_by, previous_date, new_date, reason')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
        .limit(FEED_EVENTS_PAGE_SIZE),
      supabase
        .from('project_task_audit_logs')
        .select('id, task_id, created_at, changed_by, field, old_value, new_value')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
        .limit(FEED_EVENTS_PAGE_SIZE),
      supabase
        .from('project_task_comments')
        .select('id, task_id, created_at, created_by, content')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
        .limit(FEED_EVENTS_PAGE_SIZE)
      ,
      supabase
        .from('project_extra_work_entries')
        .select('id, project_id, description, duration_minutes, worked_at, created_by, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(FEED_EVENTS_PAGE_SIZE)
    ]);

    if (timeResult.error) console.error('Erro ao carregar tempo dashboard:', timeResult.error);
    if (dueResult.error) console.error('Erro ao carregar prazos dashboard:', dueResult.error);
    if (auditResult.error) console.error('Erro ao carregar auditoria dashboard:', auditResult.error);
    if (commentResult.error) console.error('Erro ao carregar comentários dashboard:', commentResult.error);
    if (extraResult.error) console.error('Erro ao carregar trabalhos extras dashboard:', extraResult.error);

    const timeEvents =
      timeResult.data?.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        createdAt: row.created_at,
        userId: row.created_by,
        type: 'time' as const,
        summary: `Tempo ${row.duration_minutes ?? 0}m (${row.source})`
      })) ?? [];

    const dueEvents =
      dueResult.data?.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        createdAt: row.created_at,
        userId: row.changed_by,
        type: 'due' as const,
        summary: `Prazo ${row.previous_date ? row.previous_date.split('-').reverse().join('/') : '-'} → ${row.new_date ? row.new_date.split('-').reverse().join('/') : '-'}`
      })) ?? [];

    const formatAuditValue = (field: string, value: string | null) => {
      if (!value || value === 'null') return '-';
      
      if (field === 'executionPeriods') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            if (!parsed.length) return 'Nenhum';
            return parsed.map((p: any) => {
              const d = p.date ? p.date.split('-').reverse().join('/') : '?';
              const t = (p.startTime && p.endTime) ? `${p.startTime}-${p.endTime}` : (p.startTime || '?');
              return `[${d} ${t}]`;
            }).join(', ');
          }
        } catch {}
      }

      if (['Executor', 'Validador', 'Informar', 'executorIds', 'validatorIds', 'informIds'].includes(field)) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            if (!parsed.length) return 'Nenhum';
            return parsed.map((id: string) => localMemberMap.get(id) ?? id).join(', ');
          }
        } catch {}
      }

      return value;
    };

    const auditEvents =
      auditResult.data?.map((row) => {
        const fieldLabel = row.field === 'executionPeriods' ? 'Períodos de Execução' : row.field;
        const oldVal = formatAuditValue(row.field, row.old_value);
        const newVal = formatAuditValue(row.field, row.new_value);
        return {
          id: row.id,
          taskId: row.task_id,
          createdAt: row.created_at,
          userId: row.changed_by,
          type: 'audit' as const,
          summary: `${fieldLabel}: ${oldVal} → ${newVal}`
        };
      }) ?? [];

    const commentEvents =
      commentResult.data?.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        createdAt: row.created_at,
        userId: row.created_by,
        type: 'comment' as const,
        summary: row.content ?? ''
      })) ?? [];

    const extraEvents =
      extraResult.data?.map((row) => ({
        id: row.id,
        taskId: '',
        createdAt: row.created_at,
        userId: row.created_by,
        type: 'extra' as const,
        summary: `Trabalho extra (${row.duration_minutes ?? 0}m): ${row.description ?? ''}`
      })) ?? [];

    const merged = [...timeEvents, ...dueEvents, ...auditEvents, ...commentEvents, ...extraEvents].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    setDashboardEvents(merged.slice(0, FEED_EVENTS_PAGE_SIZE));
    setDashboardEventsHasMore(
      (timeResult.data?.length ?? 0) === FEED_EVENTS_PAGE_SIZE ||
        (dueResult.data?.length ?? 0) === FEED_EVENTS_PAGE_SIZE ||
        (auditResult.data?.length ?? 0) === FEED_EVENTS_PAGE_SIZE ||
        (commentResult.data?.length ?? 0) === FEED_EVENTS_PAGE_SIZE ||
        (extraResult.data?.length ?? 0) === FEED_EVENTS_PAGE_SIZE
    );
    setDashboardEventsScope({ workspaceId, projectIds });
    await loadWorkspaceFeedPosts(workspaceId);
    setDashboardLoading(false);
  };

  const loadMoreDashboardEvents = async () => {
    if (dashboardEventsLoading || !dashboardEventsHasMore || !dashboardEventsScope) return;
    const { projectIds } = dashboardEventsScope;
    const taskIds = dashboardTasks.map((task) => task.id).filter(Boolean);
    if (!taskIds.length || !projectIds.length) {
      setDashboardEventsHasMore(false);
      return;
    }

    const oldestEvent = [...dashboardEvents]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    const beforeDate = oldestEvent?.createdAt;
    if (!beforeDate) {
      setDashboardEventsHasMore(false);
      return;
    }

    setDashboardEventsLoading(true);

    const [timeResult, dueResult, auditResult, commentResult, extraResult] = await Promise.all([
      supabase
        .from('project_task_time_entries')
        .select('id, task_id, created_at, created_by, duration_minutes, source')
        .in('task_id', taskIds)
        .lt('created_at', beforeDate)
        .order('created_at', { ascending: false })
        .limit(FEED_EVENTS_PAGE_SIZE),
      supabase
        .from('project_task_due_date_changes')
        .select('id, task_id, created_at, changed_by, previous_date, new_date, reason')
        .in('task_id', taskIds)
        .lt('created_at', beforeDate)
        .order('created_at', { ascending: false })
        .limit(FEED_EVENTS_PAGE_SIZE),
      supabase
        .from('project_task_audit_logs')
        .select('id, task_id, created_at, changed_by, field, old_value, new_value')
        .in('task_id', taskIds)
        .lt('created_at', beforeDate)
        .order('created_at', { ascending: false })
        .limit(FEED_EVENTS_PAGE_SIZE),
      supabase
        .from('project_task_comments')
        .select('id, task_id, created_at, created_by, content')
        .in('task_id', taskIds)
        .lt('created_at', beforeDate)
        .order('created_at', { ascending: false })
        .limit(FEED_EVENTS_PAGE_SIZE),
      supabase
        .from('project_extra_work_entries')
        .select('id, project_id, description, duration_minutes, worked_at, created_by, created_at')
        .in('project_id', projectIds)
        .lt('created_at', beforeDate)
        .order('created_at', { ascending: false })
        .limit(FEED_EVENTS_PAGE_SIZE)
    ]);

    if (timeResult.error) console.error('Erro ao carregar tempo dashboard:', timeResult.error);
    if (dueResult.error) console.error('Erro ao carregar prazos dashboard:', dueResult.error);
    if (auditResult.error) console.error('Erro ao carregar auditoria dashboard:', auditResult.error);
    if (commentResult.error) console.error('Erro ao carregar comentários dashboard:', commentResult.error);
    if (extraResult.error) console.error('Erro ao carregar trabalhos extras dashboard:', extraResult.error);

    const localMemberMap = new Map<string, string>();
    workspaceMembers.forEach((m) => {
      localMemberMap.set(m.userId, m.fullName || m.email || m.userId);
    });
    dashboardMembers.forEach((m) => {
      if (!localMemberMap.has(m.userId)) {
        localMemberMap.set(m.userId, m.fullName || m.email || m.userId);
      }
    });

    const timeEvents =
      timeResult.data?.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        createdAt: row.created_at,
        userId: row.created_by,
        type: 'time' as const,
        summary: `Tempo ${row.duration_minutes ?? 0}m (${row.source})`
      })) ?? [];

    const dueEvents =
      dueResult.data?.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        createdAt: row.created_at,
        userId: row.changed_by,
        type: 'due' as const,
        summary: `Prazo ${row.previous_date ? row.previous_date.split('-').reverse().join('/') : '-'} → ${row.new_date ? row.new_date.split('-').reverse().join('/') : '-'}`
      })) ?? [];

    const formatAuditValue = (field: string, value: string | null) => {
      if (!value || value === 'null') return '-';

      if (field === 'executionPeriods') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            if (!parsed.length) return 'Nenhum';
            return parsed
              .map((p: any) => {
                const d = p.date ? p.date.split('-').reverse().join('/') : '?';
                const t =
                  p.startTime && p.endTime ? `${p.startTime}-${p.endTime}` : p.startTime || '?';
                return `[${d} ${t}]`;
              })
              .join(', ');
          }
        } catch {}
      }

      if (['Executor', 'Validador', 'Informar', 'executorIds', 'validatorIds', 'informIds'].includes(field)) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            if (!parsed.length) return 'Nenhum';
            return parsed.map((id: string) => localMemberMap.get(id) ?? id).join(', ');
          }
        } catch {}
      }

      return value;
    };

    const auditEvents =
      auditResult.data?.map((row) => {
        const fieldLabel = row.field === 'executionPeriods' ? 'Períodos de Execução' : row.field;
        const oldVal = formatAuditValue(row.field, row.old_value);
        const newVal = formatAuditValue(row.field, row.new_value);
        return {
          id: row.id,
          taskId: row.task_id,
          createdAt: row.created_at,
          userId: row.changed_by,
          type: 'audit' as const,
          summary: `${fieldLabel}: ${oldVal} → ${newVal}`
        };
      }) ?? [];

    const commentEvents =
      commentResult.data?.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        createdAt: row.created_at,
        userId: row.created_by,
        type: 'comment' as const,
        summary: row.content ?? ''
      })) ?? [];

    const extraEvents =
      extraResult.data?.map((row) => ({
        id: row.id,
        taskId: '',
        createdAt: row.created_at,
        userId: row.created_by,
        type: 'extra' as const,
        summary: `Trabalho extra (${row.duration_minutes ?? 0}m): ${row.description ?? ''}`
      })) ?? [];

    const incoming = [...timeEvents, ...dueEvents, ...auditEvents, ...commentEvents, ...extraEvents];
    if (!incoming.length) {
      setDashboardEventsHasMore(false);
      setDashboardEventsLoading(false);
      return;
    }

    setDashboardEvents((prev) => {
      const seen = new Set(prev.map((event) => `${event.type}-${event.id}`));
      const merged = [...prev];
      incoming.forEach((event) => {
        const key = `${event.type}-${event.id}`;
        if (!seen.has(key)) merged.push(event);
      });
      return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });

    setDashboardEventsHasMore(
      (timeResult.data?.length ?? 0) === FEED_EVENTS_PAGE_SIZE ||
        (dueResult.data?.length ?? 0) === FEED_EVENTS_PAGE_SIZE ||
        (auditResult.data?.length ?? 0) === FEED_EVENTS_PAGE_SIZE ||
        (commentResult.data?.length ?? 0) === FEED_EVENTS_PAGE_SIZE ||
        (extraResult.data?.length ?? 0) === FEED_EVENTS_PAGE_SIZE
    );
    setDashboardEventsLoading(false);
  };


  useEffect(() => {
    setProfileForm({
      fullName: profile?.fullName ?? '',
      title: profile?.title ?? '',
      company: profile?.company ?? '',
      phone: profile?.phone ?? '',
      avatarUrl: profile?.avatarUrl ?? ''
    });
  }, [profile?.fullName, profile?.title, profile?.company, profile?.phone, profile?.avatarUrl]);

  useEffect(() => {
    if (!selectedProjectId) return;
    void Promise.all([
      loadProjectTasks(selectedProjectId),
      loadProjectExtraWorkEntries(selectedProjectId)
    ]);
  }, [selectedProjectId]);

  const loadSectorAndTypes = async (workspaceId: string) => {
    const [{ data: sectorRows, error: sectorError }, { data: typeRows, error: typeError }] =
      await Promise.all([
        supabase
          .from('sectors')
          .select('name, color')
          .eq('workspace_id', workspaceId)
          .order('name', { ascending: true }),
        supabase
          .from('task_types')
          .select('name, color')
          .eq('workspace_id', workspaceId)
          .order('name', { ascending: true })
      ]);

    if (sectorError) console.error('Erro ao carregar setores:', sectorError);
    if (typeError) console.error('Erro ao carregar tipos:', typeError);

    setSectorOptions(
      (sectorRows ?? []).map((row) => ({
        name: row.name,
        color: row.color ?? '#64748b'
      }))
    );
    setTaskTypeOptions(
      (typeRows ?? []).map((row) => ({
        name: row.name,
        color: row.color ?? '#64748b'
      }))
    );
  };

  useEffect(() => {
    if (!memberWorkspaces.length) return;
    if (!selectedWorkspaceId || !memberWorkspaces.some((workspace) => workspace.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(memberWorkspaces[0].id);
    }
  }, [memberWorkspaces, selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    void loadSectorAndTypes(selectedWorkspaceId);
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    setDashboardProjectId('all');
  }, [selectedWorkspaceId]);

  const handleCreateWorkspace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorkspaceModalError(null);
    if (!canManageWorkspaces) return;
    if (!workspaceName.trim()) return;
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName.trim(),
        description: workspaceDescription.trim(),
        created_by: userId
      })
      .select('id, name, description, created_by')
      .single();

    if (workspaceError || !workspace) {
      console.error(workspaceError);
      setWorkspaceModalError('Não foi possível criar o workspace.');
      return;
    }
    setWorkspaceName('');
    setWorkspaceDescription('');
    setShowWorkspaceModal(false);
    await loadWorkspaces();
  };

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProjectModalError(null);
    if (!canManageWorkspaces) return;
    const targetWorkspace =
      workspaces.find((workspace) => workspace.id === projectWorkspaceId) ?? selectedWorkspace;
    if (!projectName.trim() || !targetWorkspace) return;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: projectName.trim(),
        summary: projectSummary.trim(),
        status: 'Novo',
        workspace_id: targetWorkspace.id,
        created_by: userId
      })
      .select('id, name, summary, status, workspace_id, created_by')
      .single();

    if (projectError || !project) {
      console.error(projectError);
      setProjectModalError('Não foi possível criar o projeto.');
      return;
    }
    setProjectName('');
    setProjectSummary('');
    setProjectWorkspaceId(null);
    setShowProjectModal(false);
    await loadWorkspaces();
  };

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces((prev) => ({ ...prev, [workspaceId]: !prev[workspaceId] }));
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    const target = workspaces.find((workspace) => workspace.id === workspaceId);
    if (!target) return;
    if (!canManageWorkspaces) return;
    if (!isSuperUser && target.createdBy !== userId) return;
    if (!window.confirm(`Excluir o workspace "${target.name}"?`)) return;

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId)
        .select();

      if (error) {
        console.error('Erro ao excluir workspace:', error);
        alert(`Erro ao excluir workspace: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('Nenhum workspace excluído. Verifique permissões.');
        alert('Não foi possível excluir o workspace. Verifique se você tem permissão de gerente.');
        return;
      }

      await loadWorkspaces();
    } catch (err) {
      console.error('Exceção inesperada:', err);
      alert('Erro inesperado ao excluir workspace.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!canManageWorkspaces) return;
    const targetWorkspace = workspaces.find((workspace) =>
      workspace.projects.some((project) => project.id === projectId)
    );
    const targetProject = targetWorkspace?.projects.find((project) => project.id === projectId);
    if (!isSuperUser && targetProject?.createdBy !== userId) return;
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) {
      console.error(error);
      return;
    }
    await loadWorkspaces();
  };

  const handleAddSector = async () => {
    if (!canManageWorkspaces) {
      alert('Você não tem permissão para criar setores neste workspace.');
      return;
    }
    if (!selectedWorkspaceId) return;
    if (!newSectorName.trim()) return;
    const { data, error } = await supabase
      .from('sectors')
      .insert({
        workspace_id: selectedWorkspaceId,
        name: newSectorName.trim(),
        color: newSectorColor,
        created_by: userId
      })
      .select('name, color')
      .single();
    if (error || !data) {
      console.error('Erro ao criar setor:', error);
      if (error?.code === '42501' || error?.message?.toLowerCase().includes('permission')) {
        alert('Permissão negada para criar setor. Verifique se seu perfil é gerente neste workspace.');
      }
      return;
    }
    setSectorOptions((prev) =>
      [...prev, { name: data.name, color: data.color ?? '#64748b' }].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    setNewSectorName('');
    setNewSectorColor('#0ea5e9');
  };

  const handleRemoveSector = async (name: string) => {
    if (!canManageWorkspaces) {
      alert('Você não tem permissão para remover setores neste workspace.');
      return;
    }
    if (!selectedWorkspaceId) return;
    const { error } = await supabase
      .from('sectors')
      .delete()
      .eq('workspace_id', selectedWorkspaceId)
      .eq('name', name);
    if (error) {
      console.error('Erro ao remover setor:', error);
      if (error?.code === '42501' || error?.message?.toLowerCase().includes('permission')) {
        alert('Permissão negada para remover setor.');
      }
      return;
    }
    setSectorOptions((prev) => prev.filter((item) => item.name !== name));
  };

  const handleUpdateSectorColor = async (name: string, color: string) => {
    if (!canManageWorkspaces) {
      alert('Você não tem permissão para editar setores neste workspace.');
      return;
    }
    if (!selectedWorkspaceId) return;
    const nextColor = color || '#64748b';
    const previous = sectorOptions;
    setSectorOptions((prev) =>
      prev.map((item) => (item.name === name ? { ...item, color: nextColor } : item))
    );
    const { error } = await supabase
      .from('sectors')
      .update({ color: nextColor })
      .eq('workspace_id', selectedWorkspaceId)
      .eq('name', name);

    if (error) {
      console.error('Erro ao atualizar cor do setor:', error);
      if (error?.code === '42501' || error?.message?.toLowerCase().includes('permission')) {
        alert('Permissão negada para editar setor.');
      }
      setSectorOptions(previous);
    }
  };

  const handleAddTaskType = async () => {
    if (!canManageWorkspaces) {
      alert('Você não tem permissão para criar tipos neste workspace.');
      return;
    }
    if (!selectedWorkspaceId) return;
    if (!newTaskTypeName.trim()) return;
    const { data, error } = await supabase
      .from('task_types')
      .insert({
        workspace_id: selectedWorkspaceId,
        name: newTaskTypeName.trim(),
        color: newTaskTypeColor,
        created_by: userId
      })
      .select('name, color')
      .single();
    if (error || !data) {
      console.error('Erro ao criar tipo:', error);
      if (error?.code === '42501' || error?.message?.toLowerCase().includes('permission')) {
        alert('Permissão negada para criar tipo. Verifique se seu perfil é gerente neste workspace.');
      }
      return;
    }
    setTaskTypeOptions((prev) =>
      [...prev, { name: data.name, color: data.color ?? '#64748b' }].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    setNewTaskTypeName('');
    setNewTaskTypeColor('#8b5cf6');
  };

  const handleRemoveTaskType = async (name: string) => {
    if (!canManageWorkspaces) {
      alert('Você não tem permissão para remover tipos neste workspace.');
      return;
    }
    if (!selectedWorkspaceId) return;
    const { error } = await supabase
      .from('task_types')
      .delete()
      .eq('workspace_id', selectedWorkspaceId)
      .eq('name', name);
    if (error) {
      console.error('Erro ao remover tipo:', error);
      if (error?.code === '42501' || error?.message?.toLowerCase().includes('permission')) {
        alert('Permissão negada para remover tipo.');
      }
      return;
    }
    setTaskTypeOptions((prev) => prev.filter((item) => item.name !== name));
  };

  const handleUpdateTaskTypeColor = async (name: string, color: string) => {
    if (!canManageWorkspaces) {
      alert('Você não tem permissão para editar tipos neste workspace.');
      return;
    }
    if (!selectedWorkspaceId) return;
    const nextColor = color || '#64748b';
    const previous = taskTypeOptions;
    setTaskTypeOptions((prev) =>
      prev.map((item) => (item.name === name ? { ...item, color: nextColor } : item))
    );
    const { error } = await supabase
      .from('task_types')
      .update({ color: nextColor })
      .eq('workspace_id', selectedWorkspaceId)
      .eq('name', name);

    if (error) {
      console.error('Erro ao atualizar cor do tipo:', error);
      if (error?.code === '42501' || error?.message?.toLowerCase().includes('permission')) {
        alert('Permissão negada para editar tipo.');
      }
      setTaskTypeOptions(previous);
    }
  };

  const handleEditProjectSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProject) return;
    const { project } = editingProject;
    if (!canManageWorkspaces) return;
    if (!isSuperUser && project.createdBy !== userId) return;
    if (!project.name.trim()) return;
    const { error } = await supabase
      .from('projects')
      .update({ name: project.name.trim(), summary: project.summary ?? null })
      .eq('id', project.id);
    if (error) {
      console.error(error);
      return;
    }
    setEditingProject(null);
    await loadWorkspaces();
  };

  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSuperUser && !memberWorkspaces.length) return;
    if (!selectedWorkspaceId) {
      setInviteMessage('Selecione um workspace.');
      return;
    }
    const pendingRows = inviteRows.filter((row) => row.email.trim());
    if (!pendingRows.length) {
      setInviteMessage('Adicione ao menos um e-mail.');
      return;
    }

    setInviteMessage(null);
    setInviteRows((prev) =>
      prev.map((row) =>
        row.email.trim()
          ? {
              ...row,
              status: 'sending',
              message: undefined
            }
          : row
      )
    );

    const scopeBody = selectedProjectId
      ? { projectIds: [selectedProjectId], workspaceIds: [] }
      : { workspaceIds: [selectedWorkspaceId], projectIds: [] };

    let successCount = 0;
    for (const row of pendingRows) {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: row.email.trim(),
          role: row.role,
          ...scopeBody
        }
      });

      if (error || data?.error) {
        const message = error?.message ?? data?.error ?? 'Não foi possível enviar o convite.';
        setInviteRows((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  status: 'error',
                  message
                }
              : item
          )
        );
      } else {
        successCount += 1;
        setInviteRows((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  status: 'success',
                  message: 'Convite enviado.'
                }
              : item
          )
        );
      }
    }

    if (successCount) {
      setInviteMessage(
        successCount === pendingRows.length
          ? 'Convites enviados com sucesso.'
          : 'Alguns convites foram enviados com sucesso.'
      );
      await loadMembers();
    }
  };

  const loadMembers = async () => {
    if (!selectedWorkspaceId) {
      setWorkspaceMembers([]);
      setProjectMembers([]);
      return;
    }

    setMembersLoading(true);
    setMembersError(null);

    const workspaceResponse = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', selectedWorkspaceId);

    const projectResponse = selectedProjectId
      ? await supabase
          .from('project_members')
          .select('user_id, role')
          .eq('project_id', selectedProjectId)
      : { data: [], error: null };

    const presenceResponse = await supabase
      .from('workspace_user_presence')
      .select('user_id, last_seen')
      .eq('workspace_id', selectedWorkspaceId);

    if (workspaceResponse.error || projectResponse.error) {
      console.error(workspaceResponse.error || projectResponse.error);
      setMembersError('Não foi possível carregar os membros.');
      setMembersLoading(false);
      return;
    }
    if (presenceResponse.error) {
      console.error('Erro ao carregar presença:', presenceResponse.error);
    }

    const workspaceRows = workspaceResponse.data ?? [];
    const projectRows = projectResponse.data ?? [];
    const userIds = Array.from(
      new Set([...workspaceRows, ...projectRows].map((row) => row.user_id))
    );

    let profileMap = new Map<
      string,
      {
        full_name?: string | null;
        title?: string | null;
        avatar_url?: string | null;
        phone?: string | null;
        email?: string | null;
        password_set?: boolean | null;
      }
    >();
    const presenceMap = new Map<string, string | null>(
      (presenceResponse.data ?? []).map((row) => [row.user_id, row.last_seen ?? null])
    );
    if (userIds.length) {
      const { data: profiles, error: profilesError } = await supabase.rpc('get_profiles_with_email', {
        user_ids: userIds
      });
      
      if (profilesError) {
        console.error(profilesError);
      } else if (profiles) {
        profileMap = new Map(
          profiles.map((profile) => [
            profile.user_id,
            {
              full_name: profile.full_name,
              title: profile.title,
              avatar_url: profile.avatar_url,
              phone: profile.phone,
              email: profile.email,
              password_set: profile.password_set
            }
          ])
        );
      }
    }

    setWorkspaceMembers(
      workspaceRows.map((row) => {
        const profileData = profileMap.get(row.user_id);
        return {
          userId: row.user_id,
          role: row.role,
          fullName: profileData?.full_name ?? null,
          title: profileData?.title ?? null,
          avatarUrl: profileData?.avatar_url ?? null,
          phone: profileData?.phone ?? null,
          email: profileData?.email ?? null,
          validated: Boolean(profileData?.password_set),
          lastSeen: presenceMap.get(row.user_id) ?? null
        };
      })
    );

    setProjectMembers(
      projectRows.map((row) => {
        const profileData = profileMap.get(row.user_id);
        return {
          userId: row.user_id,
          role: row.role,
          fullName: profileData?.full_name ?? null,
          title: profileData?.title ?? null,
          avatarUrl: profileData?.avatar_url ?? null,
          phone: profileData?.phone ?? null,
          email: profileData?.email ?? null,
          validated: Boolean(profileData?.password_set),
          lastSeen: presenceMap.get(row.user_id) ?? null
        };
      })
    );

    setMembersLoading(false);
  };

  useEffect(() => {
    if (!isViewer) return;
    if (currentView !== 'dashboard') {
      setCurrentView('dashboard');
    }
    if (selectedProjectId) {
      setSelectedProjectId(null);
    }
  }, [isViewer, currentView, selectedProjectId]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setOnlineWorkspaceUserIds([]);
      return;
    }

    const channel = supabase.channel(`workspace-presence:${selectedWorkspaceId}`, {
      config: {
        presence: { key: userId }
      }
    });
    presenceChannelRef.current = channel;

    const syncPresence = () => {
      const state = channel.presenceState();
      setOnlineWorkspaceUserIds(Object.keys(state));
    };

    channel.on('presence', { event: 'sync' }, syncPresence);
    channel.on('presence', { event: 'join' }, syncPresence);
    channel.on('presence', { event: 'leave' }, syncPresence);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          workspace_id: selectedWorkspaceId,
          online_at: new Date().toISOString()
        });
      }
    });

    return () => {
      void (async () => {
        try {
          await channel.untrack();
        } catch (error) {
          console.error('Erro ao remover presença realtime:', error);
        }
        supabase.removeChannel(channel);
        if (presenceChannelRef.current === channel) {
          presenceChannelRef.current = null;
        }
      })();
      setOnlineWorkspaceUserIds([]);
    };
  }, [selectedWorkspaceId, userId]);

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    const workspaceId = selectedWorkspaceId;

    const markOnline = async () => {
      const { error } = await supabase.from('workspace_user_presence').upsert(
        {
          workspace_id: workspaceId,
          user_id: userId,
          last_seen: new Date().toISOString()
        },
        { onConflict: 'workspace_id,user_id' }
      );
      if (error) {
        console.error('Erro ao atualizar presença (online):', error);
      }
    };

    const markOffline = async () => {
      const offlineDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { error } = await supabase.from('workspace_user_presence').upsert(
        {
          workspace_id: workspaceId,
          user_id: userId,
          last_seen: offlineDate
        },
        { onConflict: 'workspace_id,user_id' }
      );
      if (error) {
        console.error('Erro ao atualizar presença (offline):', error);
      }
    };

    void markOnline();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void markOnline();
      }
    }, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (presenceChannelRef.current) {
          void presenceChannelRef.current.track({
            user_id: userId,
            workspace_id: workspaceId,
            online_at: new Date().toISOString()
          });
        }
        void markOnline();
      } else {
        if (presenceChannelRef.current) {
          void presenceChannelRef.current.untrack();
        }
        void markOffline();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const handleBeforeUnload = () => {
      void markOffline();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      void markOffline();
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedWorkspaceId, userId]);

  useEffect(() => {
    const shouldPollMembers = currentView === 'settings' && settingsTab === 'members' && !!selectedWorkspaceId;
    if (!shouldPollMembers) return;
    const intervalId = window.setInterval(() => {
      void loadMembers();
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [currentView, settingsTab, selectedWorkspaceId, selectedProjectId]);

  useEffect(() => {
    const shouldLoadMembers =
      currentView === 'project' ||
      currentView === 'dashboard' ||
      (currentView === 'settings' && settingsTab === 'members');
    if (!shouldLoadMembers) return;
    loadMembers();
  }, [currentView, selectedWorkspaceId, selectedProjectId, settingsTab]);

  useEffect(() => {
    if (currentView !== 'dashboard') return;
    if (!selectedWorkspaceId) return;
    void loadDashboardData(selectedWorkspaceId, dashboardProjectId);
  }, [currentView, selectedWorkspaceId, dashboardProjectId, workspaces.length]);

  useEffect(() => {
    void loadWorkspaceNotifications();
  }, [userId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadWorkspaceNotifications();
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [userId]);

  useEffect(() => {
    const channel = supabase
      .channel(`workspace-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_notifications',
          filter: `mentioned_user_id=eq.${userId}`
        },
        () => {
          void loadWorkspaceNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workspace_notifications',
          filter: `mentioned_user_id=eq.${userId}`
        },
        () => {
          void loadWorkspaceNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (canManageWorkspaces) return;
    if (currentView === 'settings') {
      setCurrentView('dashboard');
      setSettingsTab('general');
    }
  }, [canManageWorkspaces, currentView]);

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    const now = new Date().toISOString();
    setWorkspaceNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, readAt: item.readAt ?? now } : item))
    );
    const { error } = await supabase
      .from('workspace_notifications')
      .update({ read_at: now })
      .eq('id', notificationId)
      .eq('mentioned_user_id', userId);
    if (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      void loadWorkspaceNotifications();
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const now = new Date().toISOString();
    setWorkspaceNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    const { error } = await supabase
      .from('workspace_notifications')
      .update({ read_at: now })
      .eq('mentioned_user_id', userId)
      .is('read_at', null);
    if (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
      void loadWorkspaceNotifications();
    }
  };

  const handleAddTask = async (projectId: string, task: Omit<ProjectTask, 'id'>) => {
    const dueDateCurrent = task.dueDateCurrent || task.dueDateOriginal || '';
    const currentTasks = projectTaskState[projectId] ?? [];
    const maxOrderForStatus = currentTasks
      .filter((item) => item.status === task.status)
      .reduce((acc, item) => Math.max(acc, item.displayOrder ?? 0), -1);
    const nextDisplayOrder = task.displayOrder ?? maxOrderForStatus + 1;
    const nextTask: ProjectTask = {
      id: crypto.randomUUID(),
      ...task,
      executionPeriods: task.executionPeriods ?? [],
      name: task.name || task.description || '',
      dueDateCurrent,
      displayOrder: nextDisplayOrder
    };

    setProjectTaskState((prev) => {
      const current = prev[projectId] ?? [];
      return {
        ...prev,
        [projectId]: [...current, nextTask]
      };
    });

    const { error } = await supabase.from('project_tasks').insert({
      id: nextTask.id,
      project_id: projectId,
      name: nextTask.name,
      description: nextTask.description || null,
      sector: nextTask.sector || null,
      task_type: nextTask.taskType || null,
      executor_ids: nextTask.executorIds,
      validator_ids: nextTask.validatorIds,
      inform_ids: nextTask.informIds,
      start_date: nextTask.startDate || null,
      due_date_original: nextTask.dueDateOriginal || null,
      due_date_current: nextTask.dueDateCurrent || nextTask.dueDateOriginal || null,
      completion_date: nextTask.completionDate || null,
      execution_periods: nextTask.executionPeriods,
      estimated_minutes: nextTask.estimatedMinutes || 0,
      actual_minutes: nextTask.actualMinutes || 0,
      priority: nextTask.priority,
      status: nextTask.status,
      display_order: nextTask.displayOrder ?? 0,
      created_by: userId
    });

    if (error) {
      console.error('Erro ao salvar tarefa:', error);
      setProjectTaskState((prev) => {
        const snapshot = prev[projectId];
        if (!snapshot) return prev;
        return {
          ...prev,
          [projectId]: snapshot.filter((item) => item.id !== nextTask.id)
        };
      });
    }
  };

  const handleAddTasksBulk = async (
    projectId: string,
    tasksToCreate: Array<Omit<ProjectTask, 'id'>>
  ): Promise<{ created: number; failed: number; message?: string }> => {
    if (!tasksToCreate.length) {
      return { created: 0, failed: 0 };
    }

    const currentTasks = projectTaskState[projectId] ?? [];
    const maxByStatus = new Map<ProjectTask['status'], number>();
    currentTasks.forEach((item) => {
      maxByStatus.set(item.status, Math.max(maxByStatus.get(item.status) ?? -1, item.displayOrder ?? 0));
    });

    const preparedTasks: ProjectTask[] = tasksToCreate.map((task) => {
      const dueDateCurrent = task.dueDateCurrent || task.dueDateOriginal || '';
      const nextOrderBase = maxByStatus.get(task.status) ?? -1;
      const nextOrder = task.displayOrder ?? nextOrderBase + 1;
      maxByStatus.set(task.status, nextOrder);
      return {
        id: crypto.randomUUID(),
        ...task,
        executionPeriods: task.executionPeriods ?? [],
        name: task.name || task.description || '',
        dueDateCurrent,
        displayOrder: nextOrder
      };
    });

    setProjectTaskState((prev) => {
      const current = prev[projectId] ?? [];
      return {
        ...prev,
        [projectId]: [...current, ...preparedTasks]
      };
    });

    const { error } = await supabase.from('project_tasks').insert(
      preparedTasks.map((task) => ({
        id: task.id,
        project_id: projectId,
        name: task.name,
        description: task.description || null,
        sector: task.sector || null,
        task_type: task.taskType || null,
        executor_ids: task.executorIds,
        validator_ids: task.validatorIds,
        inform_ids: task.informIds,
        start_date: task.startDate || null,
        due_date_original: task.dueDateOriginal || null,
        due_date_current: task.dueDateCurrent || task.dueDateOriginal || null,
        completion_date: task.completionDate || null,
        execution_periods: task.executionPeriods,
        estimated_minutes: task.estimatedMinutes || 0,
        actual_minutes: task.actualMinutes || 0,
        priority: task.priority,
        status: task.status,
        display_order: task.displayOrder ?? 0,
        created_by: userId
      }))
    );

    if (error) {
      console.error('Erro ao importar tarefas em massa:', error);
      const rollbackIds = new Set(preparedTasks.map((task) => task.id));
      setProjectTaskState((prev) => {
        const current = prev[projectId] ?? [];
        return {
          ...prev,
          [projectId]: current.filter((task) => !rollbackIds.has(task.id))
        };
      });
      return {
        created: 0,
        failed: tasksToCreate.length,
        message: error.message
      };
    }

    return {
      created: preparedTasks.length,
      failed: 0
    };
  };

  const mapTaskUpdatesToRow = (updates: Partial<ProjectTask>) => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description || null;
    if (updates.sector !== undefined) payload.sector = updates.sector || null;
    if (updates.taskType !== undefined) payload.task_type = updates.taskType || null;
    if (updates.executorIds !== undefined) payload.executor_ids = updates.executorIds;
    if (updates.validatorIds !== undefined) payload.validator_ids = updates.validatorIds;
    if (updates.informIds !== undefined) payload.inform_ids = updates.informIds;
    if (updates.startDate !== undefined) payload.start_date = updates.startDate || null;
    if (updates.dueDateOriginal !== undefined) payload.due_date_original = updates.dueDateOriginal || null;
    if (updates.dueDateCurrent !== undefined) payload.due_date_current = updates.dueDateCurrent || null;
    if (updates.completionDate !== undefined) payload.completion_date = updates.completionDate || null;
    if (updates.executionPeriods !== undefined) payload.execution_periods = updates.executionPeriods;
    if (updates.estimatedMinutes !== undefined) payload.estimated_minutes = updates.estimatedMinutes;
    if (updates.actualMinutes !== undefined) payload.actual_minutes = updates.actualMinutes;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;
    return payload;
  };

  const buildTaskAuditEntries = (
    current: ProjectTask,
    updates: Partial<ProjectTask>,
    changedBy: string
  ) => {
    const fieldLabels: Partial<Record<keyof ProjectTask, string>> = {
      name: 'Título',
      description: 'Descrição',
      sector: 'Setor',
      taskType: 'Tipo',
      executorIds: 'Executor',
      validatorIds: 'Validador',
      informIds: 'Informar',
      startDate: 'Data de Inicio',
      dueDateOriginal: 'Prazo de Entrega',
      dueDateCurrent: 'Prazo de Entrega Atual',
      completionDate: 'Data de Conclusão',
      estimatedMinutes: 'Tempo de Execução estimado',
      actualMinutes: 'Tempo de Execução efetivado',
      priority: 'Prioridade',
      status: 'Status da Tarefa',
      displayOrder: 'Ordem'
    };

    const serialize = (value: unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') return value;
      return JSON.stringify(value);
    };

    return Object.entries(updates).flatMap(([key, value]) => {
      const typedKey = key as keyof ProjectTask;
      const previousValue = current[typedKey];
      if (JSON.stringify(previousValue) === JSON.stringify(value)) return [];
      return [
        {
          task_id: current.id,
          field: fieldLabels[typedKey] ?? key,
          old_value: serialize(previousValue),
          new_value: serialize(value),
          changed_by: changedBy
        }
      ];
    });
  };

  const handleUpdateTask = async (
    projectId: string,
    taskId: string,
    updates: Partial<ProjectTask>
  ) => {
    const currentList = projectTaskState[projectId] ?? [];
    const currentTask = currentList.find((task) => task.id === taskId);

    setProjectTaskState((prev) => {
      const current = prev[projectId];
      if (!current) return prev;
      return {
        ...prev,
        [projectId]: current.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      };
    });

    const payload = mapTaskUpdatesToRow(updates);
    if (!Object.keys(payload).length) return;
    const { error } = await supabase.from('project_tasks').update(payload).eq('id', taskId);
    if (error) {
      console.error('Erro ao atualizar tarefa:', error);
      await loadProjectTasks(projectId);
      return;
    }

    if (currentTask) {
      const auditEntries = buildTaskAuditEntries(currentTask, updates, userId);
      if (auditEntries.length) {
        const { error: auditError } = await supabase
          .from('project_task_audit_logs')
          .insert(auditEntries);
        if (auditError) {
          console.error('Erro ao registrar auditoria:', auditError);
        } else {
          setTaskAuditLogs((prev) => {
            const currentLogs = prev[taskId] ?? [];
            return { ...prev, [taskId]: [...auditEntries, ...currentLogs] };
          });
        }
      }
    }
  };

  const handleDeleteTask = async (projectId: string, taskId: string) => {
    const current = projectTaskState[projectId];
    if (!current) return;

    setProjectTaskState((prev) => ({
      ...prev,
      [projectId]: current.filter((task) => task.id !== taskId)
    }));

    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Erro ao excluir tarefa:', error);
      await loadProjectTasks(projectId);
    }
  };

  const handleAddTimeEntry = async (
    projectId: string,
    taskId: string,
    entry: Omit<TaskTimeEntry, 'id' | 'taskId' | 'createdBy'>
  ) => {
    const task = (projectTaskState[projectId] ?? []).find((item) => item.id === taskId);
    if (!task) return;
    const nextActual = Math.max(0, task.actualMinutes + entry.durationMinutes);

    const { data, error } = await supabase
      .from('project_task_time_entries')
      .insert({
        task_id: taskId,
        started_at: entry.startedAt,
        ended_at: entry.endedAt,
        duration_minutes: entry.durationMinutes,
        note: entry.note ?? null,
        source: entry.source,
        created_by: userId
      })
      .select('id, task_id, started_at, ended_at, duration_minutes, created_by, note, source')
      .single();

    if (error || !data) {
      console.error('Erro ao registrar tempo:', error);
      return;
    }

    await handleUpdateTask(projectId, taskId, { actualMinutes: nextActual });
    setTaskTimeEntries((prev) => {
      const currentEntries = prev[taskId] ?? [];
      const nextEntry: TaskTimeEntry = {
        id: data.id,
        taskId: data.task_id,
        startedAt: data.started_at,
        endedAt: data.ended_at,
        durationMinutes: data.duration_minutes ?? 0,
        createdBy: data.created_by,
        note: data.note,
        source: data.source
      };
      return { ...prev, [taskId]: [nextEntry, ...currentEntries] };
    });
  };

  const handleAddDueDateChange = async (
    projectId: string,
    taskId: string,
    newDate: string,
    reason: string
  ) => {
    const task = (projectTaskState[projectId] ?? []).find((item) => item.id === taskId);
    if (!task) return;
    const previousDate = task.dueDateCurrent || task.dueDateOriginal || '';

    const { data, error } = await supabase
      .from('project_task_due_date_changes')
      .insert({
        task_id: taskId,
        previous_date: previousDate || null,
        new_date: newDate || null,
        reason,
        changed_by: userId
      })
      .select('id, task_id, previous_date, new_date, reason, changed_by, created_at')
      .single();

    if (error || !data) {
      console.error('Erro ao registrar alteração de prazo:', error);
      return;
    }

    await handleUpdateTask(projectId, taskId, { dueDateCurrent: newDate });
    setTaskDueDateChanges((prev) => {
      const currentChanges = prev[taskId] ?? [];
      const nextChange: TaskDueDateChange = {
        id: data.id,
        taskId: data.task_id,
        previousDate: data.previous_date ?? '',
        newDate: data.new_date ?? '',
        reason: data.reason ?? '',
        changedBy: data.changed_by,
        createdAt: data.created_at
      };
      return { ...prev, [taskId]: [nextChange, ...currentChanges] };
    });
  };

  const handleLoadTaskExtras = async (taskId: string) => {
    const [timeResult, dueResult, auditResult, commentsResult] = await Promise.all([
      supabase
        .from('project_task_time_entries')
        .select('id, task_id, started_at, ended_at, duration_minutes, created_by, note, source')
        .eq('task_id', taskId)
        .order('started_at', { ascending: false }),
      supabase
        .from('project_task_due_date_changes')
        .select('id, task_id, previous_date, new_date, reason, changed_by, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false }),
      supabase
        .from('project_task_audit_logs')
        .select('id, task_id, field, old_value, new_value, changed_by, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false }),
      supabase
        .from('project_task_comments')
        .select('id, task_id, content, created_by, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
    ]);

    if (timeResult.error) console.error('Erro ao carregar tempo:', timeResult.error);
    if (dueResult.error) console.error('Erro ao carregar alterações de prazo:', dueResult.error);
    if (auditResult.error) console.error('Erro ao carregar auditoria:', auditResult.error);
    if (commentsResult.error) console.error('Erro ao carregar comentários:', commentsResult.error);

    setTaskTimeEntries((prev) => ({
      ...prev,
      [taskId]: (timeResult.data ?? []).map((row) => ({
        id: row.id,
        taskId: row.task_id,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        durationMinutes: row.duration_minutes ?? 0,
        createdBy: row.created_by,
        note: row.note,
        source: row.source
      }))
    }));
    setTaskDueDateChanges((prev) => ({
      ...prev,
      [taskId]: (dueResult.data ?? []).map((row) => ({
        id: row.id,
        taskId: row.task_id,
        previousDate: row.previous_date ?? '',
        newDate: row.new_date ?? '',
        reason: row.reason ?? '',
        changedBy: row.changed_by,
        createdAt: row.created_at
      }))
    }));
    setTaskAuditLogs((prev) => ({
      ...prev,
      [taskId]: (auditResult.data ?? []).map((row) => ({
        id: row.id,
        taskId: row.task_id,
        field: row.field,
        oldValue: row.old_value,
        newValue: row.new_value,
        changedBy: row.changed_by,
        createdAt: row.created_at
      }))
    }));
    setTaskComments((prev) => ({
      ...prev,
      [taskId]: (commentsResult.data ?? []).map((row) => ({
        id: row.id,
        taskId: row.task_id,
        content: row.content ?? '',
        createdBy: row.created_by,
        createdAt: row.created_at
      }))
    }));
  };

  const handleAddTaskComment = async (taskId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const { data, error } = await supabase
      .from('project_task_comments')
      .insert({
        task_id: taskId,
        content: trimmed,
        created_by: userId
      })
      .select('id, task_id, content, created_by, created_at')
      .single();

    if (error || !data) {
      console.error('Erro ao adicionar comentário:', error);
      return;
    }

    setTaskComments((prev) => {
      const current = prev[taskId] ?? [];
      const nextComment: TaskComment = {
        id: data.id,
        taskId: data.task_id,
        content: data.content ?? '',
        createdBy: data.created_by,
        createdAt: data.created_at
      };
      return { ...prev, [taskId]: [nextComment, ...current] };
    });
    setDashboardEvents((prev) => [
      {
        id: data.id,
        taskId: data.task_id,
        createdAt: data.created_at,
        userId: data.created_by,
        type: 'comment',
        summary: data.content ?? ''
      },
      ...prev
    ]);
  };

  const handleUpdateTaskComment = async (taskId: string, commentId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const { data, error } = await supabase
      .from('project_task_comments')
      .update({ content: trimmed })
      .eq('id', commentId)
      .select('id, task_id, content, created_by, created_at')
      .single();

    if (error || !data) {
      console.error('Erro ao atualizar comentário:', error);
      return;
    }

    setTaskComments((prev) => {
      const current = prev[taskId] ?? [];
      return {
        ...prev,
        [taskId]: current.map((comment) =>
          comment.id === commentId ? { ...comment, content: data.content ?? '' } : comment
        )
      };
    });
    setDashboardEvents((prev) =>
      prev.map((event) =>
        event.type === 'comment' && event.id === commentId
          ? { ...event, summary: data.content ?? '' }
          : event
      )
    );
  };

  const handleDeleteTaskComment = async (taskId: string, commentId: string) => {
    const { error } = await supabase
      .from('project_task_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Erro ao remover comentário:', error);
      return;
    }

    setTaskComments((prev) => {
      const current = prev[taskId] ?? [];
      return {
        ...prev,
        [taskId]: current.filter((comment) => comment.id !== commentId)
      };
    });
    setDashboardEvents((prev) =>
      prev.filter((event) => !(event.type === 'comment' && event.id === commentId))
    );
  };

  const handleAddProjectExtraWorkEntry = async (
    projectId: string,
    entry: Omit<ProjectExtraWorkEntry, 'id' | 'projectId' | 'createdBy' | 'createdAt'>
  ) => {
    const { data, error } = await supabase
      .from('project_extra_work_entries')
      .insert({
        project_id: projectId,
        description: entry.description.trim(),
        duration_minutes: entry.durationMinutes,
        worked_at: entry.workedAt,
        note: entry.note?.trim() || null,
        created_by: userId
      })
      .select('id, project_id, description, duration_minutes, worked_at, note, created_by, created_at')
      .single();

    if (error || !data) {
      console.error('Erro ao registrar trabalho extra:', error);
      return;
    }

    setProjectExtraWorkEntries((prev) => {
      const current = prev[projectId] ?? [];
      const nextEntry: ProjectExtraWorkEntry = {
        id: data.id,
        projectId: data.project_id,
        description: data.description ?? '',
        durationMinutes: data.duration_minutes ?? 0,
        workedAt: data.worked_at ?? '',
        note: data.note,
        createdBy: data.created_by,
        createdAt: data.created_at
      };
      return { ...prev, [projectId]: [nextEntry, ...current] };
    });
    setDashboardEvents((prev) => [
      {
        id: data.id,
        taskId: '',
        createdAt: data.created_at,
        userId: data.created_by,
        type: 'extra',
        summary: `Trabalho extra (${data.duration_minutes ?? 0}m): ${data.description ?? ''}`
      },
      ...prev
    ]);
  };

  const canManageWorkspaceMembers = isSuperUser
    ? true
    : Boolean(memberWorkspaces.find((workspace) => workspace.id === selectedWorkspaceId));
  const canManageProjectMembers = isSuperUser
    ? true
    : Boolean(
        memberWorkspaces.find((workspace) => workspace.id === selectedWorkspaceId)?.projects.some(
          (project) => project.id === selectedProjectId
        )
      );

  const handleChangeMemberRole = async (
    scope: 'workspace' | 'project',
    userId: string,
    role: UserRole
  ) => {
    if (scope === 'workspace' && !canManageWorkspaceMembers) return;
    if (scope === 'project' && !canManageProjectMembers) return;
    const table = scope === 'workspace' ? 'workspace_members' : 'project_members';
    const match =
      scope === 'workspace'
        ? { workspace_id: selectedWorkspaceId, user_id: userId }
        : { project_id: selectedProjectId, user_id: userId };

    const { error } = await supabase.from(table).update({ role }).match(match);
    if (error) {
      console.error(error);
      setMembersError('Não foi possível atualizar o membro.');
      return;
    }

    if (scope === 'workspace') {
      setWorkspaceMembers((prev) =>
        prev.map((member) => (member.userId === userId ? { ...member, role } : member))
      );
    } else {
      setProjectMembers((prev) =>
        prev.map((member) => (member.userId === userId ? { ...member, role } : member))
      );
    }
  };

  const handleAddWorkspaceFeedPost = async (
    workspaceId: string,
    content: string,
    taskIds: string[],
    mentionedUserIds: string[]
  ) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const normalizedTaskIds = Array.from(new Set(taskIds.filter(Boolean)));
    const normalizedMentionedUserIds = Array.from(
      new Set(mentionedUserIds.filter((mentionedUserId) => mentionedUserId && mentionedUserId !== userId))
    );

    const { data, error } = await supabase
      .from('workspace_feed_posts')
      .insert({
        workspace_id: workspaceId,
        content: trimmed,
        task_ids: normalizedTaskIds,
        mentioned_user_ids: normalizedMentionedUserIds,
        created_by: userId
      })
      .select('id, workspace_id, content, task_ids, mentioned_user_ids, created_by, created_at')
      .single();

    if (error || !data) {
      console.error('Erro ao criar postagem no feed:', error);
      return;
    }

    setDashboardFeedPosts((prev) => [
      {
        id: data.id,
        workspaceId: data.workspace_id,
        content: data.content ?? '',
        taskIds: (data.task_ids as string[] | null) ?? [],
        mentionedUserIds: (data.mentioned_user_ids as string[] | null) ?? [],
        createdBy: data.created_by,
        createdAt: data.created_at
      },
      ...prev
    ]);
  };

  const handleUpdateWorkspaceFeedPost = async (postId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from('workspace_feed_posts')
      .update({ content: trimmed })
      .eq('id', postId)
      .eq('created_by', userId);

    if (error) {
      console.error('Erro ao atualizar postagem no feed:', error);
      return;
    }

    setDashboardFeedPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, content: trimmed } : post))
    );
    setWorkspaceNotifications((prev) =>
      prev.map((notification) =>
        notification.postId === postId ? { ...notification, postContent: trimmed } : notification
      )
    );
  };

  const handleDeleteWorkspaceFeedPost = async (postId: string) => {
    const { error } = await supabase
      .from('workspace_feed_posts')
      .delete()
      .eq('id', postId)
      .eq('created_by', userId);

    if (error) {
      console.error('Erro ao remover postagem no feed:', error);
      return;
    }

    setDashboardFeedPosts((prev) => prev.filter((post) => post.id !== postId));
    setWorkspaceNotifications((prev) => prev.filter((notification) => notification.postId !== postId));
  };

  const handleRemoveMember = async (scope: 'workspace' | 'project', userId: string) => {
    if (scope === 'workspace' && !canManageWorkspaceMembers) return;
    if (scope === 'project' && !canManageProjectMembers) return;
    const table = scope === 'workspace' ? 'workspace_members' : 'project_members';
    const match =
      scope === 'workspace'
        ? { workspace_id: selectedWorkspaceId, user_id: userId }
        : { project_id: selectedProjectId, user_id: userId };

    const { error } = await supabase.from(table).delete().match(match);
    if (error) {
      console.error(error);
      setMembersError('Não foi possível remover o membro.');
      return;
    }

    if (scope === 'workspace') {
      setWorkspaceMembers((prev) => prev.filter((member) => member.userId !== userId));
    } else {
      setProjectMembers((prev) => prev.filter((member) => member.userId !== userId));
    }
  };

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    const { error } = await supabase.from('user_profiles').upsert(
      {
        user_id: userId,
        full_name: profileForm.fullName.trim(),
        title: profileForm.title.trim(),
        company: profileForm.company.trim(),
        phone: profileForm.phone.trim(),
        avatar_url: profileForm.avatarUrl.trim(),
        email: session.user.email ?? null,
        role: userRole ?? 'viewer',
        password_set: true,
        theme
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error(error);
      setProfileMessage('Não foi possível salvar as alterações.');
      setProfileSaving(false);
      return;
    }

    onProfileUpdated({
      fullName: profileForm.fullName,
      title: profileForm.title,
      company: profileForm.company,
      phone: profileForm.phone,
      avatarUrl: profileForm.avatarUrl,
      role: userRole ?? 'viewer',
      passwordSet: true,
      theme
    });
    setProfileMessage('Perfil atualizado com sucesso.');
    setProfileSaving(false);
  };

  const handlePasswordChange = async (newPassword: string) => {
    setPasswordSaving(true);
    setPasswordMessage(null);

    if (!newPassword.trim() || newPassword.trim().length < 6) {
      const message = 'A senha deve ter ao menos 6 caracteres.';
      setPasswordMessage(message);
      setPasswordSaving(false);
      throw new Error(message);
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.trim()
    });

    if (updateError) {
      const message = updateError.message || 'Não foi possível atualizar a senha.';
      setPasswordMessage(message);
      setPasswordSaving(false);
      throw updateError;
    }

    await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, password_set: true }, { onConflict: 'user_id' });

    setPasswordMessage('Senha atualizada com sucesso.');
    setPasswordSaving(false);
  };

  const handleUserSignOut = async () => {
    if (presenceChannelRef.current) {
      try {
        await presenceChannelRef.current.untrack();
      } catch (error) {
        console.error('Erro ao remover presença realtime no logout:', error);
      }
    }
    if (selectedWorkspaceId) {
      const offlineDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await supabase.from('workspace_user_presence').upsert(
        {
          workspace_id: selectedWorkspaceId,
          user_id: userId,
          last_seen: offlineDate
        },
        { onConflict: 'workspace_id,user_id' }
      );
    }
    await Promise.resolve(onSignOut());
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    setAvatarError(null);

    if (!file.type.startsWith('image/')) {
      setAvatarError('Selecione um arquivo de imagem válido.');
      return;
    }

    const maxSizeMb = 5;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setAvatarError(`A imagem deve ter no máximo ${maxSizeMb}MB.`);
      return;
    }

    setAvatarUploading(true);
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${userId}/${crypto.randomUUID()}.${fileExtension}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

      if (uploadError) {
        console.error(uploadError);
        setAvatarError('Não foi possível enviar a imagem.');
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (!data?.publicUrl) {
        setAvatarError('Não foi possível gerar a URL da imagem.');
        return;
      }

      setProfileForm((prev) => ({
        ...prev,
        avatarUrl: data.publicUrl
      }));
    } catch (error) {
      console.error(error);
      setAvatarError('Não foi possível enviar a imagem.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const viewTitle =
    currentView === 'members'
      ? 'Membros'
      : currentView === 'settings'
        ? 'Configurações'
        : currentView === 'profile'
          ? 'Perfil'
          : currentView === 'project'
            ? selectedProject?.name ?? 'Projeto'
            : 'Bem-vindo ao sistema';

  const displayName =
    profile?.fullName?.trim() || session.user.user_metadata?.full_name || session.user.email || '';
  const displayRole =
    profile?.title?.trim() ||
    (userRole === 'manager' ? 'Gerente' : userRole === 'executor' ? 'Executor' : 'Visualizador');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word: string) => word[0]?.toUpperCase())
    .join('');

  const memberOptions = [...projectMembers, ...workspaceMembers]
    .map((member) => ({
      id: member.userId,
      label: member.fullName || member.email || 'Usuário',
      email: member.email || undefined
    }))
    .filter((member) => member.label);

  const dashboardWorkspaceMembers = Array.from(
    new Map(
      [...workspaceMembers, ...dashboardMembers].map((member) => [
        member.userId,
        {
          userId: member.userId,
          fullName: member.fullName ?? null,
          title: member.title ?? null,
          avatarUrl: member.avatarUrl ?? null,
          email: member.email ?? null
        }
      ])
    ).values()
  );
  const canPostInSelectedWorkspace =
    isSuperUser ||
    Boolean(selectedWorkspaceId && workspaceMembers.some((member) => member.userId === userId));
  const workspaceNameById = Object.fromEntries(workspaces.map((workspace) => [workspace.id, workspace.name]));
  const notificationActorById = Object.fromEntries(
    dashboardWorkspaceMembers.map((member) => [
      member.userId,
      member.fullName || member.email || member.userId
    ])
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
      <div className="flex h-full">
        <Sidebar
          collapsed={collapsed}
          currentView={currentView}
          isSuperUser={isSuperUser}
          isViewer={isViewer}
          canManageWorkspaces={canManageWorkspaces}
          userId={userId}
          workspaces={workspaces}
          expandedWorkspaces={expandedWorkspaces}
          selectedProjectId={selectedProjectId}
          onToggleCollapsed={() => setCollapsed((prev) => !prev)}
          onSelectView={(view) => {
            if (isViewer && view !== 'dashboard') return;
            if (view === 'settings' && !canManageWorkspaces) return;
            setCurrentView(view);
            if (view === 'settings') setSettingsTab('general');
            if (view !== 'project') setSelectedProjectId(null);
          }}
          onToggleWorkspace={toggleWorkspace}
          onSelectWorkspace={(workspaceId) => {
            setSelectedWorkspaceId(workspaceId);
            setCurrentView('dashboard');
          }}
          onSelectProject={(workspaceId, projectId) => {
            if (isViewer) return;
            setSelectedWorkspaceId(workspaceId);
            setSelectedProjectId(projectId);
            setCurrentView('project');
          }}
          onCreateWorkspace={() => {
            setWorkspaceName('');
            setWorkspaceDescription('');
            setWorkspaceModalError(null);
            setShowWorkspaceModal(true);
            setShowProjectModal(false);
          }}
          onCreateProject={(workspaceId) => {
            setSelectedWorkspaceId(workspaceId);
            setProjectWorkspaceId(workspaceId);
            setProjectName('');
            setProjectSummary('');
            setProjectModalError(null);
            setShowProjectModal(true);
          }}
          onDeleteWorkspace={handleDeleteWorkspace}
          onDeleteProject={(projectId) => {
            const project = workspaces
              .flatMap((workspace) => workspace.projects)
              .find((item) => item.id === projectId);
            if (!project || !window.confirm(`Excluir o projeto "${project.name}"?`)) return;
            handleDeleteProject(projectId);
          }}
          onEditProject={(workspaceId, projectId) => {
            const workspace = workspaces.find((item) => item.id === workspaceId);
            const project = workspace?.projects.find((item) => item.id === projectId);
            if (project) {
              setEditingProject({ workspaceId, project });
            }
          }}
        />

        <main className="flex flex-1 flex-col min-w-0">
          <Topbar
            initials={initials || 'ZU'}
            profile={profile}
            theme={theme}
            workspaceName={selectedWorkspace?.name}
            projectName={selectedProject?.name}
            onToggleTheme={onToggleTheme}
            onSignOut={handleUserSignOut}
            onOpenProfile={() => {
              if (isViewer) return;
              setCurrentView('profile');
              setSelectedProjectId(null);
            }}
            notifications={workspaceNotifications}
            workspaceNameById={workspaceNameById}
            notificationActorById={notificationActorById}
            onMarkNotificationRead={handleMarkNotificationAsRead}
            onMarkAllNotificationsRead={handleMarkAllNotificationsAsRead}
          />

          <section className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            {/* {currentView !== 'members' && (
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                  {viewTitle}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {currentView === 'settings'
                    ? 'Preferências e informações da conta.'
                    : currentView === 'profile'
                    ? 'Mantenha seus dados atualizados e personalize sua experiência.'
                    : currentView === 'project'
                    ? 'Planeje tarefas, prazos e responsabilidades do projeto.'
                    : 'Crie workspaces e organize projetos por equipe.'}
                </p>
              </div>
            )} */}
            <div className="flex-1 flex flex-col h-full min-w-0">
              {currentView === 'dashboard' && (
                <DashboardSection
                  loadingWorkspaces={loadingWorkspaces}
                  loadError={loadError}
                  selectedWorkspace={selectedWorkspace}
                  canManageWorkspaces={canManageWorkspaces}
                  tasks={dashboardTasks}
                  sectors={sectorOptions}
                  taskTypes={taskTypeOptions}
                  dashboardEvents={dashboardEvents}
                  dashboardFeedPosts={dashboardFeedPosts}
                  feedLoading={feedLoading || dashboardEventsLoading}
                  feedHasMore={feedHasMore || dashboardEventsHasMore}
                  dashboardLoading={dashboardLoading}
                  isManager={canManageWorkspaces}
                  canPostFeed={canPostInSelectedWorkspace}
                  currentUserId={userId}
                  projectFilterId={dashboardProjectId}
                  onChangeProjectFilter={setDashboardProjectId}
                  workspaceMembers={dashboardWorkspaceMembers}
                  timeEntries={taskTimeEntries}
                  dueDateChanges={taskDueDateChanges}
                  auditLogs={taskAuditLogs}
                  taskComments={taskComments}
                  onLoadTaskExtras={handleLoadTaskExtras}
                  onAddTaskComment={handleAddTaskComment}
                  onUpdateTaskComment={handleUpdateTaskComment}
                  onDeleteTaskComment={handleDeleteTaskComment}
                  onAddFeedPost={handleAddWorkspaceFeedPost}
                  onUpdateFeedPost={handleUpdateWorkspaceFeedPost}
                  onDeleteFeedPost={handleDeleteWorkspaceFeedPost}
                  onLoadMoreFeed={() => {
                    if (!selectedWorkspace?.id) return;
                    Promise.all([
                      loadWorkspaceFeedPosts(selectedWorkspace.id, { append: true }),
                      loadMoreDashboardEvents()
                    ]);
                  }}
                  onNewProject={() => {
                    setProjectName('');
                    setProjectSummary('');
                    setProjectModalError(null);
                    setShowProjectModal(true);
                    setProjectWorkspaceId(selectedWorkspace?.id ?? null);
                  }}
                />
              )}
              {currentView === 'project' && (
                <ProjectSection
                  project={selectedProject}
                  tasks={activeProjectTasks}
                  extraWorkEntries={activeProjectExtraWorkEntries}
                  members={Array.from(
                    new Map(
                      [...workspaceMembers, ...projectMembers].map((m) => [m.userId, m])
                    ).values()
                  ).map((m) => ({
                    id: m.userId,
                    label: m.fullName || m.email || 'Usuário',
                    email: m.email || undefined,
                    avatarUrl: m.avatarUrl || undefined
                  }))}
                  sectors={sectorOptions}
                  taskTypes={taskTypeOptions}
                  currentUserId={userId}
                  timeEntries={taskTimeEntries}
                  dueDateChanges={taskDueDateChanges}
                  auditLogs={taskAuditLogs}
                  taskComments={taskComments}
                  onLoadTaskExtras={(taskId) => {
                    handleLoadTaskExtras(taskId);
                  }}
                  onAddTaskComment={handleAddTaskComment}
                  onAddTask={(task) => {
                    if (!selectedProjectId) return;
                    handleAddTask(selectedProjectId, task);
                  }}
                  onAddTasksBulk={async (tasksBatch) => {
                    if (!selectedProjectId) {
                      return { created: 0, failed: tasksBatch.length, message: 'Selecione um projeto.' };
                    }
                    return handleAddTasksBulk(selectedProjectId, tasksBatch);
                  }}
                  onUpdateTask={(taskId, updates) => {
                    if (!selectedProjectId) return;
                    handleUpdateTask(selectedProjectId, taskId, updates);
                  }}
                  onDeleteTask={(taskId) => {
                    if (!selectedProjectId) return;
                    handleDeleteTask(selectedProjectId, taskId);
                  }}
                  onAddTimeEntry={(taskId, entry) => {
                    if (!selectedProjectId) return;
                    handleAddTimeEntry(selectedProjectId, taskId, entry);
                  }}
                  onAddDueDateChange={(taskId, newDate, reason) => {
                    if (!selectedProjectId) return;
                    handleAddDueDateChange(selectedProjectId, taskId, newDate, reason);
                  }}
                  onAddExtraWorkEntry={(entry) => {
                    if (!selectedProjectId) return;
                    handleAddProjectExtraWorkEntry(selectedProjectId, entry);
                  }}
                />
              )}
              {currentView === 'profile' && (
                <ProfileSection
                  profileForm={profileForm}
                  profileMessage={profileMessage}
                  passwordMessage={passwordMessage}
                  profileSaving={profileSaving}
                  passwordSaving={passwordSaving}
                  avatarUploading={avatarUploading}
                  avatarError={avatarError}
                  profile={profile}
                  displayName={displayName}
                  displayRole={displayRole}
                  initials={initials}
                  sessionEmail={session.user.email ?? ''}
                  isSuperUser={isSuperUser}
                  onChangeField={(field, value) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      [field]: value
                    }))
                  }
                  onUploadAvatar={handleAvatarUpload}
                  onSave={handleProfileSave}
                  onChangePassword={handlePasswordChange}
                  onSignOut={handleUserSignOut}
                />
              )}
              {currentView === 'settings' && (
                <div className="h-full overflow-y-auto p-8 space-y-6">
                  <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-6">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSettingsTab('general')}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                          settingsTab === 'general'
                            ? 'bg-[var(--accent)] text-white'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--muted-bg)]'
                        }`}
                      >
                        Configurações gerais
                      </button>
                      <button
                        onClick={() => setSettingsTab('members')}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                          settingsTab === 'members'
                            ? 'bg-[var(--accent)] text-white'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--muted-bg)]'
                        }`}
                      >
                        Membros
                      </button>
                    </div>
                  </div>

                  {settingsTab === 'general' && (
                    <div className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Setores</h3>
                              <p className="text-xs text-[var(--text-muted)]">
                                {sectorOptions.length} cadastrado(s)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <input
                              value={newSectorName}
                              onChange={(event) => setNewSectorName(event.target.value)}
                              className="flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
                              placeholder="Novo setor (ex: Fiscal)"
                            />
                            <input
                              type="color"
                              value={newSectorColor}
                              onChange={(event) => setNewSectorColor(event.target.value)}
                              className="h-10 w-12 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] p-1"
                              title="Cor do setor"
                            />
                            <button
                              onClick={handleAddSector}
                              disabled={!canManageWorkspaces}
                              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                            >
                              Adicionar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {sectorOptions.map((sector) => (
                              <div
                                key={sector.name}
                                className="group inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] px-3 py-1 text-sm"
                              >
                                <input
                                  type="color"
                                  value={sector.color}
                                  onChange={(event) =>
                                    handleUpdateSectorColor(sector.name, event.target.value)
                                  }
                                  disabled={!canManageWorkspaces}
                                  className="h-5 w-5 cursor-pointer rounded border border-[var(--input-border)] bg-transparent p-0"
                                  title={`Alterar cor do setor ${sector.name}`}
                                />
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: sector.color }}
                                />
                                <span>{sector.name}</span>
                                <button
                                  onClick={() => handleRemoveSector(sector.name)}
                                  disabled={!canManageWorkspaces}
                                  className="text-xs text-[var(--text-muted)] group-hover:text-rose-500"
                                  title="Remover"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {!sectorOptions.length && (
                              <div className="text-xs text-[var(--text-muted)]">
                                Sem setores cadastrados.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tipos</h3>
                              <p className="text-xs text-[var(--text-muted)]">
                                {taskTypeOptions.length} cadastrado(s)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <input
                              value={newTaskTypeName}
                              onChange={(event) => setNewTaskTypeName(event.target.value)}
                              className="flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm"
                              placeholder="Novo tipo (ex: Revisao)"
                            />
                            <input
                              type="color"
                              value={newTaskTypeColor}
                              onChange={(event) => setNewTaskTypeColor(event.target.value)}
                              className="h-10 w-12 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] p-1"
                              title="Cor do tipo"
                            />
                            <button
                              onClick={handleAddTaskType}
                              disabled={!canManageWorkspaces}
                              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                            >
                              Adicionar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {taskTypeOptions.map((type) => (
                              <div
                                key={type.name}
                                className="group inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] px-3 py-1 text-sm"
                              >
                                <input
                                  type="color"
                                  value={type.color}
                                  onChange={(event) =>
                                    handleUpdateTaskTypeColor(type.name, event.target.value)
                                  }
                                  disabled={!canManageWorkspaces}
                                  className="h-5 w-5 cursor-pointer rounded border border-[var(--input-border)] bg-transparent p-0"
                                  title={`Alterar cor do tipo ${type.name}`}
                                />
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: type.color }}
                                />
                                <span>{type.name}</span>
                                <button
                                  onClick={() => handleRemoveTaskType(type.name)}
                                  disabled={!canManageWorkspaces}
                                  className="text-xs text-[var(--text-muted)] group-hover:text-rose-500"
                                  title="Remover"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {!taskTypeOptions.length && (
                              <div className="text-xs text-[var(--text-muted)]">
                                Sem tipos cadastrados.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'members' && (
                    <MembersSection
                      workspaces={memberWorkspaces}
                      selectedWorkspaceId={selectedWorkspaceId}
                      selectedProjectId={selectedProjectId}
                      workspaceMembers={workspaceMembers}
                      projectMembers={projectMembers}
                      onlineUserIds={onlineWorkspaceUserIds}
                      membersLoading={membersLoading}
                      membersError={membersError}
                      canManageWorkspaceMembers={canManageWorkspaceMembers}
                      canManageProjectMembers={canManageProjectMembers}
                      currentUserId={userId}
                      inviteRows={inviteRows}
                      inviteMessage={inviteMessage}
                      onSelectWorkspace={(workspaceId) => {
                        setSelectedWorkspaceId(workspaceId);
                        const workspace = memberWorkspaces.find((item) => item.id === workspaceId);
                        if (workspace && selectedProjectId) {
                          const projectExists = workspace.projects.some(
                            (project) => project.id === selectedProjectId
                          );
                          if (!projectExists) {
                            setSelectedProjectId(workspace.projects[0]?.id ?? null);
                          }
                        }
                      }}
                      onSelectProject={setSelectedProjectId}
                      onSubmitInvite={handleInviteSubmit}
                      onChangeMemberRole={handleChangeMemberRole}
                      onRemoveMember={handleRemoveMember}
                      onAddInviteRow={() =>
                        setInviteRows((prev) => [
                          ...prev,
                          {
                            id: crypto.randomUUID(),
                            email: '',
                            role: 'executor',
                            status: 'idle'
                          }
                        ])
                      }
                      onRemoveInviteRow={(rowId) =>
                        setInviteRows((prev) =>
                          prev.length === 1 ? prev : prev.filter((row) => row.id !== rowId)
                        )
                      }
                      onChangeInviteEmail={(rowId, value) =>
                        setInviteRows((prev) =>
                          prev.map((row) => (row.id === rowId ? { ...row, email: value } : row))
                        )
                      }
                      onChangeInviteRole={(rowId, role) =>
                        setInviteRows((prev) =>
                          prev.map((row) => (row.id === rowId ? { ...row, role } : row))
                        )
                      }
                      onResendInvite={async (email, role) => {
                        if (!email.trim() || !selectedWorkspaceId) return;
                        const scopeBody = selectedProjectId
                          ? { projectIds: [selectedProjectId], workspaceIds: [] }
                          : { workspaceIds: [selectedWorkspaceId], projectIds: [] };
                        const { data, error } = await supabase.functions.invoke('invite-user', {
                          body: { email: email.trim(), role, ...scopeBody }
                        });
                        if (error || data?.error) {
                          setInviteMessage(
                            error?.message ?? data?.error ?? 'Não foi possível reenviar.'
                          );
                        } else {
                          setInviteMessage('Convite reenviado.');
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <WorkspaceModal
        isOpen={showWorkspaceModal}
        workspaceName={workspaceName}
        workspaceDescription={workspaceDescription}
        errorMessage={workspaceModalError}
        onChangeName={setWorkspaceName}
        onChangeDescription={setWorkspaceDescription}
        onClose={() => {
          setShowWorkspaceModal(false);
          setWorkspaceName('');
          setWorkspaceDescription('');
        }}
        onSubmit={handleCreateWorkspace}
      />

      <ProjectModal
        isOpen={showProjectModal}
        workspaces={workspaces}
        projectWorkspaceId={projectWorkspaceId}
        projectName={projectName}
        projectSummary={projectSummary}
        errorMessage={projectModalError}
        onChangeWorkspaceId={setProjectWorkspaceId}
        onChangeName={setProjectName}
        onChangeSummary={setProjectSummary}
        onClose={() => {
          setShowProjectModal(false);
          setProjectName('');
          setProjectSummary('');
          setProjectWorkspaceId(null);
        }}
        onSubmit={handleCreateProject}
      />

      <EditProjectModal
        isOpen={Boolean(editingProject)}
        project={editingProject?.project ?? null}
        onChangeName={(value) =>
          setEditingProject((prev) =>
            prev ? { ...prev, project: { ...prev.project, name: value } } : prev
          )
        }
        onChangeSummary={(value) =>
          setEditingProject((prev) =>
            prev ? { ...prev, project: { ...prev.project, summary: value } } : prev
          )
        }
        onClose={() => setEditingProject(null)}
        onSubmit={handleEditProjectSave}
      />
    </div>
  );
}
