import { Trash2, User, Shield, Eye } from 'lucide-react';
import { CustomSelect } from '../../components/CustomSelect';
import type { UserRole, Workspace } from '../../types';

type MemberItem = {
  userId: string;
  role: UserRole;
  fullName?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  validated?: boolean;
  lastSeen?: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: UserRole;
  status: 'idle' | 'sending' | 'success' | 'error';
  message?: string;
};

type MembersSectionProps = {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  selectedProjectId: string | null;
  workspaceMembers: MemberItem[];
  projectMembers: MemberItem[];
  onlineUserIds: string[];
  membersLoading: boolean;
  membersError: string | null;
  canManageWorkspaceMembers: boolean;
  canManageProjectMembers: boolean;
  inviteRows: InviteRow[];
  inviteMessage: string | null;
  currentUserId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectProject: (projectId: string | null) => void;
  onSubmitInvite: (event: React.FormEvent<HTMLFormElement>) => void;
  onAddInviteRow: () => void;
  onRemoveInviteRow: (rowId: string) => void;
  onChangeInviteEmail: (rowId: string, value: string) => void;
  onChangeInviteRole: (rowId: string, role: UserRole) => void;
  onResendInvite: (email: string, role: UserRole) => void;
  onChangeMemberRole: (
    scope: 'workspace' | 'project',
    userId: string,
    role: UserRole
  ) => void;
  onRemoveMember: (scope: 'workspace' | 'project', userId: string) => void;
};

