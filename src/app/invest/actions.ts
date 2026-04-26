"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInvestorInterestEmail } from "@/lib/resend";

export type ExpressInterestResult =
  | {
      ok: true;
      ownerName: string;
      ownerEmail: string | null;
      emailSent: boolean;
    }
  | { error: string };

export async function expressInterest(params: {
  projectId: string;
  message?: string;
}): Promise<ExpressInterestResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to express interest." };

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select(
      "id, title, project_type, owner_id, status, is_seeking_investment",
    )
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found." };
  if (!project.is_seeking_investment) {
    return { error: "This project isn't currently seeking investment." };
  }

  const { data: investorRow } = await admin
    .from("users")
    .select("id, display_name, investor_company")
    .eq("id", user.id)
    .maybeSingle();

  const investorName =
    investorRow?.display_name?.trim() ||
    ((user.user_metadata?.display_name as string | undefined) ?? "").trim() ||
    user.email ||
    "An investor";
  const investorCompany = investorRow?.investor_company?.trim() || null;
  const investorEmail = user.email ?? null;
  const message = (params.message ?? "").trim().slice(0, 2000) || null;

  // Insert (or upsert) the interest record. The unique (project_id, investor_user_id)
  // index keeps the same investor from spamming the same project.
  const { error: upsertErr } = await admin
    .from("investment_interests")
    .upsert(
      {
        project_id: project.id,
        investor_user_id: user.id,
        investor_name: investorName,
        investor_company: investorCompany,
        investor_email: investorEmail,
        message,
      },
      { onConflict: "project_id,investor_user_id" },
    );
  if (upsertErr) return { error: upsertErr.message };

  // Look up the owner's email + display name for the notifications.
  let ownerEmail: string | null = null;
  let ownerName = "the team";
  try {
    const { data: ownerAuth } = await admin.auth.admin.getUserById(
      project.owner_id,
    );
    ownerEmail = ownerAuth?.user?.email ?? null;
  } catch {
    /* best-effort */
  }
  const { data: ownerRow } = await admin
    .from("users")
    .select("display_name")
    .eq("id", project.owner_id)
    .maybeSingle();
  ownerName = ownerRow?.display_name?.trim() || ownerEmail || "the team";

  // In-app notification to the owner.
  const investorLabel = investorCompany
    ? `${investorName} from ${investorCompany}`
    : investorName;
  await admin.from("notifications").insert({
    user_id: project.owner_id,
    type: "investment_interest",
    project_id: project.id,
    body: `${investorLabel} expressed interest in your Think Tank. They will be in touch.`,
    link: `/projects/${project.id}`,
    read: false,
  });

  // Email the investor with the owner's contact info (best-effort).
  let emailSent = false;
  if (investorEmail) {
    const result = await sendInvestorInterestEmail({
      to: investorEmail,
      investorName,
      projectTitle: String(project.title),
      ownerName,
      ownerEmail,
      message,
    });
    emailSent = result.ok;
  }

  return { ok: true, ownerName, ownerEmail, emailSent };
}
