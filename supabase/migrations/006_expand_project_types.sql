-- Fab Collab - expand project_type enum
-- Adds professional/work project categories alongside the existing creative ones.
-- ALTER TYPE ... ADD VALUE is idempotent with IF NOT EXISTS.

alter type public.project_type add value if not exists 'construction';
alter type public.project_type add value if not exists 'home_renovation';
alter type public.project_type add value if not exists 'business_plan';
alter type public.project_type add value if not exists 'marketing_campaign';
alter type public.project_type add value if not exists 'legal_document';
alter type public.project_type add value if not exists 'research_project';
alter type public.project_type add value if not exists 'event_planning';
alter type public.project_type add value if not exists 'product_roadmap';
alter type public.project_type add value if not exists 'meeting_agenda';
alter type public.project_type add value if not exists 'proposal';
