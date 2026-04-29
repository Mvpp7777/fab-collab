"use server";

import Anthropic from "@anthropic-ai/sdk";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInviteEmail, sendTurnEmail } from "@/lib/resend";
import { checkAndAwardBadges } from "@/lib/badges/award";

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
  projectId?: string;
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

    // Best-effort AI usage log for project analytics.
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("ai_assist_usage").insert({
          user_id: user.id,
          assist_type: assistType,
          project_id: params.projectId ?? null,
        });
      }
    } catch {
      /* non-fatal */
    }

    return { text };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Anthropic API error" };
  }
}

export type SetSectionPurchasableResult =
  | { ok: true; purchasable: boolean; priceCents: number | null }
  | { error: string };

export async function setSectionPurchasable(params: {
  sectionId: string;
  purchasable: boolean;
  priceCents: number | null;
}): Promise<SetSectionPurchasableResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: section } = await supabase
    .from("sections")
    .select("id, project_id, projects(owner_id)")
    .eq("id", params.sectionId)
    .maybeSingle();
  if (!section) return { error: "Section not found." };
  const projRel = section.projects as
    | { owner_id: string }
    | Array<{ owner_id: string }>
    | null;
  const projRow = Array.isArray(projRel) ? projRel[0] : projRel;
  if (!projRow || projRow.owner_id !== user.id) {
    return { error: "Only the project owner can change this." };
  }

  const priceCents = params.purchasable
    ? Math.max(100, Math.round(Number(params.priceCents ?? 0)))
    : null;

  const { error } = await supabase
    .from("sections")
    .update({
      purchasable: Boolean(params.purchasable),
      purchase_price_cents: priceCents,
    })
    .eq("id", params.sectionId);
  if (error) return { error: error.message };
  return { ok: true, purchasable: Boolean(params.purchasable), priceCents };
}

// =============================================================================
// Line-by-line contributions
// =============================================================================

export type ContributionLineRow = {
  id: string;
  section_id: string;
  content_text: string;
  saved_by: string | null;
  line_position: number;
  created_at: string;
};

export type AddContributionLineResult =
  | { ok: true; line: ContributionLineRow }
  | { error: string };

