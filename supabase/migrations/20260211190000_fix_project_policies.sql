-- Fix recursion between projects and project_members policies

drop policy if exists project_members_read on public.project_members;
drop policy if exists project_members_insert_super on public.project_members;
drop policy if exists project_members_insert_owner on public.project_members;
drop policy if exists project_members_update_super on public.project_members;
drop policy if exists project_members_update_owner on public.project_members;
drop policy if exists project_members_delete_super on public.project_members;
drop policy if exists project_members_delete_owner on public.project_members;

create policy "project_members_read"
on public.project_members for select
using (
  user_id = auth.uid()
  or public.is_super_user(auth.uid())
  or public.is_workspace_manager(public.get_project_workspace_id(project_members.project_id), auth.uid())
);

create policy "project_members_insert_super"
on public.project_members for insert
with check (
  public.is_super_user(auth.uid())
);

create policy "project_members_insert_owner"
on public.project_members for insert
with check (
  public.is_workspace_manager(public.get_project_workspace_id(project_members.project_id), auth.uid())
);

create policy "project_members_update_super"
on public.project_members for update
using (
  public.is_super_user(auth.uid())
);

create policy "project_members_update_owner"
on public.project_members for update
using (
  public.is_workspace_manager(public.get_project_workspace_id(project_members.project_id), auth.uid())
);

create policy "project_members_delete_super"
on public.project_members for delete
using (
  public.is_super_user(auth.uid())
);

create policy "project_members_delete_owner"
on public.project_members for delete
using (
  public.is_workspace_manager(public.get_project_workspace_id(project_members.project_id), auth.uid())
);

-- Fix project policies to avoid recursion on workspace_members

drop policy if exists projects_read_members on public.projects;
drop policy if exists projects_insert_manager on public.projects;
drop policy if exists projects_update_manager on public.projects;
drop policy if exists projects_delete_manager on public.projects;

create policy "projects_read_members"
on public.projects for select
using (
  public.is_super_user(auth.uid())
  or public.is_workspace_manager(projects.workspace_id, auth.uid())
  or exists (
    select 1 from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
  )
);

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
