-- Collab It - Think Tank investor interest signals.

create table if not exists public.investment_interests (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  investor_user_id    uuid not null references public.users(id) on delete cascade,
  investor_name       text,
  investor_company    text,
  investor_email      text,
  message             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (project_id, investor_user_id)
);

create index if not exists investment_interests_project_idx
  on public.investment_interests(project_id, created_at desc);
create index if not exists investment_interests_investor_idx
  on public.investment_interests(investor_user_id, created_at desc);

drop trigger if exists set_updated_at_investment_interests on public.investment_interests;
create trigger set_updated_at_investment_interests
  before update on public.investment_interests
  for each row execute function public.set_updated_at();

grant select, insert, update on public.investment_interests to service_role;
grant select, insert on public.investment_interests to authenticated;

alter table public.investment_interests enable row level security;

drop policy if exists "Investor can record own interest" on public.investment_interests;
create policy "Investor can record own interest"
  on public.investment_interests for insert
  to authenticated
  with check (investor_user_id = auth.uid());

drop policy if exists "Investor can read own interests" on public.investment_interests;
create policy "Investor can read own interests"
  on public.investment_interests for select
  to authenticated
  using (investor_user_id = auth.uid());

drop policy if exists "Project owner can read interests for own project" on public.investment_interests;
create policy "Project owner can read interests for own project"
  on public.investment_interests for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = investment_interests.project_id
        and p.owner_id = auth.uid()
    )
  );
