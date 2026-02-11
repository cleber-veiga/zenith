import { IconClose } from '../icons';

type WorkspaceModalProps = {
  isOpen: boolean;
  workspaceName: string;
  workspaceDescription: string;
  errorMessage: string | null;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function WorkspaceModal({
  isOpen,
  workspaceName,
  workspaceDescription,
  errorMessage,
  onChangeName,
  onChangeDescription,
  onClose,
  onSubmit
}: WorkspaceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Novo workspace
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              Cadastrar workspace
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--panel-border)] p-1 text-[var(--text-secondary)] transition hover:border-[var(--panel-border-strong)] hover:text-[var(--text-primary)]"
            aria-label="Fechar"
          >
            <IconClose />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Nome
            </label>
            <input
              value={workspaceName}
              onChange={(event) => onChangeName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Ex: Growth Squad"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Descrição
            </label>
            <input
              value={workspaceDescription}
              onChange={(event) => onChangeDescription(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Resumo do workspace"
            />
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-slate-950"
          >
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
