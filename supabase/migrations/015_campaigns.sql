-- Fab Collab - influencer campaigns (no Stripe yet).
-- Campaigns wrap a project with scarcity (max collaborators), a reward, and
-- a public landing page + waitlist once full.

-- =============================================================================
-- campaigns
-- =============================================================================
create table if not exists public.campaigns (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  owner_id           uuid not null references public.users(id) on delete cascade,
  slug               text not null unique,
  title              text not null,
  description        text,
  reward             text,
  max_collaborators  integer not null check (max_collaborators > 0),
  spots_filled       integer not null default 0,
  end_date           timestamptz,
  status             text not null default 'open'
                     check (status in ('open', 'full', 'closed')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists campaigns_status_idx on public.campaigns(status);
create index if not exists campaigns_spots_idx on public.campaigns(spots_filled desc);

drop trigger if exists set_updated_at_campaigns on public.campaigns;
create trigger set_updated_at_campaigns
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- Auto-flip status to 'full' once spots_filled catches up to max.
create or replace function public.maybe_mark_campaign_full()
returns trigger
language plpgsql
as $$
begin
  if new.spots_filled >= new.max_collaborators and new.status = 'open' then
    new.status := 'full';
  end if;
  return new;
end;
$$;

drop trigger if exists campaign_fill_status on public.campaigns;
create trigger campaign_fill_status
  before update of spots_filled on public.campaigns
  for each row execute function public.maybe_mark_campaign_full();

grant select, insert, update, delete on public.campaigns to authenticated;
grant select, insert, update, delete on public.campaigns to service_role;
grant select on public.campaigns to anon;

alter table public.campaigns enable row level security;

-- Anyone (even anon) can read campaigns. Public by design — they're landing pages.
drop policy if exists "Anyone can select campaigns" on public.campaigns;
create policy "Anyone can select campaigns"
  on public.campaigns for select
  to anon, authenticated
  using (true);

drop policy if exists "Owner can insert campaigns" on public.campaigns;
create policy "Owner can insert campaigns"
  on public.campaigns for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owner can update campaigns" on public.campaigns;
create policy "Owner can update campaigns"
  on public.campaigns for update
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Owner can delete campaigns" on public.campaigns;
create policy "Owner can delete campaigns"
  on public.campaigns for delete
  to authenticated
  using (owner_id = auth.uid());

-- =============================================================================
-- campaign_participants
-- =============================================================================
create table if not exists public.campaign_participants (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references public.campaigns(id) on delete cascade,
  user_id             uuid not null references public.users(id) on delete cascade,
  joined_at           timestamptz not null default now(),
  contribution_status text not null default 'joined'
                      check (contribution_status in ('joined', 'writing', 'completed')),
  reward_recipient    boolean not null default false,
  unique (campaign_id, user_id)
);
create index if not exists campaign_participants_campaign_idx
  on public.campaign_participants(campaign_id, joined_at desc);
create index if not exists campaign_participants_user_idx
  on public.campaign_participants(user_id);

grant select, insert, update, delete on public.campaign_participants to authenticated;
grant select, insert, update, delete on public.campaign_participants to service_role;
grant select on public.campaign_participants to anon;

alter table public.campaign_participants enable row level security;

drop policy if exists "Anyone can select campaign participants" on public.campaign_participants;
create policy "Anyone can select campaign participants"
  on public.campaign_participants for select
  to anon, authenticated
  using (true);

drop policy if exists "Self can join campaign" on public.campaign_participants;
create policy "Self can join campaign"
  on public.campaign_participants for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Campaign owner can update participants" on public.campaign_participants;
create policy "Campaign owner can update participants"
  on public.campaign_participants for update
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_participants.campaign_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Self or owner can remove participant" on public.campaign_participants;
create policy "Self or owner can remove participant"
  on public.campaign_participants for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_participants.campaign_id
        and c.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- campaign_waitlist
-- =============================================================================
create table if not exists public.campaign_waitlist (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  email       text not null,
  name        text,
  joined_at   timestamptz not null default now(),
  notified_at timestamptz,
  claimed_at  timestamptz
);
create index if not exists campaign_waitlist_campaign_idx
  on public.campaign_waitlist(campaign_id, joined_at desc);
create index if not exists campaign_waitlist_email_idx
  on public.campaign_waitlist(email);

grant insert on public.campaign_waitlist to anon, authenticated;
grant select, insert, update, delete on public.campaign_waitlist to service_role;
grant select on public.campaign_waitlist to authenticated;

alter table public.campaign_waitlist enable row level security;

drop policy if exists "Anyone can submit to campaign waitlist" on public.campaign_waitlist;
create policy "Anyone can submit to campaign waitlist"
  on public.campaign_waitlist for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Owner can read campaign waitlist" on public.campaign_waitlist;
create policy "Owner can read campaign waitlist"
  on public.campaign_waitlist for select
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_waitlist.campaign_id
        and c.owner_id = auth.uid()
    )
  );
