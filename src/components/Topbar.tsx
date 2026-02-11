import { useState } from 'react';
import { ChevronDown, ChevronRight, LogOut, Moon, Sun, User } from 'lucide-react';
import type { UserProfile } from '../types';

type TopbarProps = {
  initials: string;
  profile: UserProfile | null;
  theme: 'dark' | 'light';
  workspaceName?: string;
  projectName?: string;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onOpenProfile: () => void;
};

export function Topbar({
  initials,
  profile,
  theme,
  workspaceName,
  projectName,
  onToggleTheme,
  onSignOut,
  onOpenProfile
}: TopbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-[var(--panel-border)] px-4 py-1.5 flex items-center justify-between gap-3 bg-[var(--panel-bg-soft)] min-w-0">
      {/* Breadcrumbs / Info */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] min-w-0 flex-1">
        {workspaceName && (
          <div className="flex items-center gap-1 min-w-0">
             <div className="w-5 h-5 rounded bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">
                {workspaceName.charAt(0).toUpperCase()}
             </div>
             <span className="font-medium text-[var(--text-primary)] truncate">{workspaceName}</span>
          </div>
        )}
        
        {workspaceName && projectName && (
           <ChevronRight size={14} className="text-[var(--text-muted)]" />
        )}

        {projectName && (
           <span className="font-medium text-[var(--text-primary)] truncate">{projectName}</span>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--card-bg)] w-7 h-7 text-xs text-[var(--text-secondary)] transition hover:border-[var(--panel-border-strong)] hover:text-[var(--text-primary)]"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center rounded-full border border-[var(--panel-border)] bg-[var(--card-bg)] p-1 text-left text-sm transition hover:border-[var(--panel-border-strong)]"
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white">
                {initials || 'ZU'}
              </span>
            )}
            <ChevronDown size={14} className="text-[var(--text-muted)] ml-1 mr-1" />
          </button>
            {open && (
              <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 shadow-soft">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenProfile();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--muted-bg)] hover:text-[var(--text-primary)]"
                >
                  <User size={16} />
                  Perfil
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--muted-bg)] hover:text-[var(--text-primary)]"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
    </header>
  );
}
