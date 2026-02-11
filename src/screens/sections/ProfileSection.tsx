import type { UserProfile } from '../../types';

type ProfileSectionProps = {
  profileForm: {
    fullName: string;
    title: string;
    company: string;
    phone: string;
    avatarUrl: string;
  };
  profileMessage: string | null;
  profileSaving: boolean;
  avatarUploading: boolean;
  avatarError: string | null;
  profile: UserProfile | null;
  displayName: string;
  displayRole: string;
  initials: string;
  sessionEmail: string;
  isSuperUser: boolean;
  onChangeField: (field: keyof ProfileSectionProps['profileForm'], value: string) => void;
  onUploadAvatar: (file: File) => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
};

export function ProfileSection({
  profileForm,
  profileMessage,
  profileSaving,
  avatarUploading,
  avatarError,
  profile,
  displayName,
  displayRole,
  initials,
  sessionEmail,
  isSuperUser,
  onChangeField,
  onUploadAvatar,
  onSave,
  onSignOut
}: ProfileSectionProps) {
  const avatarPreview = profileForm.avatarUrl || profile?.avatarUrl || '';
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-6">
        <div className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.35),_transparent_70%)]" />
          <div className="relative flex flex-col items-center text-center">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Foto do perfil"
                  className="h-24 w-24 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-semibold text-white shadow-lg">
                  {initials || 'ZU'}
                </div>
              )}
              <label className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-secondary)] shadow hover:text-[var(--text-primary)]">
                <span className="text-base">✎</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      onUploadAvatar(file);
                      event.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
              {displayName || 'Usuário'}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{displayRole}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1">
                {sessionEmail}
              </span>
              {profileForm.company?.trim() ? (
                <span className="rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1">
                  {profileForm.company}
                </span>
              ) : null}
              {profileForm.phone?.trim() ? (
                <span className="rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1">
                  {profileForm.phone}
                </span>
              ) : null}
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-full border border-[var(--panel-border)] px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:border-[var(--panel-border-strong)] hover:text-[var(--text-primary)]"
              >
                Sair
              </button>
              <span className="rounded-full border border-[var(--panel-border)] px-4 py-2 text-xs text-[var(--text-secondary)]">
                {isSuperUser ? 'Super usuário' : 'Conta ativa'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">
            Conta
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Visão geral</h3>
          <div className="mt-4 space-y-4 text-sm text-[var(--text-secondary)]">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Papel atual
              </p>
              <p className="mt-2 text-base text-[var(--text-primary)]">{displayRole}</p>
              {isSuperUser && (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Você é super usuário deste ambiente.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Dica rápida
              </p>
              <p className="mt-2 text-sm text-[var(--text-primary)]">
                Atualize sua foto para que a equipe reconheça você mais rápido.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={onSave}
        className="flex flex-col gap-5 p-6"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">
            Perfil profissional
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            Informações gerais
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Atualize seus dados e personalize sua presença no sistema.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--muted-bg)] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Pré-visualização do avatar"
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-base font-semibold text-white">
                  {initials || 'ZU'}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Foto de perfil
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  PNG ou JPG. Tamanho recomendado: 400x400.
                </p>
              </div>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--panel-border-strong)] hover:text-[var(--text-primary)]">
              {avatarUploading ? 'Enviando...' : 'Upload de foto'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={avatarUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadAvatar(file);
                    event.target.value = '';
                  }
                }}
              />
            </label>
          </div>
          {avatarError ? (
            <p className="mt-3 text-xs text-rose-300">{avatarError}</p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[var(--text-secondary)]">
            Nome completo
            <input
              value={profileForm.fullName}
              onChange={(event) => onChangeField('fullName', event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Digite seu nome"
            />
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            Cargo
            <input
              value={profileForm.title}
              onChange={(event) => onChangeField('title', event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Ex: Head de Produto"
            />
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            Empresa / Área
            <input
              value={profileForm.company}
              onChange={(event) => onChangeField('company', event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Ex: Zenith Labs"
            />
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            Telefone
            <input
              value={profileForm.phone}
              onChange={(event) => onChangeField('phone', event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="(11) 99999-0000"
            />
          </label>
        </div>

        <label className="text-sm text-[var(--text-secondary)]">
          Foto de perfil (URL opcional)
          <input
            value={profileForm.avatarUrl}
            onChange={(event) => onChangeField('avatarUrl', event.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            placeholder="https://..."
          />
        </label>

        {profileMessage ? (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {profileMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={profileSaving}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {profileSaving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </form>
    </div>
    </div>
  );
}
