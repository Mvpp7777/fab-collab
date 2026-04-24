"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_SECTIONS,
  PROJECT_TYPES,
  type ProjectTypeId,
} from "@/lib/projectTypes";

export type CreateProjectResult = { error: string } | { ok: true };

export async function createProject(
  _prev: CreateProjectResult | null,
  formData: FormData,
): Promise<CreateProjectResult> {
  const title = String(formData.get("title") ?? "").trim();
  const projectType = String(formData.get("project_type") ?? "") as ProjectTypeId;
  const collabMode = String(formData.get("collab_mode") ?? "relay");
  const description = String(formData.get("description") ?? "").trim().slice(0, 280);
  const genre = String(formData.get("genre") ?? "").trim();

  if (!title) return { error: "Please enter a title." };
  if (!PROJECT_TYPES.some((t) => t.id === projectType)) {
    return { error: "Please pick a project type." };
  }
  if (collabMode !== "relay" && collabMode !== "live") {
    return { error: "Invalid collab mode." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Ensure a profile row exists so the owner_id FK is satisfied.
  // Uses the service-role admin client to bypass RLS/grant constraints on the
  // users table — profile bootstrapping is a trusted server-only operation.
  const admin = createAdminClient();

  const profileResult = await admin.from("users").upsert(
    {
      id: user.id,
      display_name:
        (user.user_metadata?.display_name as string | undefined) ?? null,
    },
    { onConflict: "id" },
  );

  if (profileResult.error) {
    return {
      error: `Profile: ${profileResult.error.message} (code=${profileResult.error.code ?? "?"})`,
    };
  }

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title,
      project_type: projectType,
      collab_mode: collabMode,
      status: "active",
      description: description || null,
      genre: genre || null,
    })
    .select("id")
    .single();
  if (projectErr || !project) {
    return { error: `Project: ${projectErr?.message ?? "unknown error"}` };
  }

  const sectionRows = DEFAULT_SECTIONS[projectType].map((title, i) => ({
    project_id: project.id,
    title,
    position: i,
  }));
  const { error: sectionsErr } = await supabase
    .from("sections")
    .insert(sectionRows);
  if (sectionsErr) return { error: `Sections: ${sectionsErr.message}` };

  // Seed the owner as the first collaborator so Pass-turn cycling has a head.
  await supabase.from("collaborators").insert({
    project_id: project.id,
    user_id: user.id,
    role: "editor",
    turn_order: 1,
    color: "#0BBFBF", // first palette entry
    invited_by: user.id,
  });

  // Initialize relay state with the owner holding the turn.
  await supabase.from("relay_state").insert({
    project_id: project.id,
    current_holder: user.id,
  });

  redirect(`/projects/${project.id}`);
}
