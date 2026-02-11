-- Sectors
create table if not exists public.sectors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

-- Task types
create table if not exists public.task_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

-- updated_at triggers
create trigger sectors_set_updated_at
before update on public.sectors
for each row execute function public.set_updated_at();

create trigger task_types_set_updated_at
before update on public.task_types
for each row execute function public.set_updated_at();

-- RLS
alter table public.sectors enable row level security;
alter table public.task_types enable row level security;

create policy "sectors_read"
on public.sectors for select
using (
  public.is_super_user(auth.uid())
  or public.is_workspace_manager(sectors.workspace_id, auth.uid())
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = sectors.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "sectors_write"
on public.sectors for all
using (
  public.is_super_user(auth.uid())
  or public.is_workspace_manager(sectors.workspace_id, auth.uid())
)
with check (
  public.is_super_user(auth.uid())
  or public.is_workspace_manager(sectors.workspace_id, auth.uid())
);

create policy "task_types_read"
on public.task_types for select
using (
  public.is_super_user(auth.uid())
  or public.is_workspace_manager(task_types.workspace_id, auth.uid())
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = task_types.workspace_id
      and wm.user_id = auth.uid()
  )
);

create policy "task_types_write"
on public.task_types for all
using (
  public.is_super_user(auth.uid())
  or public.is_workspace_manager(task_types.workspace_id, auth.uid())
)
with check (
  public.is_super_user(auth.uid())
  or public.is_workspace_manager(task_types.workspace_id, auth.uid())
);
