-- Collab It - comments RLS policies.
-- Leverages public.is_project_member() from migration 008 to stay recursion-safe.

drop policy if exists "Collaborator can select comments" on public.comments;
drop policy if exists "Collaborator can insert comments" on public.comments;
drop policy if exists "Author can update own comment"    on public.comments;
drop policy if exists "Owner can update comments"        on public.comments;
drop policy if exists "Author or owner can delete comment" on public.comments;

-- Any collaborator of the project can read comments.
create policy "Collaborator can select comments"
  on public.comments for select
  using (
    exists (
      select 1 from public.sections s
      where s.id = comments.section_id
        and public.is_project_member(s.project_id, auth.uid())
    )
  );

-- Any collaborator of the project can post a comment.
create policy "Collaborator can insert comments"
  on public.comments for insert
  with check (
    exists (
      select 1 from public.sections s
      where s.id = section_id
        and public.is_project_member(s.project_id, auth.uid())
    )
    and user_id = auth.uid()
  );

-- A comment's author can edit their own comment body.
create policy "Author can update own comment"
  on public.comments for update
  using (user_id = auth.uid());

-- The project owner can also update (used to set resolved / resolved_by).
create policy "Owner can update comments"
  on public.comments for update
  using (
    exists (
      select 1
      from public.sections s
      join public.projects p on p.id = s.project_id
      where s.id = comments.section_id
        and p.owner_id = auth.uid()
    )
  );

-- Author can delete their own; owner can delete anyone's.
create policy "Author or owner can delete comment"
  on public.comments for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.sections s
      join public.projects p on p.id = s.project_id
      where s.id = comments.section_id
        and p.owner_id = auth.uid()
    )
  );
