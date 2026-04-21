-- Fab Collab - collaborator-scoped access to projects, sections, snapshots.
-- Without these, an accepted invitee can't read the project they just joined,
-- which shows up as a 404 immediately after accepting the invitation.

-- =============================================================================
-- projects: a collaborator can read the projects they belong to.
-- =============================================================================
create policy "Collaborator can select projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.collaborators c
      where c.project_id = projects.id and c.user_id = auth.uid()
    )
  );

-- =============================================================================
-- sections: collaborators can select/insert/update sections of their projects.
-- (Delete stays owner-only.)
-- =============================================================================
create policy "Collaborator can select sections"
  on public.sections for select
  using (
    exists (
      select 1 from public.collaborators c
      where c.project_id = sections.project_id and c.user_id = auth.uid()
    )
  );

create policy "Collaborator can insert sections"
  on public.sections for insert
  with check (
    exists (
      select 1 from public.collaborators c
      where c.project_id = sections.project_id and c.user_id = auth.uid()
    )
  );

create policy "Collaborator can update sections"
  on public.sections for update
  using (
    exists (
      select 1 from public.collaborators c
      where c.project_id = sections.project_id and c.user_id = auth.uid()
    )
  );

-- =============================================================================
-- content_snapshots: collaborators can read/write snapshots for their projects.
-- =============================================================================
create policy "Collaborator can select snapshots"
  on public.content_snapshots for select
  using (
    exists (
      select 1
      from public.sections s
      join public.collaborators c on c.project_id = s.project_id
      where s.id = content_snapshots.section_id and c.user_id = auth.uid()
    )
  );

create policy "Collaborator can insert snapshots"
  on public.content_snapshots for insert
  with check (
    exists (
      select 1
      from public.sections s
      join public.collaborators c on c.project_id = s.project_id
      where s.id = content_snapshots.section_id and c.user_id = auth.uid()
    )
  );
