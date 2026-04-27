-- Collab It - service_role grants
-- Ensures the service_role (used by the admin client) has full privileges on
-- all tables in the public schema. Supabase normally does this via default
-- privileges, but tables created through raw-SQL migrations sometimes miss it.

grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- And make sure anon/authenticated keep their expected access too.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
