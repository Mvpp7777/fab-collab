-- Collab It - per-project license selection for the public gallery.
-- Default "All Rights Reserved"; owner can change via the completion modal.

alter table public.projects
  add column if not exists license text not null default 'all-rights-reserved';

-- Normalize any null rows that somehow exist.
update public.projects set license = 'all-rights-reserved' where license is null;
