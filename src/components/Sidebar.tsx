import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Folder,
  Layers,
  Pencil,
  Plus,
  Settings,
  Trash2
} from 'lucide-react';
import type { SystemView, Workspace } from '../types';

type SidebarProps = {
  collapsed: boolean;
  currentView: SystemView;
  isSuperUser: boolean;
  isViewer: boolean;
  canManageWorkspaces: boolean;
  userId: string;
  workspaces: Workspace[];
  expandedWorkspaces: Record<string, boolean>;
  selectedProjectId: string | null;
  onToggleCollapsed: () => void;
  onSelectView: (view: SystemView) => void;
  onToggleWorkspace: (workspaceId: string) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  onSelectProject: (workspaceId: string, projectId: string) => void;
  onCreateWorkspace: () => void;
  onCreateProject: (workspaceId: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onEditProject: (workspaceId: string, projectId: string) => void;
};

export function Sidebar({
  collapsed,
  currentView,
  isSuperUser,
  isViewer,
  canManageWorkspaces,
  userId,
  workspaces,
  expandedWorkspaces,
  selectedProjectId,
  onToggleCollapsed,
  onSelectView,
  onToggleWorkspace,
  onSelectWorkspace,
  onSelectProject,
  onCreateWorkspace,
  onCreateProject,
  onDeleteWorkspace,
  onDeleteProject,
  onEditProject
}: SidebarProps) {
  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } bg-[var(--panel-bg)] text-[var(--text-secondary)] flex flex-col min-h-screen border-r border-[var(--panel-border)] flex-shrink-0 transition-all duration-300 ease-in-out`}
    >
      <div
        className={`p-4 border-b border-[var(--panel-border)] flex items-center ${
          collapsed ? 'justify-center flex-col gap-4' : 'justify-between'
        }`}
      >
        <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
          <div className="bg-indigo-600 p-1 rounded">
            <Layers size={18} className="text-white" />
          </div>
          {!collapsed && <span>Zenith</span>}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onCreateWorkspace}
            disabled={!canManageWorkspaces}
            className="hover:bg-[var(--muted-bg)] p-1 rounded transition-colors"
            title="Novo Espaço"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div
        className={`flex items-center border-b border-[var(--panel-border)] py-2 ${
          collapsed ? 'justify-center' : 'justify-end px-4'
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--muted-bg)] transition-colors"
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!collapsed && (
          <div className="text-xs font-semibold text-[var(--text-muted)] px-2 mb-2 uppercase tracking-wider">
            Espaços de Trabalho
          </div>
        )}

        {workspaces.map((workspace) => {
          const isExpanded = expandedWorkspaces[workspace.id];
          return (
            <div key={workspace.id}>
              <div
                className={`flex items-center group justify-between px-2 py-1.5 hover:bg-[var(--muted-bg)] rounded-md cursor-pointer text-sm font-medium text-[var(--text-primary)] ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                <div
                  className="flex items-center gap-2 flex-1"
                  onClick={() => {
                    onSelectWorkspace(workspace.id);
                    onToggleWorkspace(workspace.id);
                  }}
                  title={collapsed ? workspace.name : ''}
                >
                  {!collapsed && (
                    <>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </>
                  )}
                  <Folder size={14} className="text-indigo-400" />
                  {!collapsed && <span className="truncate">{workspace.name}</span>}
                </div>
                {!collapsed && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(isSuperUser || (canManageWorkspaces && workspace.createdBy === userId)) && (
                      <>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onCreateProject(workspace.id);
                          }}
                          title="Add Project"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteWorkspace(workspace.id);
                          }}
                          className="text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {isExpanded && !isViewer && (
                <div
                  className={`${
                    collapsed
                      ? 'ml-0 flex flex-col items-center gap-1 mt-1'
                      : 'ml-4 pl-2 border-l border-[var(--panel-border)] mt-1 space-y-0.5'
                  }`}
                >
                  {workspace.projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => onSelectProject(workspace.id, project.id)}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm ${
                        selectedProjectId === project.id && currentView === 'project'
                          ? 'bg-indigo-600/20 text-indigo-300'
                          : 'hover:bg-[var(--muted-bg)] text-[var(--text-secondary)]'
                      } ${collapsed ? 'justify-center p-2' : ''}`}
                      title={collapsed ? project.name : ''}
                    >
                      <div className="flex items-center gap-2 flex-1 overflow-hidden">
                        <Briefcase size={13} />
                        {!collapsed && <span className="truncate">{project.name}</span>}
                      </div>
                      {!collapsed && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {(isSuperUser ||
                            (canManageWorkspaces && project.createdBy === userId)) && (
                            <>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEditProject(workspace.id, project.id);
                                }}
                                className="text-[var(--text-secondary)] hover:text-indigo-400"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDeleteProject(project.id);
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {collapsed && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onCreateWorkspace}
              disabled={!canManageWorkspaces}
              className="bg-[var(--muted-bg)] p-2 rounded-full hover:bg-[var(--panel-bg-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Novo Espaço"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {canManageWorkspaces && (
        <div className="p-3 border-t border-[var(--panel-border)]">
          <button
            type="button"
            onClick={() => onSelectView('settings')}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--muted-bg)] hover:text-[var(--text-primary)] rounded transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? 'Configurações' : ''}
          >
            <Settings size={16} />
            {!collapsed && 'Configurações'}
          </button>
        </div>
      )}
    </aside>
  );
}
