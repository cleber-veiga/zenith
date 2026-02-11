import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import type { AuthStatus, UserProfile, UserRole } from './types';
import { LoginScreen } from './screens/LoginScreen';
import { PasswordSetupScreen } from './screens/PasswordSetupScreen';
import { SystemScreen } from './screens/SystemScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [profileStatus, setProfileStatus] = useState<AuthStatus>('idle');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [mustSetPassword, setMustSetPassword] = useState(false);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setStatus('ready');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setStatus('ready');
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const handleThemeToggle = async () => {
    if (!session) return;
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: session.user.id, theme: nextTheme }, { onConflict: 'user_id' });
    if (error) {
      console.error(error);
      return;
    }
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            theme: nextTheme
          }
        : prev
    );
  };

  useEffect(() => {
    if (!session) {
      setProfileStatus('idle');
      setUserRole(null);
      setMustSetPassword(false);
      setIsSuperUser(false);
      setProfile(null);
      return;
    }

    let active = true;
    setProfileStatus('checking');

    Promise.all([
      supabase
        .from('user_profiles')
        .select('role, password_set, full_name, title, company, phone, avatar_url, theme')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      supabase.from('super_users').select('user_id').eq('user_id', session.user.id).maybeSingle()
    ])
      .then(([profileResponse, superResponse]) => {
        if (!active) return;
        if (profileResponse.error) {
          console.error(profileResponse.error);
        }
        if (superResponse.error) {
          console.error(superResponse.error);
        }
        setUserRole(profileResponse.data?.role ?? null);
        setMustSetPassword(profileResponse.data?.password_set === false);
        setIsSuperUser(Boolean(superResponse.data?.user_id));
        const nextProfile = profileResponse.data
          ? {
              fullName: profileResponse.data.full_name ?? null,
              title: profileResponse.data.title ?? null,
              company: profileResponse.data.company ?? null,
              phone: profileResponse.data.phone ?? null,
              avatarUrl: profileResponse.data.avatar_url ?? null,
              role: profileResponse.data.role ?? null,
              passwordSet: profileResponse.data.password_set ?? null,
              theme: profileResponse.data.theme ?? null
            }
          : null;
        setProfile(nextProfile);
        if (nextProfile?.theme) {
          setTheme(nextProfile.theme);
        }
        setProfileStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        console.error(error);
        setUserRole(null);
        setMustSetPassword(false);
        setIsSuperUser(false);
        setProfile(null);
        setProfileStatus('ready');
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  if (status !== 'ready' || (session && profileStatus !== 'ready')) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-secondary)]">
          Carregando...
        </div>
      </div>
    );
  }

  if (session && mustSetPassword) {
    return (
      <PasswordSetupScreen
        userId={session.user.id}
        onComplete={() => {
          setMustSetPassword(false);
        }}
      />
    );
  }

  return session ? (
    <SystemScreen
      session={session}
      onSignOut={() => supabase.auth.signOut()}
      userRole={userRole}
      isSuperUser={isSuperUser}
      profile={profile}
      theme={theme}
      onToggleTheme={handleThemeToggle}
      onProfileUpdated={(next) => setProfile(next)}
    />
  ) : (
    <LoginScreen />
  );
}

