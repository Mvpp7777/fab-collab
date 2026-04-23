"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendExpertApplicationNotice } from "@/lib/resend";

export type ExpertApplyResult = { ok: true } | { error: string };

export async function submitExpertApplication(
  formData: FormData,
): Promise<ExpertApplyResult> {
  const name = String(formData.get("name") ?? "").trim();
  const linkedin_url = String(formData.get("linkedin_url") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const years_experience = String(formData.get("years_experience") ?? "").trim();
  const achievements = String(formData.get("achievements") ?? "").trim();
  const contribution_rate = String(formData.get("contribution_rate") ?? "").trim();
  const open_to_investing =
    String(formData.get("open_to_investing") ?? "no") === "yes";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!name) return { error: "Please enter your full name." };
  if (!linkedin_url) return { error: "Please share a LinkedIn URL." };
  if (!email.includes("@")) return { error: "Please enter a valid email." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("expert_applications").insert({
      name,
      linkedin_url,
      title: title || null,
      company: company || null,
      category: category || null,
      years_experience: years_experience || null,
      achievements: achievements || null,
      contribution_rate: contribution_rate || null,
      open_to_investing,
      email,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Submission failed." };
  }

  // Internal team notification — best-effort.
  void sendExpertApplicationNotice({
    to: "lenbenti@me.com",
    name,
    title,
    company,
    category,
    email,
    linkedinUrl: linkedin_url,
    contributionRate: contribution_rate,
    yearsExperience: years_experience,
    openToInvesting: open_to_investing,
    achievements,
  });

  return { ok: true };
}
