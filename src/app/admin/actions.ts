"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { sendWeeklyDigest, type DigestRunSummary } from "@/lib/digest/sendAll";

const ADMIN_EMAIL = "lenbenti@me.com";
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

async function ensureAdmin(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL);
}

export type AdminActionResult = { ok: true } | { error: string };

export async function approveExpert(params: {
  id: string;
}): Promise<AdminActionResult> {
  if (!(await ensureAdmin())) return { error: "Admin only." };
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("expert_applications")
    .select("id, name, email")
    .eq("id", params.id)
    .maybeSingle();
  if (!app) return { error: "Application not found." };

  const { error } = await admin
    .from("expert_applications")
    .update({ status: "approved" })
    .eq("id", params.id);
  if (error) return { error: error.message };

  if (process.env.RESEND_API_KEY && app.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM,
        to: app.email,
        subject: "You're approved on Fab Collab Think Tank 🎉",
        text: `Hi ${app.name ?? "there"},\n\nYou've been approved as a Fab Collab expert. We'll email you when the Think Tank marketplace opens to creators — expect updates over the next few weeks.\n\n— The Fab Collab team`,
      });
    } catch {
      /* best effort */
    }
  }
  return { ok: true };
}

export async function rejectExpert(params: {
  id: string;
}): Promise<AdminActionResult> {
  if (!(await ensureAdmin())) return { error: "Admin only." };
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("expert_applications")
    .select("id, name, email")
    .eq("id", params.id)
    .maybeSingle();
  if (!app) return { error: "Application not found." };

  const { error } = await admin
    .from("expert_applications")
    .update({ status: "rejected" })
    .eq("id", params.id);
  if (error) return { error: error.message };

  if (process.env.RESEND_API_KEY && app.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM,
        to: app.email,
        subject: "Thanks for applying to Fab Collab Think Tank",
        text: `Hi ${app.name ?? "there"},\n\nThanks for applying to join the Fab Collab Think Tank as an expert. We're not able to move forward with your application at this time, but the marketplace is young and criteria will evolve — we'd love to revisit as it grows.\n\n— The Fab Collab team`,
      });
    } catch {
      /* best effort */
    }
  }
  return { ok: true };
}

export async function runWeeklyDigestNow(): Promise<
  { ok: true; summary: DigestRunSummary } | { error: string }
> {
  if (!(await ensureAdmin())) return { error: "Admin only." };
  const summary = await sendWeeklyDigest();
  return { ok: true, summary };
}
