"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type SubmitFeedbackResult = { ok: true } | { error: string };

export async function submitFeedback(params: {
  token: string;
  name: string;
  email: string;
  body: string;
}): Promise<SubmitFeedbackResult> {
  const body = params.body.trim();
  if (!body) return { error: "Please write some feedback before submitting." };

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("feedback_token", params.token)
    .maybeSingle();
  if (!project) return { error: "This feedback link is invalid." };

  const { error } = await admin.from("feedback_submissions").insert({
    project_id: project.id,
    name: params.name.trim() || null,
    email: params.email.trim().toLowerCase() || null,
    body,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
