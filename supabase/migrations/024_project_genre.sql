-- Collab It - project genre metadata (mostly for songs/screenplays/novels).

alter table public.projects add column if not exists genre text;
create index if not exists projects_genre_idx on public.projects(genre) where genre is not null;