export function MembersSection({
  workspaces,
  selectedWorkspaceId,
  selectedProjectId,
  workspaceMembers,
  projectMembers,
  onlineUserIds,
  membersLoading,
  membersError,
  canManageWorkspaceMembers,
  canManageProjectMembers,
  inviteRows,
  inviteMessage,
  currentUserId,
  onSelectWorkspace,
  onSelectProject,
  onSubmitInvite,
  onAddInviteRow,
  onRemoveInviteRow,
  onChangeInviteEmail,
  onChangeInviteRole,
  onResendInvite,
  onChangeMemberRole,
  onRemoveMember
}: MembersSectionProps) {
  const onlineThresholdMs = 2 * 60 * 1000;
  const onlineSet = new Set(onlineUserIds);
  const formatPresence = (userId: string, lastSeen?: string | null) => {
    if (onlineSet.has(userId)) {
      return { online: true, label: 'Online agora' };
    }
    if (!lastSeen) return { online: false, label: 'Sem atividade recente' };
    const seenAt = new Date(lastSeen);
    if (Number.isNaN(seenAt.getTime())) return { online: false, label: 'Sem atividade recente' };
    const now = Date.now();
    const diffMs = now - seenAt.getTime();
    if (diffMs <= onlineThresholdMs) {
      return { online: true, label: 'Online agora' };
    }
    return {
      online: false,
      label: `Visto por último em ${seenAt.toLocaleString('pt-BR')}`
    };
  };

  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;

  const selectedProject =
    selectedWorkspace?.projects.find((project) => project.id === selectedProjectId) ?? null;

  const canInvite = canManageWorkspaceMembers || canManageProjectMembers;

  const combinedMembers = new Map<
    string,
    MemberItem & { access: 'workspace' | 'project' }
  >();

  workspaceMembers.forEach((member) => {
    combinedMembers.set(member.userId, { ...member, access: 'workspace' });
  });

  projectMembers.forEach((member) => {
    if (!combinedMembers.has(member.userId)) {
      combinedMembers.set(member.userId, { ...member, access: 'project' });
    }
  });

  const rows = Array.from(combinedMembers.values());

  return (
    <div className="flex flex-col gap-8">
      {/* Header & Filters */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Membros
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Gerencie quem tem acesso ao workspace e projetos.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="w-full sm:w-64">
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Workspace
            </label>
            <select
              value={selectedWorkspaceId ?? ''}
              onChange={(event) => onSelectWorkspace(event.target.value)}
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-64">
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Projeto
            </label>
            <select
              value={selectedProjectId ?? ''}
              onChange={(event) =>
                onSelectProject(event.target.value ? event.target.value : null)
              }
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="">Todos os projetos</option>
              {selectedWorkspace?.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!canInvite && selectedWorkspace ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Apenas o dono do workspace/projeto pode gerenciar membros.
        </div>
      ) : null}

      {/* Invite Section */}
      <form
        onSubmit={onSubmitInvite}
        className="p-6"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Convidar membros
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {selectedProject
                ? `Convide pessoas para o projeto ${selectedProject.name}.`
                : 'Convide pessoas para o workspace selecionado.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddInviteRow}
            disabled={!canInvite}
            className="rounded-lg bg-[var(--card-bg)] border border-[var(--panel-border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--panel-bg)] hover:border-[var(--panel-border-strong)] disabled:opacity-60"
          >
            + Adicionar outro
          </button>
        </div>

        <div className="grid gap-4">
          {inviteRows.map((row, index) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 md:flex-row md:items-start"
            >
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={row.email}
                  onChange={(event) => onChangeInviteEmail(row.id, event.target.value)}
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  placeholder="nome@empresa.com"
                  disabled={!canInvite}
                />
              </div>
              <div className="w-full md:w-48">
                <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                  Função
                </label>
                <CustomSelect
                  value={row.role}
                  onChange={(val) => onChangeInviteRole(row.id, val as UserRole)}
                  options={[
                    { value: 'manager', label: 'Gerente', icon: Shield },
                    { value: 'executor', label: 'Executor', icon: User },
                    { value: 'viewer', label: 'Visualizador', icon: Eye }
                  ]}
                  triggerClassName="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  disabled={!canInvite}
                />
              </div>
              
              <div className="flex items-center gap-3 pt-6 md:w-auto">
                 <button
                  type="button"
                  onClick={() => onRemoveInviteRow(row.id)}
                  disabled={!canInvite || inviteRows.length === 1}
                  className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30"
                  title="Remover convite"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              
              <div className="w-full md:w-auto pt-2 md:pt-7">
                 <span
                  className={`text-xs font-medium ${
                    row.status === 'success'
                      ? 'text-emerald-400'
                      : row.status === 'error'
                        ? 'text-rose-400'
                        : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {row.message ||
                    (row.status === 'sending'
                      ? 'Enviando...'
                      : row.status === 'success'
                        ? 'Enviado!'
                        : '')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {inviteMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {inviteMessage}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={!canInvite}
            className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Enviar convites
          </button>
        </div>
      </form>

      {/* Members List */}
      <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] overflow-hidden shadow-sm">
        <div className="border-b border-[var(--panel-border)] px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-primary)]">Membros Ativos</h3>
          <span className="rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            {rows.length} {rows.length === 1 ? 'membro' : 'membros'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--card-bg)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="px-6 py-3 font-medium">Membro</th>
                <th className="px-6 py-3 font-medium">Conta</th>
                <th className="px-6 py-3 font-medium">Presença</th>
                <th className="px-6 py-3 font-medium">Função</th>
                <th className="px-6 py-3 font-medium">Acesso</th>
                <th className="px-6 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {membersLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-[var(--text-secondary)]"
                  >
                    Carregando membros...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((member) => {
                  const presence = formatPresence(member.userId, member.lastSeen);
                  const accessLabel =
                    member.access === 'workspace'
                      ? 'Workspace'
                      : 'Projeto';
                  const scope = member.access === 'workspace' ? 'workspace' : 'project';
                  const canManage =
                    scope === 'workspace' ? canManageWorkspaceMembers : canManageProjectMembers;
                  return (
                    <tr
                      key={`${member.access}-${member.userId}`}
                      className="transition hover:bg-[var(--card-bg)]/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] font-bold text-xs">
                             {(member.fullName?.[0] || member.email?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-[var(--text-primary)]">
                              {member.fullName || member.email || 'Usuário convidado'}
                            </span>
                            {member.fullName && member.email && (
                              <span className="text-xs text-[var(--text-secondary)]">
                                {member.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {member.validated ? (
                           <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                             Ativo
                           </span>
                        ) : (
                           <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
                             Pendente
                           </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border ${
                            presence.online
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                          }`}
                          title={presence.label}
                        >
                          {presence.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <CustomSelect
                          value={member.role}
                          disabled={!canManage}
                          onChange={(val) => onChangeMemberRole(scope, member.userId, val as UserRole)}
                          options={[
                            { value: 'manager', label: 'Gerente', icon: Shield },
                            { value: 'executor', label: 'Executor', icon: User },
                            { value: 'viewer', label: 'Visualizador', icon: Eye }
                          ]}
                          triggerClassName="bg-transparent border-transparent px-2 py-1 w-32"
                        />
                      </td>
                      <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                        {accessLabel}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!member.validated && member.email ? (
                            <button
                              type="button"
                              onClick={() => onResendInvite(member.email || '', member.role)}
                              disabled={!canManage}
                              className="text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-strong)] disabled:opacity-50"
                            >
                              Reenviar
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={!canManage || member.userId === currentUserId}
                            onClick={() => onRemoveMember(scope, member.userId)}
                            className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition disabled:opacity-30"
                            title="Remover membro"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]"
                  >
                    Nenhum membro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {membersError ? (
          <div className="border-t border-rose-500/20 bg-rose-500/5 px-6 py-3 text-sm text-rose-300">
            {membersError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
