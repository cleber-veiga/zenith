-- Extensions
create extension if not exists "pgcrypto";

-- Roles
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role' and typnamespace = 'public'::regnamespace) then
    create type public.user_role as enum ('manager', 'executor', 'viewer');
  end if;
end $$;

-- User profiles (global role + password setup)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'viewer',
  password_set boolean not null default false,
  full_name text,
  title text,
  company text,
  phone text,
  email text,
  avatar_url text,
  theme text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Super users
create table if not exists public.super_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  summary text,
  status text default 'Novo',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Project tasks
create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  sector text,
  task_type text,
  executor_ids uuid[] not null default '{}'::uuid[],
  validator_ids uuid[] not null default '{}'::uuid[],
  inform_ids uuid[] not null default '{}'::uuid[],
  start_date date,
  due_date_original date,
  due_date_current date,
  estimated_minutes integer not null default 0,
  actual_minutes integer not null default 0,
  priority text default 'Média',
  status text default 'Backlog',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Task time tracking
create table if not exists public.project_task_time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_minutes integer not null,
  note text,
  source text not null check (source in ('timer', 'manual')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Due date change history
create table if not exists public.project_task_due_date_changes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  previous_date date,
  new_date date not null,
  reason text not null,
  changed_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Task audit logs
create table if not exists public.project_task_audit_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Workspace membership
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null default 'executor',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- Project membership (optional, for per-project permissions)
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null default 'executor',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- Updated_at triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();


drop trigger if exists project_tasks_set_updated_at on public.project_tasks;
create trigger project_tasks_set_updated_at
before update on public.project_tasks
for each row execute function public.set_updated_at();

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- Auto-assign creator as manager on workspace creation
create or replace function public.handle_workspace_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'manager')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists workspaces_add_manager on public.workspaces;
create trigger workspaces_add_manager
after insert on public.workspaces
for each row execute function public.handle_workspace_created();

-- Viewer-friendly views (limited fields)
create or replace view public.workspaces_viewer as
select id, name
from public.workspaces;

create or replace view public.projects_viewer as
select id, workspace_id, name, status
from public.projects;

-- RLS
alter table public.workspaces enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_task_time_entries enable row level security;
alter table public.project_task_due_date_changes enable row level security;
alter table public.project_task_audit_logs enable row level security;
alter table public.workspace_members enable row level security;
alter table public.project_members enable row level security;
alter table public.user_profiles enable row level security;
alter table public.super_users enable row level security;

-- Helper: avoid policy recursion on workspace_members
create or replace function public.is_workspace_manager(_workspace_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = _workspace_id
      and wm.user_id = _user_id
      and wm.role = 'manager'
  );
$$;

-- Helper: avoid policy recursion on project_members by bypassing RLS on projects
create or replace function public.get_project_workspace_id(_project_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select workspace_id from public.projects where id = _project_id;
$$;

-- Helper: super user check
create or replace function public.is_super_user(_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.super_users su where su.user_id = _user_id
  );
$$;

-- Helper: global user role
create or replace function public.get_user_role(_user_id uuid)
returns public.user_role
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_profiles up where up.user_id = _user_id),
    'viewer'::public.user_role
  );
$$;

-- Drop old policies if re-running
drop policy if exists workspace_members_read on public.workspace_members;
drop policy if exists workspace_members_insert_manager on public.workspace_members;
drop policy if exists workspace_members_insert_creator on public.workspace_members;
drop policy if exists workspace_members_update_manager on public.workspace_members;
drop policy if exists workspace_members_delete_manager on public.workspace_members;

-- User profiles: user sees/updates own profile (super user + owners can read member profiles)
create policy "user_profiles_read"
on public.user_profiles for select
using (
  user_id = auth.uid()
  or public.is_super_user(auth.uid())
  or exists (
    select 1
    from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.user_id = user_profiles.user_id
      and w.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    join public.projects p on p.id = pm.project_id
    where pm.user_id = user_profiles.user_id
      and p.created_by = auth.uid()
  )
);

create policy "user_profiles_insert"
on public.user_profiles for insert
with check (
  user_id = auth.uid()
  or public.is_super_user(auth.uid())
);

create policy "user_profiles_update"
on public.user_profiles for update
using (
  user_id = auth.uid()
  or public.is_super_user(auth.uid())
);

-- Super users: only super users can manage the list
create policy "super_users_read"
on public.super_users for select
using (
  user_id = auth.uid()
  or public.is_super_user(auth.uid())
);

create policy "super_users_manage"
on public.super_users for all
using (public.is_super_user(auth.uid()))
with check (public.is_super_user(auth.uid()));

-- Policies: Managers can CRUD; executors/viewers can read if member.
-- Workspace: read if member
create policy "workspace_read_members"
on public.workspaces for select
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
  )
  or public.is_super_user(auth.uid())
);

-- Workspace: insert only by manager (global role) or super user (creator becomes manager)
create policy "workspace_insert_manager"
on public.workspaces for insert
with check (
  auth.uid() = created_by
  and (public.get_user_role(auth.uid()) = 'manager' or public.is_super_user(auth.uid()))
);

