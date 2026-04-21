-- Fab Collab - invitations + collaborators RLS, owner backfill.

-- =============================================================================
-- collaborators policies
-- =============================================================================
create policy "Owner can select project collaborators"
  on public.collaborators for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = collaborators.project_id and p.owner_id = auth.uid()
    )
  );

create policy "Collaborator can see own membership"
  on public.collaborators for select
  using (auth.uid() = user_id);

create policy "Owner can insert collaborators"
  on public.collaborators for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "Owner can update collaborators"
  on public.collaborators for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = collaborators.project_id and p.owner_id = auth.uid()
    )
  );

create policy "Owner can delete collaborators"
  on public.collaborators for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = collaborators.project_id and p.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- invitations policies (owner-scoped; token lookup uses admin client)
-- =============================================================================
create policy "Owner can select invitations"
  on public.invitations for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = invitations.project_id and p.owner_id = auth.uid()
    )
  );

create policy "Owner can insert invitations"
  on public.invitations for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "Owner can update invitations"
  on public.invitations for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = invitations.project_id and p.owner_id = auth.uid()
    )
  );

create policy "Owner can delete invitations"
  on public.invitations for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = invitations.project_id and p.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- Backfill: every existing project owner gets a collaborators row (turn_order=1).
-- =============================================================================
insert into public.collaborators (project_id, user_id, role, turn_order, invited_by)
select p.id, p.owner_id, 'editor'::public.collab_role, 1, p.owner_id
from public.projects p
where not exists (
  select 1 from public.collaborators c
  where c.project_id = p.id and c.user_id = p.owner_id
);
