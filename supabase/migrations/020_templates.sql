-- Fab Collab - project templates (private, community, official).

create table if not exists public.templates (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references public.users(id) on delete set null,
  title           text not null,
  project_type    public.project_type not null,
  sections_json   jsonb not null default '[]'::jsonb,
  is_public       boolean not null default false,
  is_official     boolean not null default false,
  use_count       integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists templates_is_public_idx on public.templates(is_public) where is_public = true;
create index if not exists templates_is_official_idx on public.templates(is_official) where is_official = true;
create index if not exists templates_owner_idx on public.templates(owner_id);

drop trigger if exists set_updated_at_templates on public.templates;
create trigger set_updated_at_templates
  before update on public.templates
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.templates to authenticated;
grant select, insert, update, delete on public.templates to service_role;
grant select on public.templates to anon;

alter table public.templates enable row level security;

-- Anyone can see public/official templates; owners can see their own.
drop policy if exists "Read public or official templates" on public.templates;
create policy "Read public or official templates"
  on public.templates for select
  to anon, authenticated
  using (is_public = true or is_official = true);

drop policy if exists "Owner can read own templates" on public.templates;
create policy "Owner can read own templates"
  on public.templates for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Owner can insert templates" on public.templates;
create policy "Owner can insert templates"
  on public.templates for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owner can update templates" on public.templates;
create policy "Owner can update templates"
  on public.templates for update
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Owner can delete templates" on public.templates;
create policy "Owner can delete templates"
  on public.templates for delete
  to authenticated
  using (owner_id = auth.uid());
