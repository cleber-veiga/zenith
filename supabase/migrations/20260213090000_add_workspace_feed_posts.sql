create table if not exists public.workspace_feed_posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content text not null,
  task_ids uuid[] not null default '{}',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists workspace_feed_posts_workspace_created_at_idx
  on public.workspace_feed_posts (workspace_id, created_at desc);

alter table public.workspace_feed_posts enable row level security;

drop policy if exists workspace_feed_posts_read on public.workspace_feed_posts;
create policy "workspace_feed_posts_read"
on public.workspace_feed_posts for select
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_feed_posts.workspace_id
      and wm.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workspaces w
    where w.id = workspace_feed_posts.workspace_id
      and w.created_by = auth.uid()
  )
);

drop policy if exists workspace_feed_posts_insert on public.workspace_feed_posts;
create policy "workspace_feed_posts_insert"
on public.workspace_feed_posts for insert
with check (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_feed_posts.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('manager', 'executor')
  )
);
