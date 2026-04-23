-- Fab Collab - distribution click tracking.
-- Records when a user clicks a "Distribute" CTA to an external partner
-- (DistroKid first). Used to measure intent for partnership deals.

create table if not exists public.distribution_clicks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete set null,
  project_id  uuid references public.projects(id) on delete set null,
  destination text not null,
  created_at  timestamptz not null default now()
);

grant insert on public.distribution_clicks to authenticated;
grant select, insert, update, delete on public.distribution_clicks to service_role;

alter table public.distribution_clicks enable row level security;

drop policy if exists "Collaborator can log their own distribution click" on public.distribution_clicks;
create policy "Collaborator can log their own distribution click"
  on public.distribution_clicks for insert
  to authenticated
  with check (user_id = auth.uid());

create index if not exists distribution_clicks_destination_idx
  on public.distribution_clicks(destination, created_at desc);
create index if not exists distribution_clicks_user_id_idx
  on public.distribution_clicks(user_id);
