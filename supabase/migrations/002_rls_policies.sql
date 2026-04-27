-- Collab It - minimal RLS policies for project creation
-- Scope: owner can CRUD their own profile, projects, and sections of those projects.
-- Wider policies (collaborators, invitations, comments, etc.) come in a later migration.

-- -----------------------------------------------------------------------------
-- users: own profile
-- -----------------------------------------------------------------------------
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- projects: owner full access
-- -----------------------------------------------------------------------------
create policy "Owner can select projects"
  on public.projects for select
  using (auth.uid() = owner_id);

create policy "Owner can insert projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Owner can update projects"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "Owner can delete projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- -----------------------------------------------------------------------------
-- sections: access follows project ownership
-- -----------------------------------------------------------------------------
create policy "Owner can select sections"
  on public.sections for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = sections.project_id and p.owner_id = auth.uid()
    )
  );

create policy "Owner can insert sections"
  on public.sections for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = sections.project_id and p.owner_id = auth.uid()
    )
  );

create policy "Owner can update sections"
  on public.sections for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = sections.project_id and p.owner_id = auth.uid()
    )
  );

create policy "Owner can delete sections"
  on public.sections for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = sections.project_id and p.owner_id = auth.uid()
    )
  );
