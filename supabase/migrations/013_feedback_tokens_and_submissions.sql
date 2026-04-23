-- Fab Collab - public feedback link (token) + submissions table.

-- Add a per-project feedback token (null until the owner generates one).
alter table public.projects
  add column if not exists feedback_token text;

-- Unique index so the token is lookup-able; filtered so nulls don't collide.
create unique index if not exists projects_feedback_token_idx
  on public.projects(feedback_token)
  where feedback_token is not null;

-- =============================================================================
-- feedback_submissions: public submissions addressed to a specific project
-- =============================================================================
create table if not exists public.feedback_submissions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text,
  email       text,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- Grants (migration 003's blanket grant doesn't cover later-added tables).
grant insert on public.feedback_submissions to anon, authenticated;
grant select on public.feedback_submissions to authenticated;
grant select, insert, update, delete on public.feedback_submissions to service_role;

alter table public.feedback_submissions enable row level security;

drop policy if exists "Anyone can submit feedback" on public.feedback_submissions;
create policy "Anyone can submit feedback"
  on public.feedback_submissions for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Owner can read feedback for their project" on public.feedback_submissions;
create policy "Owner can read feedback for their project"
  on public.feedback_submissions for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = feedback_submissions.project_id
        and p.owner_id = auth.uid()
    )
  );

create index if not exists feedback_submissions_project_id_idx
  on public.feedback_submissions(project_id, created_at desc);
