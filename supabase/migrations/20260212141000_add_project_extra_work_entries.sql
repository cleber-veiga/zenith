create table if not exists public.project_extra_work_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  description text not null,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  worked_at date not null default now()::date,
  note text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists project_extra_work_entries_project_id_idx
  on public.project_extra_work_entries (project_id, worked_at desc, created_at desc);

alter table public.project_extra_work_entries enable row level security;

drop policy if exists project_extra_work_entries_read on public.project_extra_work_entries;
create policy "project_extra_work_entries_read"
on public.project_extra_work_entries for select
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_extra_work_entries.project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = public.get_project_workspace_id(project_extra_work_entries.project_id)
      and wm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.projects p
    where p.id = project_extra_work_entries.project_id
      and p.created_by = auth.uid()
  )
);

drop policy if exists project_extra_work_entries_write on public.project_extra_work_entries;
create policy "project_extra_work_entries_write"
on public.project_extra_work_entries for all
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_extra_work_entries.project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = public.get_project_workspace_id(project_extra_work_entries.project_id)
      and wm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.projects p
    where p.id = project_extra_work_entries.project_id
      and p.created_by = auth.uid()
  )
)
with check (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = project_extra_work_entries.project_id
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = public.get_project_workspace_id(project_extra_work_entries.project_id)
      and wm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.projects p
    where p.id = project_extra_work_entries.project_id
      and p.created_by = auth.uid()
  )
);
