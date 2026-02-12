alter table public.sectors
add column if not exists color text not null default '#64748b';

alter table public.task_types
add column if not exists color text not null default '#64748b';
