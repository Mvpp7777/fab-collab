"use server";

import { createClient } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  type: string;
  project_id: string | null;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export type NotificationsResult =
  | { ok: true; items: NotificationRow[]; unread: number }
  | { error: string };

export async function getNotifications(
  limit: number = 20,
): Promise<NotificationsResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, project_id, body, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { error: error.message };

  const items = (data ?? []) as NotificationRow[];
  const unread = items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
  return { ok: true, items, unread };
}

export async function getUnreadCount(): Promise<number> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);
  return count ?? 0;
}

export async function markNotificationRead(params: {
  id: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", params.id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<
  { ok: true } | { error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) return { error: error.message };
  return { ok: true };
}
