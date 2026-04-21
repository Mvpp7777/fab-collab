-- Fab Collab - relay_state table + collaborator color backfill.
-- Tracks who currently holds the turn on each project; colors are assigned
-- from a 5-item palette cycling on turn_order.

-- =============================================================================
-- relay_state table
-- =============================================================================
create table if not exists public.relay_state (
  project_id     uuid primary key references public.projects(id) on delete cascade,
  current_holder uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- updated_at trigger (reuses helper from migration 001)
drop trigger if exists set_updated_at_relay_state on public.relay_state;
create trigger set_updated_at_relay_state
  before update on public.relay_state
  for each row execute function public.set_updated_at();

-- grants (migration 003 used `all tables in schema` which doesn't pick up
-- tables created later; re-grant explicitly)
grant select, insert, update, delete on public.relay_state to authenticated;
grant select, insert, update, delete on public.relay_state to service_role;
grant select on public.relay_state to anon;

-- RLS
alter table public.relay_state enable row level security;

drop policy if exists "Collaborator can select relay_state" on public.relay_state;
drop policy if exists "Owner can insert relay_state"        on public.relay_state;
drop policy if exists "Collaborator can update relay_state" on public.relay_state;

create policy "Collaborator can select relay_state"
  on public.relay_state for select
  using (public.is_project_member(project_id, auth.uid()));

create policy "Owner can insert relay_state"
  on public.relay_state for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "Collaborator can update relay_state"
  on public.relay_state for update
  using (public.is_project_member(project_id, auth.uid()));

-- =============================================================================
-- Backfill: seed relay_state for every existing project (owner holds turn)
-- =============================================================================
insert into public.relay_state (project_id, current_holder)
select p.id, p.owner_id
from public.projects p
where not exists (
  select 1 from public.relay_state r where r.project_id = p.id
);

-- =============================================================================
-- Backfill: assign palette colors to any collaborator row that doesn't have one
-- =============================================================================
update public.collaborators c
set color = (array['#0BBFBF', '#FF6B47', '#FFB347', '#7F77DD', '#1D9E75'])[
  1 + ((coalesce(c.turn_order, 1) - 1) % 5)
]
where c.color is null or c.color = '';
