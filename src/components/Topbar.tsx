import { useState } from 'react';
import { Bell, ChevronDown, ChevronRight, LogOut, Moon, Sun, User, X } from 'lucide-react';
import type { UserProfile, WorkspaceNotification } from '../types';

type TopbarProps = {
  initials: string;
  profile: UserProfile | null;
  theme: 'dark' | 'light';
  workspaceName?: string;
  projectName?: string;
  notifications: WorkspaceNotification[];
  workspaceNameById: Record<string, string>;
  notificationActorById: Record<string, string>;
  onToggleTheme: () => void;
  onMarkNotificationRead: (notificationId: string) => void;
  onMarkAllNotificationsRead: () => void;
  onSignOut: () => void;
  onOpenProfile: () => void;
};

export function Topbar({
  initials,
  profile,
  theme,
  workspaceName,
  projectName,
  notifications,
  workspaceNameById,
  notificationActorById,
  onToggleTheme,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onSignOut,
  onOpenProfile
}: TopbarProps) {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<WorkspaceNotification | null>(null);
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <>
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
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="relative inline-flex items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--card-bg)] w-7 h-7 text-xs text-[var(--text-secondary)] transition hover:border-[var(--panel-border-strong)] hover:text-[var(--text-primary)]"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold leading-4 text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 shadow-soft">
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Notificações</span>
                {!!unreadCount && (
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      onMarkNotificationRead(notification.id);
                      setSelectedNotification(notification);
                      setNotificationsOpen(false);
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      notification.readAt
                        ? 'border-[var(--panel-border)] bg-[var(--panel-bg-soft)]'
                        : 'border-cyan-500/30 bg-cyan-500/10'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {workspaceNameById[notification.workspaceId] || 'Workspace'}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-primary)] line-clamp-2">
                      {notification.postContent || 'Você foi mencionado em uma postagem.'}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                      {notificationActorById[notification.createdBy] || 'Membro'} •{' '}
                      {new Date(notification.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </button>
                ))}
                {!notifications.length && (
                  <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] px-3 py-4 text-center text-xs text-[var(--text-muted)]">
                    Nenhuma notificação por enquanto.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {workspaceNameById[selectedNotification.workspaceId] || 'Workspace'}
                </div>
                <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  Você foi mencionado em uma postagem
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-md border border-[var(--panel-border)] p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg-soft)] p-3">
              <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                {selectedNotification.postContent || 'Conteúdo da postagem não disponível.'}
              </p>
            </div>

            <div className="mt-3 text-xs text-[var(--text-muted)]">
              {notificationActorById[selectedNotification.createdBy] || 'Membro'} •{' '}
              {new Date(selectedNotification.createdAt).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
