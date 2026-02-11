import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  Project,
  ProjectTask,
  SystemView,
  TaskAuditLog,
  TaskDueDateChange,
  TaskTimeEntry,
  UserProfile,
  UserRole,
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [projectTaskState, setProjectTaskState] = useState<Record<string, ProjectTask[]>>({});
  const [taskTimeEntries, setTaskTimeEntries] = useState<Record<string, TaskTimeEntry[]>>({});
  const [taskDueDateChanges, setTaskDueDateChanges] = useState<Record<string, TaskDueDateChange[]>>(
    {}
  );
  const [taskAuditLogs, setTaskAuditLogs] = useState<Record<string, TaskAuditLog[]>>({});
  const [sectorOptions, setSectorOptions] = useState<string[]>([]);
  const [taskTypeOptions, setTaskTypeOptions] = useState<string[]>([]);
  const [newSectorName, setNewSectorName] = useState('');
  const [newTaskTypeName, setNewTaskTypeName] = useState('');
  const [dashboardProjectId, setDashboardProjectId] = useState<string>('all');
  const [dashboardTasks, setDashboardTasks] = useState<ProjectTask[]>([]);
  const [dashboardEvents, setDashboardEvents] = useState<
    Array<{
      id: string;
      taskId: string;
      createdAt: string;
      userId: string;
      type: 'audit' | 'time' | 'due';
      summary: string;
    }>
  >([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'members'>('general');

  const canManageWorkspaces = isSuperUser || userRole === 'manager';
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
          'estimated_minutes',
          'actual_minutes',
          'priority',
          'status'
        ].join(', ')
      )
      .eq('project_id', projectId)
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
      estimatedMinutes: row.estimated_minutes ?? 0,
      actualMinutes: row.actual_minutes ?? 0,
        priority: (row.priority ?? 'Média') as ProjectTask['priority'],
        status: normalizeStatus(row.status ?? 'Backlog')
      };
    });

    setProjectTaskState((prev) => ({
      ...prev,
      [projectId]: mappedTasks
    }));
  };

  const loadDashboardData = async (workspaceId: string, projectId: string) => {
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return;
    const projectIds =
      projectId !== 'all' ? [projectId] : workspace.projects.map((item) => item.id);
    if (!projectIds.length) {
      setDashboardTasks([]);
      setDashboardEvents([]);
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
          'estimated_minutes',
          'actual_minutes',
          'priority',
          'status'
        ].join(', ')
      )
      .in('project_id', projectIds);

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
      estimatedMinutes: row.estimated_minutes ?? 0,
      actualMinutes: row.actual_minutes ?? 0,
      priority: (row.priority ?? 'Média') as ProjectTask['priority'],
      status: normalizeStatus(row.status ?? 'Backlog')
    }));

    setDashboardTasks(mappedTasks);

    const taskIds = mappedTasks.map((item) => item.id);
    if (!taskIds.length) {
      setDashboardEvents([]);
      setDashboardLoading(false);
      return;
    }

    const [timeResult, dueResult, auditResult] = await Promise.all([
      supabase
        .from('project_task_time_entries')
        .select('id, task_id, created_at, created_by, duration_minutes, source')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('project_task_due_date_changes')
        .select('id, task_id, created_at, changed_by, previous_date, new_date, reason')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('project_task_audit_logs')
        .select('id, task_id, created_at, changed_by, field, old_value, new_value')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    if (timeResult.error) console.error('Erro ao carregar tempo dashboard:', timeResult.error);
    if (dueResult.error) console.error('Erro ao carregar prazos dashboard:', dueResult.error);
    if (auditResult.error) console.error('Erro ao carregar auditoria dashboard:', auditResult.error);

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
        summary: `Prazo ${row.previous_date ?? '-'} -> ${row.new_date ?? '-'}`
      })) ?? [];

    const auditEvents =
      auditResult.data?.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        createdAt: row.created_at,
        userId: row.changed_by,
        type: 'audit' as const,
        summary: `${row.field}: ${row.old_value ?? '-'} -> ${row.new_value ?? '-'}`
      })) ?? [];

    const merged = [...timeEvents, ...dueEvents, ...auditEvents].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    setDashboardEvents(merged.slice(0, 12));
    setDashboardLoading(false);
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
    void loadProjectTasks(selectedProjectId);
  }, [selectedProjectId]);

  const loadSectorAndTypes = async (workspaceId: string) => {
    const [{ data: sectorRows, error: sectorError }, { data: typeRows, error: typeError }] =
      await Promise.all([
        supabase
          .from('sectors')
          .select('name')
          .eq('workspace_id', workspaceId)
          .order('name', { ascending: true }),
        supabase
          .from('task_types')
          .select('name')
          .eq('workspace_id', workspaceId)
          .order('name', { ascending: true })
      ]);

    if (sectorError) console.error('Erro ao carregar setores:', sectorError);
    if (typeError) console.error('Erro ao carregar tipos:', typeError);

    setSectorOptions((sectorRows ?? []).map((row) => row.name));
    setTaskTypeOptions((typeRows ?? []).map((row) => row.name));
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
    if (!selectedWorkspaceId) return;
    if (!newSectorName.trim()) return;
    const { data, error } = await supabase
      .from('sectors')
      .insert({
        workspace_id: selectedWorkspaceId,
        name: newSectorName.trim(),
        created_by: userId
      })
      .select('name')
      .single();
    if (error || !data) {
      console.error('Erro ao criar setor:', error);
      return;
    }
    setSectorOptions((prev) => [...prev, data.name].sort((a, b) => a.localeCompare(b)));
    setNewSectorName('');
  };

  const handleRemoveSector = async (name: string) => {
    if (!selectedWorkspaceId) return;
    const { error } = await supabase
      .from('sectors')
      .delete()
      .eq('workspace_id', selectedWorkspaceId)
      .eq('name', name);
    if (error) {
      console.error('Erro ao remover setor:', error);
      return;
    }
    setSectorOptions((prev) => prev.filter((item) => item !== name));
  };

  const handleAddTaskType = async () => {
    if (!selectedWorkspaceId) return;
    if (!newTaskTypeName.trim()) return;
    const { data, error } = await supabase
      .from('task_types')
      .insert({
        workspace_id: selectedWorkspaceId,
        name: newTaskTypeName.trim(),
        created_by: userId
      })
      .select('name')
      .single();
    if (error || !data) {
      console.error('Erro ao criar tipo:', error);
      return;
    }
    setTaskTypeOptions((prev) => [...prev, data.name].sort((a, b) => a.localeCompare(b)));
    setNewTaskTypeName('');
  };

  const handleRemoveTaskType = async (name: string) => {
    if (!selectedWorkspaceId) return;
    const { error } = await supabase
      .from('task_types')
      .delete()
      .eq('workspace_id', selectedWorkspaceId)
      .eq('name', name);
    if (error) {
      console.error('Erro ao remover tipo:', error);
      return;
    }
    setTaskTypeOptions((prev) => prev.filter((item) => item !== name));
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

    if (workspaceResponse.error || projectResponse.error) {
      console.error(workspaceResponse.error || projectResponse.error);
      setMembersError('Não foi possível carregar os membros.');
      setMembersLoading(false);
      return;
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
          validated: Boolean(profileData?.password_set)
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
          validated: Boolean(profileData?.password_set)
        };
      })
    );

    setMembersLoading(false);
  };

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

  const handleAddTask = async (projectId: string, task: Omit<ProjectTask, 'id'>) => {
    const dueDateCurrent = task.dueDateCurrent || task.dueDateOriginal || '';
    const nextTask: ProjectTask = {
      id: crypto.randomUUID(),
      ...task,
      name: task.name || task.description || '',
      dueDateCurrent
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
      estimated_minutes: nextTask.estimatedMinutes || 0,
      actual_minutes: nextTask.actualMinutes || 0,
      priority: nextTask.priority,
      status: nextTask.status,
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
    if (updates.estimatedMinutes !== undefined) payload.estimated_minutes = updates.estimatedMinutes;
    if (updates.actualMinutes !== undefined) payload.actual_minutes = updates.actualMinutes;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.status !== undefined) payload.status = updates.status;
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
      estimatedMinutes: 'Tempo de Execução estimado',
      actualMinutes: 'Tempo de Execução efetivado',
      priority: 'Prioridade',
      status: 'Status da Tarefa'
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
    const [timeResult, dueResult, auditResult] = await Promise.all([
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
        .order('created_at', { ascending: false })
    ]);

    if (timeResult.error) console.error('Erro ao carregar tempo:', timeResult.error);
    if (dueResult.error) console.error('Erro ao carregar alterações de prazo:', dueResult.error);
    if (auditResult.error) console.error('Erro ao carregar auditoria:', auditResult.error);

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

  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
      <div className="flex h-full">
        <Sidebar
          collapsed={collapsed}
          currentView={currentView}
          isSuperUser={isSuperUser}
          canManageWorkspaces={canManageWorkspaces}
          userId={userId}
          workspaces={workspaces}
          expandedWorkspaces={expandedWorkspaces}
          selectedProjectId={selectedProjectId}
          onToggleCollapsed={() => setCollapsed((prev) => !prev)}
          onSelectView={(view) => {
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
            onSignOut={onSignOut}
            onOpenProfile={() => {
              setCurrentView('profile');
              setSelectedProjectId(null);
            }}
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
                  dashboardEvents={dashboardEvents}
                  dashboardLoading={dashboardLoading}
                  projectFilterId={dashboardProjectId}
                  onChangeProjectFilter={setDashboardProjectId}
                  workspaceMembers={workspaceMembers}
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
                  onLoadTaskExtras={(taskId) => {
                    handleLoadTaskExtras(taskId);
                  }}
                  onAddTask={(task) => {
                    if (!selectedProjectId) return;
                    handleAddTask(selectedProjectId, task);
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
                />
              )}
              {currentView === 'profile' && (
                <ProfileSection
                  profileForm={profileForm}
                  profileMessage={profileMessage}
                  profileSaving={profileSaving}
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
                  onSignOut={onSignOut}
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
                            <button
                              onClick={handleAddSector}
                              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                            >
                              Adicionar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {sectorOptions.map((sector) => (
                              <div
                                key={sector}
                                className="group inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] px-3 py-1 text-sm"
                              >
                                <span>{sector}</span>
                                <button
                                  onClick={() => handleRemoveSector(sector)}
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
                            <button
                              onClick={handleAddTaskType}
                              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                            >
                              Adicionar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {taskTypeOptions.map((type) => (
                              <div
                                key={type}
                                className="group inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] px-3 py-1 text-sm"
                              >
                                <span>{type}</span>
                                <button
                                  onClick={() => handleRemoveTaskType(type)}
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
