-- Fab Collab - expert applications (Think Tank marketplace waitlist).
-- Anyone can submit; only service_role can read.

create table if not exists public.expert_applications (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  linkedin_url        text,
  title               text,
  company             text,
  category            text,
  years_experience    text,
  achievements        text,
  contribution_rate   text,
  open_to_investing   boolean,
  email               text not null,
  status              text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  created_at          timestamptz not null default now()
);

grant insert on public.expert_applications to anon, authenticated;
grant select, insert, update, delete on public.expert_applications to service_role;

alter table public.expert_applications enable row level security;

drop policy if exists "Anyone can submit expert application" on public.expert_applications;
create policy "Anyone can submit expert application"
  on public.expert_applications for insert
  to anon, authenticated
  with check (true);

create index if not exists expert_applications_created_at_idx
  on public.expert_applications(created_at desc);
create index if not exists expert_applications_email_idx
  on public.expert_applications(email);
