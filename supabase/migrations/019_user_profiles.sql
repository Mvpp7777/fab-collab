-- Collab It - public user profiles (username, bio) + realtime publications.

alter table public.users add column if not exists username text unique;
alter table public.users add column if not exists bio text;

create index if not exists users_username_idx on public.users(username);

-- Allow anon to read display_name/username/bio for public profile lookups.
drop policy if exists "Public can read public profile columns" on public.users;
create policy "Public can read public profile columns"
  on public.users for select
  to anon, authenticated
  using (true);

-- Publish the tables that drive the editor's realtime experience.
-- Wrapped in DO blocks because ALTER PUBLICATION ... ADD TABLE errors on
-- duplicates and cannot use IF NOT EXISTS.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'content_snapshots'
  ) then
    alter publication supabase_realtime add table public.content_snapshots;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'relay_state'
  ) then
    alter publication supabase_realtime add table public.relay_state;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
