-- Fab Collab - industry waitlist (Scout tier signup).
-- Anyone can submit (anonymous public form). Only service-role can read.

create table if not exists public.industry_waitlist (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  company     text,
  role        text,
  looking_for text,
  email       text not null,
  created_at  timestamptz not null default now()
);

-- Grants: migration 003's blanket grant doesn't apply to later-added tables.
grant insert on public.industry_waitlist to anon, authenticated;
grant select, insert, update, delete on public.industry_waitlist to service_role;

alter table public.industry_waitlist enable row level security;

-- Anyone (signed-in or not) can add themselves to the waitlist.
drop policy if exists "Anyone can submit to industry waitlist" on public.industry_waitlist;
create policy "Anyone can submit to industry waitlist"
  on public.industry_waitlist for insert
  to anon, authenticated
  with check (true);

-- No SELECT policy -> only the service_role (admin) can read the list.

create index if not exists industry_waitlist_created_at_idx
  on public.industry_waitlist(created_at desc);
create index if not exists industry_waitlist_email_idx
  on public.industry_waitlist(email);
