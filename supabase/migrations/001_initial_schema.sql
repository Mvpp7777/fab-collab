-- Fab Collab - initial schema
-- Creates core tables for users, projects, collaboration, content, and notifications.
-- RLS is enabled on every table; policies are intentionally left for a later migration.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.plan_tier as enum ('free', 'pro', 'studio');
create type public.project_type as enum (
  'song', 'screenplay', 'novel', 'poetry', 'podcast',
  'standup', 'game', 'ad', 'freeform'
);
create type public.collab_mode as enum ('relay', 'live');
create type public.project_status as enum ('active', 'completed', 'archived');
create type public.collab_role as enum ('editor', 'commenter', 'viewer');
create type public.section_type as enum (
  'verse', 'chorus', 'bridge', 'scene', 'act', 'chapter', 'stanza', 'custom'
);
create type public.action_type as enum (
  'insert', 'delete', 'replace', 'ai_suggest', 'ai_accept'
);

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- users  (profile extension of auth.users)
-- -----------------------------------------------------------------------------
create table public.users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  display_name        text,
  username            text unique,
  avatar_url          text,
  bio                 text,
  plan                public.plan_tier not null default 'free',
  ai_credits          integer not null default 50,
  stripe_customer_id  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table public.projects (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references public.users(id) on delete cascade,
  title                text not null,
  project_type         public.project_type not null default 'freeform',
  collab_mode          public.collab_mode not null default 'relay',
  status               public.project_status not null default 'active',
  description          text,
  genre                text,
  is_public            boolean not null default false,
  share_token          text unique default encode(gen_random_bytes(16), 'hex'),
  ai_assist_enabled    boolean not null default true,
  turn_timer_minutes   integer,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index projects_owner_id_idx on public.projects(owner_id);
create index projects_status_idx on public.projects(status);

-- -----------------------------------------------------------------------------
-- collaborators
-- -----------------------------------------------------------------------------
create table public.collaborators (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  role         public.collab_role not null default 'editor',
  turn_order   integer,
  color        text,
  joined_at    timestamptz not null default now(),
  invited_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, user_id)
);
create index collaborators_user_id_idx on public.collaborators(user_id);

-- -----------------------------------------------------------------------------
-- sections
-- -----------------------------------------------------------------------------
create table public.sections (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  title          text,
  section_type   public.section_type not null default 'custom',
  position       integer not null default 0,
  owner_id       uuid references public.users(id) on delete set null,
  is_locked      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index sections_project_id_idx on public.sections(project_id);

-- -----------------------------------------------------------------------------
-- content_snapshots
-- -----------------------------------------------------------------------------
create table public.content_snapshots (
  id             uuid primary key default gen_random_uuid(),
  section_id     uuid not null references public.sections(id) on delete cascade,
  content_text   text not null default '',
  saved_by       uuid references public.users(id) on delete set null,
  is_autosave    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index content_snapshots_section_id_idx on public.content_snapshots(section_id);

-- -----------------------------------------------------------------------------
-- contributions
-- -----------------------------------------------------------------------------
create table public.contributions (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid not null references public.sections(id) on delete cascade,
  user_id       uuid references public.users(id) on delete set null,
  char_delta    integer not null default 0,
  word_delta    integer not null default 0,
  action_type   public.action_type not null,
  ai_assisted   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index contributions_section_id_idx on public.contributions(section_id);
create index contributions_user_id_idx on public.contributions(user_id);

-- -----------------------------------------------------------------------------
-- comments
-- -----------------------------------------------------------------------------
create table public.comments (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid not null references public.sections(id) on delete cascade,
  user_id       uuid references public.users(id) on delete set null,
  parent_id     uuid references public.comments(id) on delete cascade,
  body          text not null,
  resolved      boolean not null default false,
  resolved_by   uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index comments_section_id_idx on public.comments(section_id);

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  type         text not null,
  project_id   uuid references public.projects(id) on delete cascade,
  body         text,
  link         text,
  read         boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index notifications_user_id_read_idx on public.notifications(user_id, read);

-- -----------------------------------------------------------------------------
-- invitations
-- -----------------------------------------------------------------------------
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  invited_by   uuid references public.users(id) on delete set null,
  email        text not null,
  role         public.collab_role not null default 'editor',
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index invitations_project_id_idx on public.invitations(project_id);
create index invitations_email_idx on public.invitations(email);

-- -----------------------------------------------------------------------------
-- updated_at triggers (one per table)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'projects', 'collaborators', 'sections',
    'content_snapshots', 'contributions', 'comments',
    'notifications', 'invitations'
  ]
  loop
    execute format(
      'create trigger set_updated_at_%1$I
         before update on public.%1$I
         for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Row Level Security (policies added in a later migration)
-- -----------------------------------------------------------------------------
alter table public.users             enable row level security;
alter table public.projects          enable row level security;
alter table public.collaborators     enable row level security;
alter table public.sections          enable row level security;
alter table public.content_snapshots enable row level security;
alter table public.contributions     enable row level security;
alter table public.comments          enable row level security;
alter table public.notifications     enable row level security;
alter table public.invitations       enable row level security;
