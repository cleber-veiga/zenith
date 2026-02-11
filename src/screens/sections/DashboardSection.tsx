import { useMemo } from 'react';
import type { ProjectTask, TaskStatus, Workspace } from '../../types';
import { IconBriefcase, IconLayers } from '../../components/icons';
import { CustomSelect } from '../../components/CustomSelect';

const STATUS_COLORS: Record<TaskStatus, string> = {
  Backlog: '#94a3b8',
  Pendente: '#6366f1',
  'Em Execução': '#3b82f6',
  'Em Validação': '#f59e0b',
  Concluída: '#10b981',
  Bloqueada: '#f43f5e',
  Cancelada: '#64748b'
};

type DashboardSectionProps = {
  loadingWorkspaces: boolean;
  loadError: string | null;
  selectedWorkspace: Workspace | null;
  canManageWorkspaces: boolean;
  tasks: ProjectTask[];
  dashboardEvents: Array<{
    id: string;
    taskId: string;
    createdAt: string;
    userId: string;
    type: 'audit' | 'time' | 'due';
    summary: string;
  }>;
  dashboardLoading: boolean;
  projectFilterId: string;
  onChangeProjectFilter: (projectId: string) => void;
  workspaceMembers: Array<{
    userId: string;
    fullName?: string | null;
    title?: string | null;
    avatarUrl?: string | null;
    email?: string | null;
  }>;
  onNewProject: () => void;
};

export function DashboardSection({
  loadingWorkspaces,
  loadError,
  selectedWorkspace,
  canManageWorkspaces,
  tasks,
  dashboardEvents,
  dashboardLoading,
  projectFilterId,
  onChangeProjectFilter,
  workspaceMembers,
  onNewProject
}: DashboardSectionProps) {
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
          label: member?.fullName || member?.email || 'Usuário'
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tasks, workspaceMembers]);

  const memberMap = useMemo(() => {
    return new Map(
      workspaceMembers.map((member) => [
        member.userId,
        member.fullName || member.email || 'Usuário'
      ])
    );
  }, [workspaceMembers]);

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
                      Concluídas: <span className="text-[var(--text-primary)] font-semibold">{completionStats.done}</span>
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

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Últimas interações
            </h3>
            <div className="mt-4 space-y-2">
              {dashboardEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs"
                >
                  <div>
                    <p className="text-[var(--text-primary)]">{event.summary}</p>
                    <p className="text-[var(--text-muted)]">
                      {memberMap.get(event.userId) ?? 'Usuário'}
                    </p>
                  </div>
                  <span className="text-[var(--text-muted)]">
                    {new Date(event.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
              {!dashboardEvents.length && (
                <div className="text-xs text-[var(--text-muted)]">
                  Sem interações registradas.
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
      </div>
    </div>
  );
}
