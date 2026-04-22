"use server";

import Anthropic from "@anthropic-ai/sdk";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInviteEmail, sendTurnEmail } from "@/lib/resend";

export type AssistType = "suggest-line" | "rhyme" | "rewrite" | "unblock";

const SYSTEM_PROMPTS: Record<AssistType, string> = {
  "suggest-line":
    "You are a creative writing assistant. Suggest the next line that naturally follows the existing text. Match the tone, style and rhythm exactly. Return exactly 3 options numbered 1-3, one per line, no explanation.",
  rhyme:
    "Return rhymes for the last word in the text provided. Format: Perfect: word1, word2 / Near: word1, word2 / Slant: word1, word2",
  rewrite:
    "Rewrite the provided text to be more vivid and compelling while keeping the same meaning. Return only the rewritten text.",
  unblock:
    "The writer is stuck. Read the text and suggest 3 creative directions it could go next. One sentence each, numbered 1-3.",
};

export type AiAssistResult = { text: string } | { error: string };

export async function aiAssist(params: {
  sectionText: string;
  projectType: string;
  assistType: AssistType;
}): Promise<AiAssistResult> {
  const { sectionText, projectType, assistType } = params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY is not set in .env.local." };
  }
  if (!SYSTEM_PROMPTS[assistType]) {
    return { error: `Unknown assistType: ${assistType}` };
  }
  if (!sectionText.trim()) {
    return { error: "Write something first — AI needs text to work with." };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPTS[assistType],
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Project type: ${projectType}\n\nText:\n${sectionText}`,
        },
      ],
    });

    const text = msg.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return { text };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Anthropic API error" };
  }
}

export type SaveSectionResult = { ok: true } | { error: string };

export async function saveSection(params: {
  sectionId: string;
  content: string;
}): Promise<SaveSectionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("content_snapshots").insert({
    section_id: params.sectionId,
    content_text: params.content,
    saved_by: user.id,
    is_autosave: true,
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export type PassTurnResult =
  | { ok: true; nextName: string | null }
  | { error: string };

export async function passTurn(params: {
  projectId: string;
}): Promise<PassTurnResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, title, owner_id")
    .eq("id", params.projectId)
    .maybeSingle();
  if (projectErr || !project) {
    return { error: projectErr?.message ?? "Project not found" };
  }

  // Gate: only the current turn holder may pass.
  const { data: state } = await supabase
    .from("relay_state")
    .select("current_holder")
    .eq("project_id", project.id)
    .maybeSingle();
  if (!state) {
    return {
      error: "Relay state missing for this project. Run migration 009.",
    };
  }
  if (state.current_holder !== user.id) {
    return { error: "It's not your turn." };
  }

  const { data: collaborators } = await supabase
    .from("collaborators")
    .select("user_id, turn_order, users(display_name)")
    .eq("project_id", project.id)
    .not("turn_order", "is", null)
    .order("turn_order", { ascending: true });

  // Single-user path: no one to pass to — keep same holder, return no-op success.
  if (!collaborators || collaborators.length < 2) {
    return { ok: true, nextName: null };
  }

  const currentIdx = collaborators.findIndex((c) => c.user_id === user.id);
  const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % collaborators.length;
  const next = collaborators[nextIdx];
  const usersRel = next.users as
    | { display_name: string | null }
    | { display_name: string | null }[]
    | null;
  const userRow = Array.isArray(usersRel) ? usersRel[0] : usersRel;
  const nextName = userRow?.display_name ?? "your collaborator";

  // Advance relay_state to the next holder.
  const { error: updateErr } = await supabase
    .from("relay_state")
    .update({ current_holder: next.user_id })
    .eq("project_id", project.id);
  if (updateErr) return { error: `Relay update: ${updateErr.message}` };

  await supabase.from("notifications").insert({
    user_id: next.user_id,
    type: "turn_passed",
    project_id: project.id,
    body: `Your turn on ${project.title}`,
    link: `/projects/${project.id}`,
    read: false,
  });

  // Fire-and-forget email via Resend. Admin client bypasses RLS to look up
  // the next collaborator's email; the passer (current user) provides the
  // display name shown in the message body.
  const passerName =
    ((user.user_metadata?.display_name as string | undefined) ?? "").trim() ||
    user.email ||
    "A collaborator";
  void sendTurnEmailSafe({
    nextUserId: next.user_id,
    projectTitle: project.title,
    projectUrl: `${getOrigin()}/projects/${project.id}`,
    passerName,
  });

  return { ok: true, nextName };
}

async function sendTurnEmailSafe(params: {
  nextUserId: string;
  projectTitle: string;
  projectUrl: string;
  passerName: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(params.nextUserId);
    const email = data?.user?.email;
    if (!email) return;
    await sendTurnEmail({
      to: email,
      projectTitle: params.projectTitle,
      passerName: params.passerName,
      projectUrl: params.projectUrl,
    });
  } catch {
    // Delivery is best-effort; the in-app notification was already inserted.
  }
}

// =============================================================================
// Invitations
// =============================================================================

function getOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "https://fabcollab.vercel.app";
}

export type Role = "editor" | "commenter" | "viewer";

export type InviteResult =
  | {
      ok: true;
      inviteUrl: string;
      emailSent: boolean;
      emailNote: string | null;
    }
  | { error: string };

export async function inviteCollaborator(params: {
  projectId: string;
  email: string;
  role: Role;
}): Promise<InviteResult> {
  const email = params.email.trim().toLowerCase();
  const role: Role =
    params.role === "editor" || params.role === "commenter" || params.role === "viewer"
      ? params.role
      : "editor";
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, title, owner_id")
    .eq("id", params.projectId)
    .maybeSingle();
  if (projectErr || !project) {
    return { error: projectErr?.message ?? "Project not found" };
  }
  if (project.owner_id !== user.id) {
    return { error: "Only the project owner can invite collaborators." };
  }

  const { data: invitation, error: inviteErr } = await supabase
    .from("invitations")
    .insert({
      project_id: project.id,
      invited_by: user.id,
      email,
      role,
    })
    .select("token")
    .single();
  if (inviteErr || !invitation) {
    return { error: `Invite: ${inviteErr?.message ?? "unknown error"}` };
  }

  const inviteUrl = `${getOrigin()}/invite/${invitation.token}`;

  const inviterName =
    ((user.user_metadata?.display_name as string | undefined) ?? "").trim() ||
    user.email ||
    "Your collaborator";

  const sendResult = await sendInviteEmail({
    to: email,
    projectTitle: project.title,
    inviterName,
    inviteUrl,
  });

  return {
    ok: true,
    inviteUrl,
    emailSent: sendResult.ok,
    emailNote: sendResult.ok ? null : sendResult.message,
  };
}

export type RevokeResult = { ok: true } | { error: string };

export async function revokeInvitation(params: {
  invitationId: string;
}): Promise<RevokeResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", params.invitationId);
  if (error) return { error: error.message };
  return { ok: true };
}

export type ChangeRoleResult = { ok: true } | { error: string };

export async function changeCollaboratorRole(params: {
  collaboratorId: string;
  role: Role;
}): Promise<ChangeRoleResult> {
  const role: Role =
    params.role === "editor" || params.role === "commenter" || params.role === "viewer"
      ? params.role
      : "editor";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("collaborators")
    .update({ role })
    .eq("id", params.collaboratorId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function changeInvitationRole(params: {
  invitationId: string;
  role: Role;
}): Promise<ChangeRoleResult> {
  const role: Role =
    params.role === "editor" || params.role === "commenter" || params.role === "viewer"
      ? params.role
      : "editor";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("invitations")
    .update({ role })
    .eq("id", params.invitationId);
  if (error) return { error: error.message };
  return { ok: true };
}

// =============================================================================
// Start a call
// =============================================================================

export type CallPlatform = "meet" | "zoom" | "facetime" | "teams" | "discord";

export type StartCallResult = { ok: true; count: number } | { error: string };

export async function startCall(params: {
  projectId: string;
  platform: CallPlatform;
  callUrl: string;
}): Promise<StartCallResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, owner_id")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found" };

  // Only owner or a collaborator can start a call.
  const { data: membership } = await supabase
    .from("collaborators")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership && project.owner_id !== user.id) {
    return { error: "You are not a collaborator on this project." };
  }

  const platformLabel: Record<CallPlatform, string> = {
    meet: "Google Meet",
    zoom: "Zoom",
    facetime: "FaceTime",
    teams: "Microsoft Teams",
    discord: "Discord",
  };
  const label = platformLabel[params.platform];
  const inviterName =
    ((user.user_metadata?.display_name as string | undefined) ?? "").trim() ||
    user.email ||
    "A collaborator";

  // Fetch all other collaborators of this project.
  const { data: others } = await supabase
    .from("collaborators")
    .select("user_id")
    .eq("project_id", project.id)
    .neq("user_id", user.id);

  const rows =
    others?.map((o) => ({
      user_id: o.user_id,
      type: "call_started",
      project_id: project.id,
      body: `${inviterName} started a ${label} call on ${project.title}`,
      link: params.callUrl || `/projects/${project.id}`,
      read: false,
    })) ?? [];

  let count = 0;
  if (rows.length > 0) {
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) return { error: error.message };
    count = rows.length;
  }

  return { ok: true, count };
}

// =============================================================================
// Project completion + public gallery
// =============================================================================

export type MarkCompleteResult =
  | { ok: true; completedAt: string; isPublic: boolean }
  | { error: string };

export async function markProjectComplete(params: {
  projectId: string;
  makePublic: boolean;
}): Promise<MarkCompleteResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Only the project owner can complete a project.
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, status")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found." };
  if (project.owner_id !== user.id) {
    return { error: "Only the project owner can mark it complete." };
  }

  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("projects")
    .update({
      status: "completed",
      completed_at: completedAt,
      is_public: Boolean(params.makePublic),
    })
    .eq("id", params.projectId);
  if (error) return { error: error.message };

  return { ok: true, completedAt, isPublic: Boolean(params.makePublic) };
}

export type SetPublicResult =
  | { ok: true; isPublic: boolean }
  | { error: string };

export async function setProjectPublic(params: {
  projectId: string;
  isPublic: boolean;
}): Promise<SetPublicResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, status")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found." };
  if (project.owner_id !== user.id) {
    return { error: "Only the project owner can change visibility." };
  }
  // Guardrail: public gallery is only for completed projects.
  if (params.isPublic && project.status !== "completed") {
    return {
      error: "Mark the project complete before making it public.",
    };
  }

  const { error } = await supabase
    .from("projects")
    .update({ is_public: Boolean(params.isPublic) })
    .eq("id", params.projectId);
  if (error) return { error: error.message };

  return { ok: true, isPublic: Boolean(params.isPublic) };
}
