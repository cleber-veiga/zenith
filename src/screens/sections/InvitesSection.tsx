import type { UserRole, Workspace } from '../../types';

type InvitesSectionProps = {
  inviteEmail: string;
  inviteRole: UserRole;
  inviteWorkspaceIds: string[];
  inviteProjectIds: string[];
  workspaces: Workspace[];
  inviteStatus: 'idle' | 'sending' | 'success' | 'error';
  inviteMessage: string | null;
  onChangeEmail: (value: string) => void;
  onChangeRole: (role: UserRole) => void;
  onToggleWorkspace: (workspaceId: string) => void;
  onToggleProject: (projectId: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function InvitesSection({
  inviteEmail,
  inviteRole,
  inviteWorkspaceIds,
  inviteProjectIds,
  workspaces,
  inviteStatus,
  inviteMessage,
  onChangeEmail,
  onChangeRole,
  onToggleWorkspace,
  onToggleProject,
  onSubmit
}: InvitesSectionProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-6"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">
            Novo convite
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            Convidar membro
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Escolha o e-mail, o grupo e quais workspaces e projetos estarão liberados.
          </p>
        </div>

        <label className="text-sm text-[var(--text-secondary)]">
          E-mail do convidado
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(event) => onChangeEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            placeholder="alguem@empresa.com"
          />
        </label>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">Grupo</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {[
              { value: 'manager', label: 'Gerente' },
              { value: 'executor', label: 'Executor' },
              { value: 'viewer', label: 'Visualizador' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChangeRole(option.value as UserRole)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  inviteRole === option.value
                    ? 'border-cyan-400/60 bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : 'border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:border-cyan-400/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">
            Acessos por workspace
          </p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            Selecionar um workspace libera todos os projetos dele. Se preferir acesso pontual,
            selecione projetos específicos.
          </p>
          <div className="mt-4 space-y-4">
            {workspaces.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--muted-bg)] p-4 text-sm text-[var(--text-secondary)]">
                Nenhum workspace cadastrado ainda.
              </div>
            ) : (
              workspaces.map((workspace) => {
                const workspaceSelected = inviteWorkspaceIds.includes(workspace.id);
                return (
                  <div
                    key={workspace.id}
                    className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
                  >
                    <label className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={workspaceSelected}
                        onChange={() => onToggleWorkspace(workspace.id)}
                        className="h-4 w-4 rounded border-[var(--panel-border)] bg-[var(--panel-bg)] text-cyan-500 focus:ring-[var(--ring)]"
                      />
                      <span className="font-medium">{workspace.name}</span>
                    </label>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {workspace.projects.map((project) => (
                        <label
                          key={project.id}
                          className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                        >
                          <input
                            type="checkbox"
                            disabled={!workspaceSelected}
                            checked={inviteProjectIds.includes(project.id)}
                            onChange={() => onToggleProject(project.id)}
                            className="h-3.5 w-3.5 rounded border-[var(--panel-border)] bg-[var(--panel-bg)] text-cyan-500 focus:ring-[var(--ring)] disabled:opacity-40"
                          />
                          <span>{project.name}</span>
                        </label>
                      ))}
                      {!workspace.projects.length && (
                        <span className="text-xs text-[var(--text-muted)]">
                          Nenhum projeto neste workspace.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {inviteMessage ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              inviteStatus === 'success'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
            }`}
          >
            {inviteMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={inviteStatus === 'sending'}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {inviteStatus === 'sending' ? 'Enviando convite...' : 'Enviar convite'}
        </button>
      </form>

      <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">Resumo</p>
        <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
          Permissões atuais
        </h3>
        <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Grupo
            </p>
            <p className="mt-2 text-base text-[var(--text-primary)]">
              {inviteRole === 'manager'
                ? 'Gerente'
                : inviteRole === 'executor'
                  ? 'Executor'
                  : 'Visualizador'}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Gerentes editam apenas workspaces e projetos que criaram.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Workspaces selecionados
            </p>
            <p className="mt-2 text-base text-[var(--text-primary)]">
              {inviteWorkspaceIds.length || inviteProjectIds.length
                ? `${inviteWorkspaceIds.length} workspaces, ${inviteProjectIds.length} projetos`
                : 'Nenhum acesso definido ainda'}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              O convite só pode ser enviado por super usuários.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