-- Workspace: update/delete only by manager
create policy "workspace_update_manager"
on public.workspaces for update
using (
  (auth.uid() = created_by and public.get_user_role(auth.uid()) = 'manager')
  or public.is_super_user(auth.uid())
);

create policy "workspace_delete_manager"
on public.workspaces for delete
using (
  (auth.uid() = created_by and public.get_user_role(auth.uid()) = 'manager')
  or public.is_super_user(auth.uid())
);

-- Workspace members: super users + workspace owners manage memberships; members can read their own
create policy "workspace_members_read"
on public.workspace_members for select
using (
  user_id = auth.uid()
  or public.is_super_user(auth.uid())
  or exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "workspace_members_insert_super"
on public.workspace_members for insert
with check (
  public.is_super_user(auth.uid())
);

create policy "workspace_members_insert_owner"
on public.workspace_members for insert
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.created_by = auth.uid()
  )
);

-- Allow creator to insert initial manager membership
create policy "workspace_members_insert_creator"
on public.workspace_members for insert
with check (
  user_id = auth.uid()
  and role = 'manager'
  and exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "workspace_members_update_super"
on public.workspace_members for update
using (
  public.is_super_user(auth.uid())
);

create policy "workspace_members_update_owner"
on public.workspace_members for update
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.created_by = auth.uid()
  )
);

create policy "workspace_members_delete_super"
on public.workspace_members for delete
using (
  public.is_super_user(auth.uid())
);

create policy "workspace_members_delete_owner"
on public.workspace_members for delete
using (
  exists (
    select 1 from public.workspaces w
    where w.id = workspace_members.workspace_id
      and w.created_by = auth.uid()
  )
);

-- Projects: read if user has workspace access or project membership OR is workspace creator
create policy "projects_read_members"
on public.projects for select
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = projects.workspace_id
      and wm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workspaces w
    where w.id = projects.workspace_id
      and w.created_by = auth.uid()
  )
  or public.is_super_user(auth.uid())
);

-- Projects: insert/update/delete only by manager creator or super user
create policy "projects_insert_manager"
on public.projects for insert
with check (
  auth.uid() = created_by
  and (public.get_user_role(auth.uid()) = 'manager' or public.is_super_user(auth.uid()))
);

create policy "projects_update_manager"
on public.projects for update
using (
  (auth.uid() = created_by and public.get_user_role(auth.uid()) = 'manager')
  or public.is_super_user(auth.uid())
);

create policy "projects_delete_manager"
on public.projects for delete
using (
  (auth.uid() = created_by and public.get_user_role(auth.uid()) = 'manager')
  or public.is_super_user(auth.uid())
);


create policy "project_tasks_read"
on public.project_tasks for select
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_tasks.project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = public.get_project_workspace_id(project_tasks.project_id)
      and wm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.projects p
    where p.id = project_tasks.project_id
      and p.created_by = auth.uid()
  )
);

create policy "project_tasks_write"
on public.project_tasks for all
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_tasks.project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = public.get_project_workspace_id(project_tasks.project_id)
      and wm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.projects p
    where p.id = project_tasks.project_id
      and p.created_by = auth.uid()
  )
)
with check (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_tasks.project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = public.get_project_workspace_id(project_tasks.project_id)
      and wm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.projects p
    where p.id = project_tasks.project_id
      and p.created_by = auth.uid()
  )
);

create policy "project_task_time_entries_read"
on public.project_task_time_entries for select
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_time_entries.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
);

create policy "project_task_time_entries_write"
on public.project_task_time_entries for all
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_time_entries.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
)
with check (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_time_entries.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
);

create policy "project_task_due_date_changes_read"
on public.project_task_due_date_changes for select
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_due_date_changes.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
);

create policy "project_task_due_date_changes_write"
on public.project_task_due_date_changes for all
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_due_date_changes.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
)
with check (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_due_date_changes.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
);

create policy "project_task_audit_logs_read"
on public.project_task_audit_logs for select
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_audit_logs.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
);

create policy "project_task_audit_logs_write"
on public.project_task_audit_logs for all
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_audit_logs.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
)
with check (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_audit_logs.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
);

-- Project members: super users + project owners manage; members can read their own
create policy "project_members_read"
on public.project_members for select
using (
  user_id = auth.uid()
  or public.is_super_user(auth.uid())
  or exists (
    select 1 from public.projects p
    where p.id = project_members.project_id
      and p.created_by = auth.uid()
  )
);

create policy "project_members_insert_super"
on public.project_members for insert
with check (
  public.is_super_user(auth.uid())
);

create policy "project_members_insert_owner"
on public.project_members for insert
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id
      and p.created_by = auth.uid()
  )
);

create policy "project_members_update_super"
on public.project_members for update
using (
  public.is_super_user(auth.uid())
);

create policy "project_members_update_owner"
on public.project_members for update
using (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id
      and p.created_by = auth.uid()
  )
);

create policy "project_members_delete_super"
on public.project_members for delete
using (
  public.is_super_user(auth.uid())
);

create policy "project_members_delete_owner"
on public.project_members for delete
using (
  exists (
    select 1 from public.projects p
    where p.id = project_members.project_id
      and p.created_by = auth.uid()
  )
);
