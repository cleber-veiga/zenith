-- Tighten comments policies: only authors (or super users) can update/delete.

drop policy if exists project_task_comments_write on public.project_task_comments;

drop policy if exists project_task_comments_insert on public.project_task_comments;
create policy "project_task_comments_insert"
on public.project_task_comments for insert
using (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_comments.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
)
with check (
  public.is_super_user(auth.uid())
  or exists (
    select 1 from public.project_tasks t
    where t.id = project_task_comments.task_id
      and (
        exists (
          select 1 from public.project_members pm
          where pm.project_id = t.project_id
            and pm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = public.get_project_workspace_id(t.project_id)
            and wm.user_id = auth.uid()
        )
        or exists (
          select 1 from public.projects p
          where p.id = t.project_id
            and p.created_by = auth.uid()
        )
      )
  )
);

drop policy if exists project_task_comments_update on public.project_task_comments;
create policy "project_task_comments_update"
on public.project_task_comments for update
using (
  public.is_super_user(auth.uid())
  or project_task_comments.created_by = auth.uid()
)
with check (
  public.is_super_user(auth.uid())
  or project_task_comments.created_by = auth.uid()
);

drop policy if exists project_task_comments_delete on public.project_task_comments;
create policy "project_task_comments_delete"
on public.project_task_comments for delete
using (
  public.is_super_user(auth.uid())
  or project_task_comments.created_by = auth.uid()
);
