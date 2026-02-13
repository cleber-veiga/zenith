-- Create notifications automatically when a feed post includes mentioned users.

create or replace function public.create_workspace_feed_mention_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_notifications (
    workspace_id,
    post_id,
    mentioned_user_id,
    created_by
  )
  select
    new.workspace_id,
    new.id,
    mention.user_id,
    new.created_by
  from (
    select distinct unnest(coalesce(new.mentioned_user_ids, '{}'::uuid[])) as user_id
  ) as mention
  where mention.user_id is not null
    and mention.user_id <> new.created_by
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = new.workspace_id
        and wm.user_id = mention.user_id
    );

  return new;
end;
$$;

drop trigger if exists workspace_feed_mentions_notifications_trigger on public.workspace_feed_posts;
create trigger workspace_feed_mentions_notifications_trigger
after insert on public.workspace_feed_posts
for each row
execute function public.create_workspace_feed_mention_notifications();
