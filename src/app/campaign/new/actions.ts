"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SECTIONS,
  PROJECT_TYPES,
  type ProjectTypeId,
} from "@/lib/projectTypes";
import { slugify } from "@/lib/slugify";

export type CreateCampaignResult = { error: string } | { ok: true };

export async function createCampaign(
  _prev: CreateCampaignResult | null,
  formData: FormData,
): Promise<CreateCampaignResult> {
  const title = String(formData.get("title") ?? "").trim();
  const projectType = String(formData.get("project_type") ?? "") as ProjectTypeId;
  const description = String(formData.get("description") ?? "").trim();
  const reward = String(formData.get("reward") ?? "").trim();
  const maxCollaboratorsRaw = String(formData.get("max_collaborators") ?? "");
  const endDateRaw = String(formData.get("end_date") ?? "");
  const slugRaw = String(formData.get("slug") ?? "").trim();

  if (!title) return { error: "Give your campaign a title." };
  if (!PROJECT_TYPES.some((t) => t.id === projectType)) {
    return { error: "Pick a project type." };
  }

  const maxCollaborators = Number(maxCollaboratorsRaw);
  if (
    !Number.isFinite(maxCollaborators) ||
    maxCollaborators < 1 ||
    maxCollaborators > 10000
  ) {
    return { error: "Set a realistic max collaborators (1–10000)." };
  }

  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  if (endDate && Number.isNaN(endDate.getTime())) {
    return { error: "Invalid end date." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in first." };

  // Ensure the user has a profile row (FK target for projects.owner_id).
  const admin = createAdminClient();
  await admin.from("users").upsert(
    {
      id: user.id,
      display_name:
        (user.user_metadata?.display_name as string | undefined) ?? null,
    },
    { onConflict: "id" },
  );

  // 1. Create project
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title,
      project_type: projectType,
      collab_mode: "relay",
      status: "active",
      description: description || null,
    })
    .select("id")
    .single();
  if (projectErr || !project) {
    return { error: `Project: ${projectErr?.message ?? "unknown"}` };
  }

  // 2. Default sections
  const sectionRows = DEFAULT_SECTIONS[projectType].map((sectionTitle, i) => ({
    project_id: project.id,
    title: sectionTitle,
    position: i,
  }));
  await supabase.from("sections").insert(sectionRows);

  // 3. Owner as first collaborator + relay state
  await supabase.from("collaborators").insert({
    project_id: project.id,
    user_id: user.id,
    role: "editor",
    turn_order: 1,
    color: "#0BBFBF",
    invited_by: user.id,
  });
  await supabase.from("relay_state").insert({
    project_id: project.id,
    current_holder: user.id,
  });

  // 4. Resolve a unique slug
  const base = slugify(slugRaw || title);
  let slug = base;
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: existing } = await admin
      .from("campaigns")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  // 5. Create campaign row
  const { error: campaignErr } = await supabase.from("campaigns").insert({
    project_id: project.id,
    owner_id: user.id,
    slug,
    title,
    description: description || null,
    reward: reward || null,
    max_collaborators: maxCollaborators,
    spots_filled: 1, // owner counts as first participant
    end_date: endDate?.toISOString() ?? null,
    status: "open",
  });
  if (campaignErr) {
    return { error: `Campaign: ${campaignErr.message}` };
  }

  // 6. Register the owner in campaign_participants too
  const { data: campaignRow } = await admin
    .from("campaigns")
    .select("id")
    .eq("slug", slug)
    .single();
  if (campaignRow) {
    await admin.from("campaign_participants").insert({
      campaign_id: campaignRow.id,
      user_id: user.id,
      contribution_status: "writing",
    });
  }

  redirect(`/campaign/${slug}`);
}
