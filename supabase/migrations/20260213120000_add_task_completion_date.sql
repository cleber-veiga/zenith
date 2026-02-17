alter table public.project_tasks
  add column if not exists completion_date date;
