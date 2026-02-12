alter table public.project_tasks
add column if not exists display_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (
      partition by project_id, status
      order by created_at asc, id asc
    ) - 1 as seq
  from public.project_tasks
)
update public.project_tasks pt
set display_order = ranked.seq
from ranked
where ranked.id = pt.id;

create index if not exists project_tasks_project_status_display_order_idx
  on public.project_tasks (project_id, status, display_order);
