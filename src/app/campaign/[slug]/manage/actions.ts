"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type OwnerCtx = {
  admin: ReturnType<typeof createAdminClient>;
  campaign: { id: string; owner_id: string; project_id: string; title: string };
  user: { id: string };
};

async function ensureOwner(
  slug: string,
): Promise<{ error: string } | OwnerCtx> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, owner_id, project_id, title")
    .eq("slug", slug)
    .maybeSingle();
  if (!campaign) return { error: "Campaign not found." };
  if (campaign.owner_id !== user.id) return { error: "Not your campaign." };
  return { admin, campaign: campaign as OwnerCtx["campaign"], user };
}

export type ManageResult = { ok: true } | { error: string };

export async function closeCampaign(params: {
  slug: string;
}): Promise<ManageResult> {
  const ctx = await ensureOwner(params.slug);
  if ("error" in ctx) return ctx;
  const { error } = await ctx.admin
    .from("campaigns")
    .update({ status: "closed" })
    .eq("id", ctx.campaign.id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function reopenCampaign(params: {
  slug: string;
}): Promise<ManageResult> {
  const ctx = await ensureOwner(params.slug);
  if ("error" in ctx) return ctx;
  const { data: c } = await ctx.admin
    .from("campaigns")
    .select("spots_filled, max_collaborators")
    .eq("id", ctx.campaign.id)
    .single();
  const nextStatus =
    c && c.spots_filled >= c.max_collaborators ? "full" : "open";
  const { error } = await ctx.admin
    .from("campaigns")
    .update({ status: nextStatus })
    .eq("id", ctx.campaign.id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function extendDeadline(params: {
  slug: string;
  newEndDate: string;
}): Promise<ManageResult> {
  const ctx = await ensureOwner(params.slug);
  if ("error" in ctx) return ctx;
  const d = new Date(params.newEndDate);
  if (Number.isNaN(d.getTime())) return { error: "Invalid date." };
  const { error } = await ctx.admin
    .from("campaigns")
    .update({ end_date: d.toISOString() })
    .eq("id", ctx.campaign.id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function messageParticipants(params: {
  slug: string;
  message: string;
}): Promise<ManageResult> {
  const message = params.message.trim();
  if (!message) return { error: "Message is empty." };
  const ctx = await ensureOwner(params.slug);
  if ("error" in ctx) return ctx;

  const { data: participants } = await ctx.admin
    .from("campaign_participants")
    .select("user_id")
    .eq("campaign_id", ctx.campaign.id)
    .neq("user_id", ctx.user.id);

  const rows =
    participants?.map((p) => ({
      user_id: p.user_id,
      type: "campaign_message",
      project_id: ctx.campaign.project_id,
      body: `Message from ${ctx.campaign.title}: ${message}`,
      link: `/projects/${ctx.campaign.project_id}`,
      read: false,
    })) ?? [];
  if (rows.length > 0) {
    await ctx.admin.from("notifications").insert(rows);
  }
  return { ok: true };
}
