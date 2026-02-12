alter table project_tasks
add column if not exists execution_periods jsonb not null default '[]'::jsonb;
