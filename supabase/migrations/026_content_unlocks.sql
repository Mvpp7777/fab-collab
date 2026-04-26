-- Fab Collab - "Unlock the Full Story" Stripe-backed paywall.

alter table public.projects
  add column if not exists unlock_price_cents integer not null default 300
    check (unlock_price_cents >= 0);

create table if not exists public.content_unlocks (
  id                        uuid primary key default gen_random_uuid(),
  project_id                uuid not null references public.projects(id) on delete cascade,
  email                     text,
  amount_cents              integer not null check (amount_cents >= 0),
  platform_fee_cents        integer not null default 0,
  stripe_payment_intent_id  text,
  stripe_session_id         text unique,
  unlock_token              text not null unique default encode(gen_random_bytes(24), 'hex'),
  status                    text not null default 'pending' check (status in ('pending','succeeded','failed')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists content_unlocks_project_idx on public.content_unlocks(project_id, created_at desc);
create index if not exists content_unlocks_token_idx on public.content_unlocks(unlock_token);

drop trigger if exists set_updated_at_content_unlocks on public.content_unlocks;
create trigger set_updated_at_content_unlocks
  before update on public.content_unlocks
  for each row execute function public.set_updated_at();

grant select, insert, update on public.content_unlocks to service_role;
grant select on public.content_unlocks to authenticated;
-- anon needs to be able to query the unlock by its token (after returning from Stripe).
grant select on public.content_unlocks to anon;

alter table public.content_unlocks enable row level security;

drop policy if exists "Anyone can verify an unlock token" on public.content_unlocks;
create policy "Anyone can verify an unlock token"
  on public.content_unlocks for select
  to anon, authenticated
  using (status = 'succeeded');

drop policy if exists "Owner can read unlocks for own project" on public.content_unlocks;
create policy "Owner can read unlocks for own project"
  on public.content_unlocks for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = content_unlocks.project_id
        and p.owner_id = auth.uid()
    )
  );
