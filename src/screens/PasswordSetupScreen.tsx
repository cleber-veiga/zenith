import { useState } from 'react';
import { supabase } from '../lib/supabase';

type PasswordSetupScreenProps = {
  userId: string;
  onComplete: () => void;
};

export function PasswordSetupScreen({ userId, onComplete }: PasswordSetupScreenProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!password.trim() || password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, password_set: true }, { onConflict: 'user_id' });

    if (profileError) {
      console.error(profileError);
      setError('Senha atualizada, mas não foi possível registrar a confirmação.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <div className="flex min-h-screen items-center justify-center px-6 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-8 shadow-soft"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">
            Primeiro acesso
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            Defina sua senha
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Para entrar no Zenith, escolha uma senha segura antes de continuar.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm text-[var(--text-secondary)]">
              Nova senha
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Digite a nova senha"
              />
            </label>
            <label className="block text-sm text-[var(--text-secondary)]">
              Confirmar senha
              <input
                type="password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Confirme a senha"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Salvando...' : 'Confirmar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
