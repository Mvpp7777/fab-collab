-- Fab Collab - completion timestamp + public gallery visibility.
-- PRIVACY: projects.is_public remains default FALSE. Public visibility is
-- strictly opt-in per-project, only togglable by the owner, only while
-- the project is marked completed.

-- -----------------------------------------------------------------------------
-- Add completed_at timestamp to projects (null until marked complete).
-- -----------------------------------------------------------------------------
alter table public.projects
  add column if not exists completed_at timestamptz;

-- Re-assert the safe default. Existing rows remain whatever they were; new
-- inserts default to FALSE. (Redundant with migration 001 but defensive.)
alter table public.projects
  alter column is_public set default false;

-- -----------------------------------------------------------------------------
-- Public read policy for the discover page: anyone (including anon) can
-- SELECT only completed, public projects. No unpublished content leaks.
-- -----------------------------------------------------------------------------
drop policy if exists "Public gallery can select completed public projects" on public.projects;
create policy "Public gallery can select completed public projects"
  on public.projects for select
  to anon, authenticated
  using (is_public = true and status = 'completed');

-- Collaborators of public completed projects are publicly readable (for
-- the attribution strip on gallery cards and on the read-only view). Still
-- scoped by (is_public, completed) via a join — no private project leaks.
drop policy if exists "Public gallery can select collaborators of public completed projects" on public.collaborators;
create policy "Public gallery can select collaborators of public completed projects"
  on public.collaborators for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = collaborators.project_id
        and p.is_public = true
        and p.status = 'completed'
    )
  );

-- Sections of public completed projects are publicly readable (so the
-- /discover/[id] read-only view can render content).
drop policy if exists "Public gallery can select sections of public completed projects" on public.sections;
create policy "Public gallery can select sections of public completed projects"
  on public.sections for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = sections.project_id
        and p.is_public = true
        and p.status = 'completed'
    )
  );

-- Latest content snapshot of each section is also publicly readable for
-- public completed projects. Same join gate.
drop policy if exists "Public gallery can select snapshots of public completed projects" on public.content_snapshots;
create policy "Public gallery can select snapshots of public completed projects"
  on public.content_snapshots for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.sections s
      join public.projects p on p.id = s.project_id
      where s.id = content_snapshots.section_id
        and p.is_public = true
        and p.status = 'completed'
    )
  );

-- Read access to users.display_name for the attribution strip on public
-- projects. This is intentionally narrower than a blanket public users read.
drop policy if exists "Public gallery can read display_name of public contributors" on public.users;
create policy "Public gallery can read display_name of public contributors"
  on public.users for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.collaborators c
      join public.projects p on p.id = c.project_id
      where c.user_id = users.id
        and p.is_public = true
        and p.status = 'completed'
    )
  );
