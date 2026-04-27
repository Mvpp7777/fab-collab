-- Collab It - project analytics helpers.

create table if not exists public.feedback_page_views (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  token       text,
  viewed_at   timestamptz not null default now()
);
create index if not exists feedback_page_views_project_idx
  on public.feedback_page_views(project_id, viewed_at desc);

grant insert on public.feedback_page_views to anon, authenticated;
grant select, insert, update, delete on public.feedback_page_views to service_role;

alter table public.feedback_page_views enable row level security;

drop policy if exists "Anyone can log a feedback view" on public.feedback_page_views;
create policy "Anyone can log a feedback view"
  on public.feedback_page_views for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Owner can read views for own project" on public.feedback_page_views;
create policy "Owner can read views for own project"
  on public.feedback_page_views for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = feedback_page_views.project_id
        and p.owner_id = auth.uid()
    )
  );

-- AI usage tracking — one row per assist call.
create table if not exists public.ai_assist_usage (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete set null,
  user_id     uuid references public.users(id) on delete set null,
  assist_type text not null,
  created_at  timestamptz not null default now()
);
create index if not exists ai_assist_usage_project_idx on public.ai_assist_usage(project_id, created_at desc);

grant insert on public.ai_assist_usage to authenticated;
grant select, insert, update, delete on public.ai_assist_usage to service_role;

alter table public.ai_assist_usage enable row level security;

drop policy if exists "User can log own AI usage" on public.ai_assist_usage;
create policy "User can log own AI usage"
  on public.ai_assist_usage for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Owner can read AI usage for own project" on public.ai_assist_usage;
create policy "Owner can read AI usage for own project"
  on public.ai_assist_usage for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = ai_assist_usage.project_id
        and p.owner_id = auth.uid()
    )
  );