export async function addContributionLine(params: {
  sectionId: string;
  text: string;
}): Promise<AddContributionLineResult> {
  const text = params.text.trim();
  if (!text) return { error: "Write a line before adding." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const admin = createAdminClient();

  const { data: section } = await admin
    .from("sections")
    .select("id, project_id")
    .eq("id", params.sectionId)
    .maybeSingle();
  if (!section) return { error: "Section not found." };

  const { data: relayState } = await admin
    .from("relay_state")
    .select("current_holder")
    .eq("project_id", section.project_id)
    .maybeSingle();
  // If relay_state is missing, fall back to allowing the project owner. This
  // mirrors the page-level fallback in src/app/projects/[id]/page.tsx.
  let currentHolder = relayState?.current_holder ?? null;
  if (!currentHolder) {
    const { data: project } = await admin
      .from("projects")
      .select("owner_id")
      .eq("id", section.project_id)
      .maybeSingle();
    currentHolder = project?.owner_id ?? null;
  }
  if (currentHolder !== user.id) {
    return { error: "It's not your turn." };
  }

  // Compute next line position. We use the admin client throughout so the
  // ordering query isn't affected by any RLS that might hide other users'
  // contributions from the caller.
  const { data: tail } = await admin
    .from("content_snapshots")
    .select("line_position")
    .eq("section_id", params.sectionId)
    .not("line_position", "is", null)
    .order("line_position", { ascending: false })
    .limit(1);
  const nextPosition = (tail?.[0]?.line_position ?? 0) + 1;

  const { data: inserted, error: insertErr } = await admin
    .from("content_snapshots")
    .insert({
      section_id: params.sectionId,
      content_text: text,
      saved_by: user.id,
      is_autosave: false,
      line_position: nextPosition,
    })
    .select("id, section_id, content_text, saved_by, line_position, created_at")
    .single();
  if (insertErr || !inserted) {
    return { error: insertErr?.message ?? "Failed to add line." };
  }

  return { ok: true, line: inserted as ContributionLineRow };
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

  // Use the admin client for all reads/writes against relay_state and the full
  // collaborators list. The auth client (`supabase`) above already established
  // identity via getUser() and we explicitly verify the caller is the current
  // holder below — so there is no privilege escalation here. The previous code
  // path used the RLS-gated client and silently no-op'd when an UPDATE was
  // blocked (Postgres returns affectedRows=0 with error=null), which is what
  // caused turn passes to appear successful client-side without actually
  // advancing the holder.
  const admin = createAdminClient();

  const { data: project, error: projectErr } = await admin
    .from("projects")
    .select("id, title, owner_id")
    .eq("id", params.projectId)
    .maybeSingle();
  if (projectErr || !project) {
    return { error: projectErr?.message ?? "Project not found" };
  }

  // Gate: only the current turn holder may pass.
  const { data: state } = await admin
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

  const { data: collaborators } = await admin
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

  // Advance relay_state to the next holder. Admin client bypasses RLS so this
  // actually writes regardless of whether the caller is in the collaborators
  // membership table. The auth.uid() === current_holder gate above is the
  // real authorization check.
  const { error: updateErr } = await admin
    .from("relay_state")
    .update({ current_holder: next.user_id })
    .eq("project_id", project.id);
  if (updateErr) return { error: `Relay update: ${updateErr.message}` };

  await admin.from("notifications").insert({
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
  return "https://collabit.vercel.app";
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
  | { ok: true; completedAt: string; isPublic: boolean; license: string }
  | { error: string };

export async function markProjectComplete(params: {
  projectId: string;
  makePublic: boolean;
  license?: string;
}): Promise<MarkCompleteResult> {
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
    return { error: "Only the project owner can mark it complete." };
  }

  const license = params.license ?? "all-rights-reserved";
  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("projects")
    .update({
      status: "completed",
      completed_at: completedAt,
      is_public: Boolean(params.makePublic),
      license,
    })
    .eq("id", params.projectId);
  if (error) return { error: error.message };

  void checkAndAwardBadges(user.id);

  return {
    ok: true,
    completedAt,
    isPublic: Boolean(params.makePublic),
    license,
  };
}

export type SetLicenseResult = { ok: true } | { error: string };

export async function setProjectLicense(params: {
  projectId: string;
  license: string;
}): Promise<SetLicenseResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found." };
  if (project.owner_id !== user.id) {
    return { error: "Only the project owner can change the license." };
  }

  const { error } = await supabase
    .from("projects")
    .update({ license: params.license })
    .eq("id", params.projectId);
  if (error) return { error: error.message };
  return { ok: true };
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

// =============================================================================
// Think Tank — Open for Investment
// =============================================================================

const THINK_TANK_TYPES = new Set([
  "think_tank",
  "community_challenge",
  "research_collective",
  "innovation_sprint",
]);

export type SetSeekingInvestmentResult =
  | { ok: true; isSeekingInvestment: boolean; notifiedInvestors: number }
  | { error: string };

export async function setProjectSeekingInvestment(params: {
  projectId: string;
  seeking: boolean;
}): Promise<SetSeekingInvestmentResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, title, project_type, status, owner_id, is_seeking_investment")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found." };
  if (project.owner_id !== user.id) {
    return { error: "Only the project owner can change this." };
  }
  if (!THINK_TANK_TYPES.has(String(project.project_type))) {
    return { error: "This project type can't be opened for investment." };
  }
  if (project.status !== "completed") {
    return { error: "Mark the project complete before seeking investment." };
  }

  const wasSeeking = Boolean(project.is_seeking_investment);
  const seeking = Boolean(params.seeking);

  const { error: updateErr } = await admin
    .from("projects")
    .update({
      is_seeking_investment: seeking,
      seeking_investment_at: seeking ? new Date().toISOString() : null,
    })
    .eq("id", project.id);
  if (updateErr) return { error: updateErr.message };

  // Fan out to verified investors only on the off→on transition.
  let notifiedInvestors = 0;
  if (seeking && !wasSeeking) {
    const { data: investors } = await admin
      .from("users")
      .select("id")
      .eq("is_verified_investor", true);
    const rows = (investors ?? [])
      .filter((u) => u.id !== user.id)
      .map((u) => ({
        user_id: u.id,
        type: "investment_opportunity",
        project_id: project.id,
        body: `New Think Tank seeking investment: ${project.title}`,
        link: `/invest`,
        read: false,
      }));
    if (rows.length > 0) {
      await admin.from("notifications").insert(rows);
      notifiedInvestors = rows.length;
    }
  }

  return { ok: true, isSeekingInvestment: seeking, notifiedInvestors };
}

// =============================================================================
// Comments
// =============================================================================

export type CommentRow = {
  id: string;
  section_id: string;
  user_id: string | null;
  parent_id: string | null;
  body: string;
  resolved: boolean;
  resolved_by: string | null;
  created_at: string;
};

export type CommentsResult =
  | { ok: true; items: CommentRow[] }
  | { error: string };

export async function getComments(params: {
  sectionId: string;
}): Promise<CommentsResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, section_id, user_id, parent_id, body, resolved, resolved_by, created_at",
    )
    .eq("section_id", params.sectionId)
    .order("created_at", { ascending: true });
  if (error) return { error: error.message };
  return { ok: true, items: (data ?? []) as CommentRow[] };
}

