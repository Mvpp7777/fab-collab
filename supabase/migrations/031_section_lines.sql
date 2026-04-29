-- Collab It - line-by-line contribution model.
-- Each row in content_snapshots can now represent a single contributed line.
-- Pre-existing rows (line_position is null) are treated as legacy "whole
-- section" snapshots and remain untouched.

alter table public.content_snapshots
  add column if not exists line_position integer;

create index if not exists content_snapshots_section_lines_idx
  on public.content_snapshots(section_id, line_position)
  where line_position is not null;
