-- Collab It - achievement badges.

create table if not exists public.user_badges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  badge_id   text not null,
  earned_at  timestamptz not null default now(),
  unique (user_id, badge_id)
);
create index if not exists user_badges_user_idx on public.user_badges(user_id);

grant select, insert, delete on public.user_badges to authenticated;
grant select, insert, update, delete on public.user_badges to service_role;
grant select on public.user_badges to anon;

alter table public.user_badges enable row level security;

drop policy if exists "Public can read user badges" on public.user_badges;
create policy "Public can read user badges"
  on public.user_badges for select
  to anon, authenticated
  using (true);

drop policy if exists "Self or service can award badges" on public.user_badges;
create policy "Self or service can award badges"
  on public.user_badges for insert
  to authenticated
  with check (user_id = auth.uid());
