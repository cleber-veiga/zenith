-- Fix recursion by removing workspace table references in workspace_members policies

drop policy if exists workspace_members_read on public.workspace_members;
drop policy if exists workspace_members_insert_super on public.workspace_members;
drop policy if exists workspace_members_insert_owner on public.workspace_members;
drop policy if exists workspace_members_insert_creator on public.workspace_members;
drop policy if exists workspace_members_update_super on public.workspace_members;
drop policy if exists workspace_members_update_owner on public.workspace_members;
drop policy if exists workspace_members_delete_super on public.workspace_members;
drop policy if exists workspace_members_delete_owner on public.workspace_members;

create policy "workspace_members_read"
on public.workspace_members for select
using (
  user_id = auth.uid()
  or public.is_super_user(auth.uid())
  or public.is_workspace_manager(workspace_members.workspace_id, auth.uid())
);

create policy "workspace_members_insert_super"
on public.workspace_members for insert
with check (
  public.is_super_user(auth.uid())
);

create policy "workspace_members_insert_owner"
on public.workspace_members for insert
with check (
  public.is_workspace_manager(workspace_members.workspace_id, auth.uid())
);

create policy "workspace_members_insert_creator"
on public.workspace_members for insert
with check (
  user_id = auth.uid()
  and role = 'manager'
);

create policy "workspace_members_update_super"
on public.workspace_members for update
using (
  public.is_super_user(auth.uid())
);

create policy "workspace_members_update_owner"
on public.workspace_members for update
using (
  public.is_workspace_manager(workspace_members.workspace_id, auth.uid())
);

create policy "workspace_members_delete_super"
on public.workspace_members for delete
using (
  public.is_super_user(auth.uid())
);

create policy "workspace_members_delete_owner"
on public.workspace_members for delete
using (
  public.is_workspace_manager(workspace_members.workspace_id, auth.uid())
);