export type AddCommentResult =
  | { ok: true; comment: CommentRow }
  | { error: string };

export async function addComment(params: {
  sectionId: string;
  body: string;
  parentId?: string | null;
}): Promise<AddCommentResult> {
  const body = params.body.trim();
  if (!body) return { error: "Comment cannot be empty." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      section_id: params.sectionId,
      user_id: user.id,
      parent_id: params.parentId ?? null,
      body,
      resolved: false,
    })
    .select(
      "id, section_id, user_id, parent_id, body, resolved, resolved_by, created_at",
    )
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Failed to add comment." };
  }

  // Fire-and-forget: notify other collaborators about the new comment.
  void notifyCommentCreated({
    commenterId: user.id,
    sectionId: params.sectionId,
  });

  return { ok: true, comment: data as CommentRow };
}

async function notifyCommentCreated(params: {
  commenterId: string;
  sectionId: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: section } = await admin
      .from("sections")
      .select("id, title, project_id, projects(id, title)")
      .eq("id", params.sectionId)
      .maybeSingle();
    if (!section) return;
    const projRel = section.projects as
      | { id: string; title: string }
      | Array<{ id: string; title: string }>
      | null;
    const project = Array.isArray(projRel) ? projRel[0] : projRel;
    if (!project) return;

    const { data: commenter } = await admin
      .from("users")
      .select("display_name")
      .eq("id", params.commenterId)
      .maybeSingle();
    const name = commenter?.display_name?.trim() || "A collaborator";

    const { data: others } = await admin
      .from("collaborators")
      .select("user_id")
      .eq("project_id", project.id)
      .neq("user_id", params.commenterId);

    const rows =
      others?.map((o) => ({
        user_id: o.user_id,
        type: "comment_added",
        project_id: project.id,
        body: `${name} commented on ${section.title ?? "a section"} in ${project.title}`,
        link: `/projects/${project.id}`,
        read: false,
      })) ?? [];
    if (rows.length > 0) {
      await admin.from("notifications").insert(rows);
    }
  } catch {
    // best-effort; ignore notification failures
  }
}

export type ResolveCommentResult = { ok: true } | { error: string };

export async function setCommentResolved(params: {
  commentId: string;
  resolved: boolean;
}): Promise<ResolveCommentResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("comments")
    .update({
      resolved: params.resolved,
      resolved_by: params.resolved ? user.id : null,
    })
    .eq("id", params.commentId);
  if (error) return { error: error.message };
  return { ok: true };
}

// =============================================================================
// Public feedback link
// =============================================================================

export type EnsureFeedbackTokenResult =
  | { ok: true; url: string; token: string }
  | { error: string };

export async function ensureFeedbackToken(params: {
  projectId: string;
}): Promise<EnsureFeedbackTokenResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, feedback_token")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found." };
  if (project.owner_id !== user.id) {
    return { error: "Only the project owner can generate a feedback link." };
  }

  let token = project.feedback_token as string | null;
  if (!token) {
    token = randomToken();
    const { error } = await supabase
      .from("projects")
      .update({ feedback_token: token })
      .eq("id", params.projectId);
    if (error) return { error: error.message };
  }

  const origin = getOrigin();
  return { ok: true, token, url: `${origin}/feedback/${token}` };
}

function randomToken(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 24; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

// =============================================================================
// Distribution click tracking (partner CTAs)
// =============================================================================

export type LogDistributionClickResult =
  | { ok: true }
  | { error: string };

export async function logDistributionClick(params: {
  projectId: string;
  destination: string;
}): Promise<LogDistributionClickResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("distribution_clicks").insert({
    user_id: user.id,
    project_id: params.projectId,
    destination: params.destination,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
