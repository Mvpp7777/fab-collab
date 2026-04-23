"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { colorForTurnOrder } from "@/lib/colors";

export type JoinResult =
  | { ok: true; projectId: string }
  | { error: string; needsLogin?: true; needsWaitlist?: true };

export async function joinCampaign(params: {
  slug: string;
}): Promise<JoinResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Log in to join this campaign.",
      needsLogin: true,
    };
  }

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, project_id, owner_id, max_collaborators, spots_filled, status, title")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!campaign) return { error: "Campaign not found." };

  if (
    campaign.status === "closed" ||
    campaign.spots_filled >= campaign.max_collaborators
  ) {
    return {
      error: "This campaign is full.",
      needsWaitlist: true,
    };
  }

  // Ensure profile row exists for FK.
  await admin.from("users").upsert(
    {
      id: user.id,
      display_name:
        (user.user_metadata?.display_name as string | undefined) ?? null,
    },
    { onConflict: "id" },
  );

  // Already joined?
  const { data: existingPart } = await admin
    .from("campaign_participants")
    .select("id")
    .eq("campaign_id", campaign.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingPart) {
    return { ok: true, projectId: campaign.project_id };
  }

  // Turn order = next integer
  const { data: collabMax } = await admin
    .from("collaborators")
    .select("turn_order")
    .eq("project_id", campaign.project_id)
    .order("turn_order", { ascending: false, nullsFirst: false })
    .limit(1);
  const nextOrder = (collabMax?.[0]?.turn_order ?? 0) + 1;

  // Add to project collaborators
  const { error: collabErr } = await admin.from("collaborators").insert({
    project_id: campaign.project_id,
    user_id: user.id,
    role: "editor",
    turn_order: nextOrder,
    color: colorForTurnOrder(nextOrder),
    invited_by: campaign.owner_id,
  });
  if (collabErr && !collabErr.message.toLowerCase().includes("duplicate")) {
    return { error: `Collaborator: ${collabErr.message}` };
  }

  // Add to campaign_participants
  await admin.from("campaign_participants").insert({
    campaign_id: campaign.id,
    user_id: user.id,
    contribution_status: "joined",
  });

  // Bump spots_filled and check milestones
  const newSpots = campaign.spots_filled + 1;
  await admin
    .from("campaigns")
    .update({ spots_filled: newSpots })
    .eq("id", campaign.id);

  // Welcome notification to the new participant
  await admin.from("notifications").insert({
    user_id: user.id,
    type: "campaign_joined",
    project_id: campaign.project_id,
    body: `Welcome to ${campaign.title}! Start writing when it's your turn.`,
    link: `/projects/${campaign.project_id}`,
    read: false,
  });

  // Milestone notifications to campaign owner
  await maybeFireMilestone({
    campaignId: campaign.id,
    ownerId: campaign.owner_id,
    projectId: campaign.project_id,
    title: campaign.title,
    oldCount: campaign.spots_filled,
    newCount: newSpots,
    max: campaign.max_collaborators,
  });

  return { ok: true, projectId: campaign.project_id };
}

async function maybeFireMilestone(p: {
  campaignId: string;
  ownerId: string;
  projectId: string;
  title: string;
  oldCount: number;
  newCount: number;
  max: number;
}): Promise<void> {
  const admin = createAdminClient();
  const milestones: Array<{ pct: number; msg: (remaining: number) => string }> =
    [
      { pct: 25, msg: () => `Your campaign "${p.title}" is 25% full! 🎉` },
      { pct: 50, msg: () => `"${p.title}" is halfway there!` },
      {
        pct: 75,
        msg: (remaining) =>
          `"${p.title}" is almost full — ${remaining} spot${remaining === 1 ? "" : "s"} left!`,
      },
      {
        pct: 90,
        msg: (remaining) =>
          `Only ${remaining} spot${remaining === 1 ? "" : "s"} left on "${p.title}" — share now!`,
      },
      { pct: 100, msg: () => `"${p.title}" is FULL! 🏆` },
    ];

  for (const m of milestones) {
    const threshold = Math.max(1, Math.ceil((p.max * m.pct) / 100));
    if (p.oldCount < threshold && p.newCount >= threshold) {
      const remaining = Math.max(0, p.max - p.newCount);
      await admin.from("notifications").insert({
        user_id: p.ownerId,
        type: "campaign_milestone",
        project_id: p.projectId,
        body: m.msg(remaining),
        link: `/campaign/${p.campaignId}`,
        read: false,
      });
    }
  }
}

export async function joinCampaignFromForm(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const result = await joinCampaign({ slug });
  if ("error" in result) {
    if (result.needsLogin) {
      redirect(`/auth/login?next=${encodeURIComponent(`/campaign/${slug}`)}`);
    }
    redirect(`/campaign/${slug}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/projects/${result.projectId}`);
}

export type WaitlistResult = { ok: true } | { error: string };

export async function addCampaignWaitlist(params: {
  slug: string;
  email: string;
  name: string;
}): Promise<WaitlistResult> {
  const email = params.email.trim().toLowerCase();
  if (!email.includes("@")) return { error: "Please enter a valid email." };

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!campaign) return { error: "Campaign not found." };

  const { error } = await admin.from("campaign_waitlist").insert({
    campaign_id: campaign.id,
    email,
    name: params.name.trim() || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
