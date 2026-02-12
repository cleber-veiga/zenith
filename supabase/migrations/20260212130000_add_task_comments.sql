create table if not exists public.project_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  content text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists project_task_comments_task_id_idx
  on public.project_task_comments (task_id, created_at desc);

alter table public.project_task_comments enable row level security;

drop policy if exists project_task_comments_read on public.project_task_comments;
create policy "project_task_comments_read"
on public.project_task_comments for select
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
);

drop policy if exists project_task_comments_write on public.project_task_comments;
create policy "project_task_comments_write"
on public.project_task_comments for all
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
