-- Allow feed post author to update/delete their own posts.

drop policy if exists workspace_feed_posts_update on public.workspace_feed_posts;
create policy "workspace_feed_posts_update"
on public.workspace_feed_posts for update
using (
  public.is_super_user(auth.uid())
  or workspace_feed_posts.created_by = auth.uid()
)
with check (
  public.is_super_user(auth.uid())
  or workspace_feed_posts.created_by = auth.uid()
);

drop policy if exists workspace_feed_posts_delete on public.workspace_feed_posts;
create policy "workspace_feed_posts_delete"
on public.workspace_feed_posts for delete
using (
  public.is_super_user(auth.uid())
  or workspace_feed_posts.created_by = auth.uid()
);
