-- Add mentions to feed posts
alter table public.workspace_feed_posts
  add column if not exists mentioned_user_ids uuid[] not null default '{}';

-- Notifications for feed mentions
create table if not exists public.workspace_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  post_id uuid not null references public.workspace_feed_posts(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists workspace_notifications_user_created_idx
  on public.workspace_notifications (mentioned_user_id, created_at desc);

create index if not exists workspace_notifications_unread_idx
  on public.workspace_notifications (mentioned_user_id)
  where read_at is null;

alter table public.workspace_notifications enable row level security;

drop policy if exists workspace_notifications_read on public.workspace_notifications;
create policy "workspace_notifications_read"
on public.workspace_notifications for select
using (
  public.is_super_user(auth.uid())
  or workspace_notifications.mentioned_user_id = auth.uid()
);

drop policy if exists workspace_notifications_insert on public.workspace_notifications;
create policy "workspace_notifications_insert"
on public.workspace_notifications for insert
with check (
  public.is_super_user(auth.uid())
  or (
    workspace_notifications.created_by = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_notifications.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('manager', 'executor')
    )
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_notifications.workspace_id
        and wm.user_id = workspace_notifications.mentioned_user_id
    )
    and exists (
      select 1 from public.workspace_feed_posts fp
      where fp.id = workspace_notifications.post_id
        and fp.workspace_id = workspace_notifications.workspace_id
    )
  )
);

drop policy if exists workspace_notifications_update on public.workspace_notifications;
create policy "workspace_notifications_update"
on public.workspace_notifications for update
using (
  public.is_super_user(auth.uid())
  or workspace_notifications.mentioned_user_id = auth.uid()
)
with check (
  public.is_super_user(auth.uid())
  or workspace_notifications.mentioned_user_id = auth.uid()
);
