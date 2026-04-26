-- Fab Collab - verified investor flag on user profiles.

alter table public.users
  add column if not exists is_verified_investor boolean not null default false;

alter table public.users
  add column if not exists investor_company text;

alter table public.users
  add column if not exists investor_verified_at timestamptz;

create index if not exists users_verified_investor_idx
  on public.users(investor_verified_at desc) where is_verified_investor = true;
