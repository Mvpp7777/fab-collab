-- Fab Collab - per-user email preferences.

alter table public.users
  add column if not exists email_digest_enabled boolean not null default true;
