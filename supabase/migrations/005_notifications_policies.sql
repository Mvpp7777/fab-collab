-- Collab It - RLS policies for notifications
-- A user can read and update their own notifications.
-- Inserts happen server-side when a turn is passed — the inserter (the
-- passer) is not the recipient, so the INSERT policy is permissive for
-- any authenticated user, and RLS on SELECT scopes who can read.

create policy "User can select own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Any authenticated user can insert notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);

create policy "User can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "User can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);
