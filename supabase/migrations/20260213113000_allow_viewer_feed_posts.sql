-- Allow viewers to post on workspace feed and create mention notifications.

drop policy if exists workspace_feed_posts_insert on public.workspace_feed_posts;
create policy "workspace_feed_posts_insert"
on public.workspace_feed_posts for insert
with check (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_feed_posts.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('manager', 'executor', 'viewer')
  )
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
        and wm.role in ('manager', 'executor', 'viewer')
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
