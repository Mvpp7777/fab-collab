-- Collab It - Think Tank & Innovation project types.
-- Extends public.project_type enum. Idempotent via IF NOT EXISTS.

alter type public.project_type add value if not exists 'think_tank';
alter type public.project_type add value if not exists 'community_challenge';
alter type public.project_type add value if not exists 'research_collective';
alter type public.project_type add value if not exists 'innovation_sprint';
