-- Collab It - RLS policies for content_snapshots
-- Snapshots are readable/writable by the owner of the parent project.

create policy "Owner can select snapshots"
  on public.content_snapshots for select
  using (
    exists (
      select 1
      from public.sections s
      join public.projects p on p.id = s.project_id
      where s.id = content_snapshots.section_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owner can insert snapshots"
  on public.content_snapshots for insert
  with check (
    exists (
      select 1
      from public.sections s
      join public.projects p on p.id = s.project_id
      where s.id = content_snapshots.section_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owner can update snapshots"
  on public.content_snapshots for update
  using (
    exists (
      select 1
      from public.sections s
      join public.projects p on p.id = s.project_id
      where s.id = content_snapshots.section_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owner can delete snapshots"
  on public.content_snapshots for delete
  using (
    exists (
      select 1
      from public.sections s
      join public.projects p on p.id = s.project_id
      where s.id = content_snapshots.section_id
        and p.owner_id = auth.uid()
    )
  );
