-- Collab It - Think Tank "Open for Investment" toggle.

alter table public.projects
  add column if not exists is_seeking_investment boolean not null default false;

alter table public.projects
  add column if not exists seeking_investment_at timestamptz;

create index if not exists projects_seeking_investment_idx
  on public.projects(seeking_investment_at desc) where is_seeking_investment = true;
