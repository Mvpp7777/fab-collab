-- Collab It - tips table for "Tip a Creator" Stripe-backed feature.

create table if not exists public.tips (
  id                        uuid primary key default gen_random_uuid(),
  project_id                uuid not null references public.projects(id) on delete cascade,
  tipper_name               text,
  tipper_email              text,
  amount_cents              integer not null check (amount_cents > 0),
  platform_fee_cents        integer not null default 0,
  stripe_payment_intent_id  text,
  stripe_session_id         text unique,
  status                    text not null default 'pending' check (status in ('pending','succeeded','failed')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists tips_project_idx on public.tips(project_id, created_at desc);
create index if not exists tips_status_idx on public.tips(status);

drop trigger if exists set_updated_at_tips on public.tips;
create trigger set_updated_at_tips
  before update on public.tips
  for each row execute function public.set_updated_at();

grant select, insert, update on public.tips to service_role;
grant select on public.tips to authenticated;

alter table public.tips enable row level security;

drop policy if exists "Owner can read tips for own project" on public.tips;
create policy "Owner can read tips for own project"
  on public.tips for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = tips.project_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Collaborator can read tips for project" on public.tips;
create policy "Collaborator can read tips for project"
  on public.tips for select
  to authenticated
  using (
    exists (
      select 1 from public.collaborators c
      where c.project_id = tips.project_id
        and c.user_id = auth.uid()
    )
  );
