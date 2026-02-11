import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError('Credenciais inválidas ou usuário não convidado.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.35),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(37,99,235,0.25),_transparent_55%)]" />
        <div className="absolute inset-0 bg-grid bg-[length:30px_30px] opacity-50" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
          <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="flex flex-col justify-center">
              <p className="text-sm uppercase tracking-[0.3em] text-[var(--text-secondary)]">
                Sistema privado
              </p>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-[var(--text-primary)] md:text-5xl">
                Bem-vindo de volta ao Zenith
              </h1>
              <p className="mt-4 max-w-xl text-base text-[var(--text-secondary)] md:text-lg">
                Acesso exclusivo para usuários convidados. Entre com seu e-mail e senha corporativos
                para continuar.
              </p>
              <div className="mt-8 flex items-center gap-6">
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    Status
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">Convite obrigatório</p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    Segurança
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">Login com Supabase</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-8 shadow-soft backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">Acesso</h2>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  Somente convidados
                </span>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <label className="block text-sm text-[var(--text-secondary)]">
                  E-mail
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                    placeholder="voce@empresa.com"
                  />
                </label>

                <label className="block text-sm text-[var(--text-secondary)]">
                  Senha
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                    placeholder="Digite sua senha"
                  />
                </label>

                {error ? (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              <p className="mt-6 text-xs text-[var(--text-secondary)]">
                Este ambiente não permite auto-cadastro. Fale com o administrador para receber um
                convite.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
