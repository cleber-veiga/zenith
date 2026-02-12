create table if not exists public.workspace_user_presence (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_user_presence_workspace_last_seen_idx
  on public.workspace_user_presence (workspace_id, last_seen desc);

alter table public.workspace_user_presence enable row level security;

drop policy if exists workspace_user_presence_read on public.workspace_user_presence;
create policy "workspace_user_presence_read"
on public.workspace_user_presence for select
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_user_presence.workspace_id
      and wm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workspaces w
    where w.id = workspace_user_presence.workspace_id
      and w.created_by = auth.uid()
  )
);

drop policy if exists workspace_user_presence_write on public.workspace_user_presence;
create policy "workspace_user_presence_write"
on public.workspace_user_presence for all
using (
  public.is_super_user(auth.uid())
  or (
    workspace_user_presence.user_id = auth.uid()
    and (
      exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = workspace_user_presence.workspace_id
          and wm.user_id = auth.uid()
      )
      or exists (
        select 1 from public.workspaces w
        where w.id = workspace_user_presence.workspace_id
          and w.created_by = auth.uid()
      )
    )
  )
)
with check (
  public.is_super_user(auth.uid())
  or (
    workspace_user_presence.user_id = auth.uid()
    and (
      exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = workspace_user_presence.workspace_id
          and wm.user_id = auth.uid()
      )
      or exists (
        select 1 from public.workspaces w
        where w.id = workspace_user_presence.workspace_id
          and w.created_by = auth.uid()
      )
    )
  )
);
