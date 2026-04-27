-- Collab It - collaborator-scoped access (recursion-safe rewrite).
-- Earlier version had projects <-> collaborators policy recursion; this fixes
-- it by routing the membership check through a SECURITY DEFINER function so
-- the subquery bypasses RLS and never re-enters the projects policy.

-- -----------------------------------------------------------------------------
-- Clean up any partial artifacts from a failed previous run of this migration.
-- All drops use IF EXISTS so this remains idempotent.
-- -----------------------------------------------------------------------------
drop policy if exists "Collaborator can select projects"   on public.projects;
drop policy if exists "Collaborator can select sections"   on public.sections;
drop policy if exists "Collaborator can insert sections"   on public.sections;
drop policy if exists "Collaborator can update sections"   on public.sections;
drop policy if exists "Collaborator can select snapshots"  on public.content_snapshots;
drop policy if exists "Collaborator can insert snapshots"  on public.content_snapshots;

drop function if exists public.is_project_member(uuid, uuid);

-- -----------------------------------------------------------------------------
-- Membership check as SECURITY DEFINER. Runs as the function owner (postgres
-- in Supabase), which has BYPASSRLS, so the inner SELECT does not re-enter
-- RLS evaluation and cannot cause recursion.
-- -----------------------------------------------------------------------------
create function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.collaborators
    where project_id = p_project_id and user_id = p_user_id
  );
$$;

revoke all on function public.is_project_member(uuid, uuid) from public;
grant execute on function public.is_project_member(uuid, uuid)
  to anon, authenticated, service_role;

-- =============================================================================
-- projects: collaborators can read projects they belong to.
-- =============================================================================
create policy "Collaborator can select projects"
  on public.projects for select
  using (public.is_project_member(id, auth.uid()));

-- =============================================================================
-- sections: collaborators can select/insert/update sections of their projects.
-- Delete stays owner-only.
-- =============================================================================
create policy "Collaborator can select sections"
  on public.sections for select
  using (public.is_project_member(project_id, auth.uid()));

create policy "Collaborator can insert sections"
  on public.sections for insert
  with check (public.is_project_member(project_id, auth.uid()));

create policy "Collaborator can update sections"
  on public.sections for update
  using (public.is_project_member(project_id, auth.uid()));

-- =============================================================================
-- content_snapshots: collaborators can read/write snapshots for their projects.
-- Pulls project_id through sections, but the is_project_member call itself is
-- RLS-safe, so the overall path is still cycle-free.
-- =============================================================================
create policy "Collaborator can select snapshots"
  on public.content_snapshots for select
  using (
    exists (
      select 1 from public.sections s
      where s.id = content_snapshots.section_id
        and public.is_project_member(s.project_id, auth.uid())
    )
  );

create policy "Collaborator can insert snapshots"
  on public.content_snapshots for insert
  with check (
    exists (
      select 1 from public.sections s
      where s.id = content_snapshots.section_id
        and public.is_project_member(s.project_id, auth.uid())
    )
  );
