"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UpdateProfileResult = { ok: true; username: string } | { error: string };

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export async function updateProfile(
  _prev: UpdateProfileResult | null,
  formData: FormData,
): Promise<UpdateProfileResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const displayName = String(formData.get("display_name") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "");
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 160);
  const digestEnabled =
    String(formData.get("email_digest_enabled") ?? "off") === "on";

  const username = normalizeUsername(usernameRaw);
  if (!username || username.length < 2) {
    return { error: "Username must be at least 2 characters (a-z, 0-9, _)." };
  }
  if (username.length > 32) {
    return { error: "Username must be 32 characters or fewer." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existing && existing.id !== user.id) {
    return { error: "That username is taken." };
  }

  const { error } = await admin.from("users").upsert(
    {
      id: user.id,
      display_name: displayName || null,
      username,
      bio: bio || null,
      email_digest_enabled: digestEnabled,
    },
    { onConflict: "id" },
  );
  if (error) return { error: error.message };

  redirect(`/profile/${username}`);
}
