"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AcceptResult = { ok: true; projectId: string } | { error: string };

export async function acceptInvitation(params: {
  token: string;
}): Promise<AcceptResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to accept this invitation." };

  // Token itself is the authorization — use admin client for the lookup.
  const admin = createAdminClient();

  const { data: invitation, error: inviteErr } = await admin
    .from("invitations")
    .select("id, project_id, email, role, accepted_at, expires_at")
    .eq("token", params.token)
    .maybeSingle();
  if (inviteErr) return { error: inviteErr.message };
  if (!invitation) return { error: "Invitation not found or already used." };
  if (invitation.accepted_at) {
    return { error: "This invitation has already been accepted." };
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return { error: "This invitation has expired." };
  }

  // Ensure the accepting user has a profile row so the FK holds.
  await admin.from("users").upsert(
    {
      id: user.id,
      display_name:
        (user.user_metadata?.display_name as string | undefined) ?? null,
    },
    { onConflict: "id" },
  );

  // Next turn_order = max + 1 across this project.
  const { data: existing } = await admin
    .from("collaborators")
    .select("turn_order")
    .eq("project_id", invitation.project_id)
    .order("turn_order", { ascending: false, nullsFirst: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.turn_order ?? 0) + 1;

  // Idempotent: unique(project_id, user_id) guards re-accepts.
  const { error: collabErr } = await admin.from("collaborators").insert({
    project_id: invitation.project_id,
    user_id: user.id,
    role: invitation.role,
    turn_order: nextOrder,
    invited_by: null,
  });
  if (collabErr && !collabErr.message.toLowerCase().includes("duplicate")) {
    return { error: `Collaborator: ${collabErr.message}` };
  }

  await admin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  // Defensive: confirm the target project actually exists before telling the
  // client to redirect. Admin client bypasses RLS so this is purely an
  // existence check, not a permission check.
  const { data: projectRow } = await admin
    .from("projects")
    .select("id")
    .eq("id", invitation.project_id)
    .maybeSingle();
  if (!projectRow) {
    return { error: "Project not found — it may have been deleted." };
  }

  return { ok: true, projectId: projectRow.id };
}

export async function acceptAndRedirect(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const result = await acceptInvitation({ token });
  if ("error" in result) {
    redirect(`/invite/${token}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/projects/${result.projectId}`);
}
