"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type WaitlistResult = { ok: true } | { error: string };

export async function submitIndustryWaitlist(formData: FormData): Promise<WaitlistResult> {
  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const looking_for = String(formData.get("looking_for") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!name) return { error: "Please enter your name." };
  if (!email || !email.includes("@")) return { error: "Please enter a valid email." };

  // Admin client bypasses RLS. The anon INSERT policy allows public submits
  // regardless, but admin keeps the write server-side and future-proofs
  // against accidental RLS changes.
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("industry_waitlist").insert({
      name,
      company: company || null,
      role: role || null,
      looking_for: looking_for || null,
      email,
    });
    if (error) return { error: error.message };
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Submission failed." };
  }
}
