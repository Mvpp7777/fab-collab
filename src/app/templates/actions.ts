"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectTypeId } from "@/lib/projectTypes";

export type SaveTemplateResult = { ok: true; id: string } | { error: string };

// Save an existing project as a template (private by default; toggle public later).
export async function saveProjectAsTemplate(params: {
  projectId: string;
  title: string;
  makePublic: boolean;
}): Promise<SaveTemplateResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, owner_id, project_type")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found." };
  if (project.owner_id !== user.id) {
    return { error: "Only the owner can template a project." };
  }

  const { data: sections } = await admin
    .from("sections")
    .select("title, position, section_type")
    .eq("project_id", project.id)
    .order("position", { ascending: true });

  const sectionsJson = (sections ?? []).map((s) => ({
    title: s.title,
    position: s.position,
    section_type: s.section_type,
  }));

  const { data: inserted, error } = await admin
    .from("templates")
    .insert({
      owner_id: user.id,
      title: params.title.trim() || "Untitled template",
      project_type: project.project_type,
      sections_json: sectionsJson,
      is_public: Boolean(params.makePublic),
    })
    .select("id")
    .single();
  if (error || !inserted) return { error: error?.message ?? "Insert failed" };
  return { ok: true, id: inserted.id };
}

// Create a new project from a template.
export async function createProjectFromTemplate(formData: FormData) {
  const templateId = String(formData.get("template_id") ?? "");
  const newTitle = String(formData.get("title") ?? "").trim();
  if (!templateId) redirect("/templates?error=missing");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent("/templates")}`);
  }

  const admin = createAdminClient();
  const { data: tpl } = await admin
    .from("templates")
    .select("id, title, project_type, sections_json, owner_id, is_public, is_official, use_count")
    .eq("id", templateId)
    .maybeSingle();
  if (!tpl) redirect("/templates?error=not-found");

  // Permission check: template must be public/official or owned by viewer.
  if (!tpl.is_public && !tpl.is_official && tpl.owner_id !== user.id) {
    redirect("/templates?error=forbidden");
  }

  // Ensure profile row exists (FK).
  await admin.from("users").upsert(
    {
      id: user.id,
      display_name:
        (user.user_metadata?.display_name as string | undefined) ?? null,
    },
    { onConflict: "id" },
  );

  const finalTitle = newTitle || `${tpl.title} copy`;

  const { data: project, error: pErr } = await admin
    .from("projects")
    .insert({
      owner_id: user.id,
      title: finalTitle,
      project_type: tpl.project_type as ProjectTypeId,
      collab_mode: "relay",
      status: "active",
    })
    .select("id")
    .single();
  if (pErr || !project) redirect("/templates?error=project-insert");

  const rawSections = Array.isArray(tpl.sections_json)
    ? (tpl.sections_json as Array<{ title?: string; position?: number; section_type?: string }>)
    : [];
  const sections = rawSections.map((s, i) => ({
    project_id: project.id,
    title: s.title ?? `Section ${i + 1}`,
    position: typeof s.position === "number" ? s.position : i,
    section_type: s.section_type ?? "custom",
  }));
  if (sections.length > 0) {
    await admin.from("sections").insert(sections);
  }

  await admin.from("collaborators").insert({
    project_id: project.id,
    user_id: user.id,
    role: "editor",
    turn_order: 1,
    color: "#0BBFBF",
    invited_by: user.id,
  });
  await admin.from("relay_state").insert({
    project_id: project.id,
    current_holder: user.id,
  });

  // Bump use_count on the template.
  await admin
    .from("templates")
    .update({ use_count: (tpl.use_count ?? 0) + 1 })
    .eq("id", tpl.id);

  redirect(`/projects/${project.id}`);
}

export async function toggleTemplatePublic(params: {
  templateId: string;
  isPublic: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("templates")
    .update({ is_public: params.isPublic })
    .eq("id", params.templateId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteTemplate(params: {
  templateId: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", params.templateId);
  if (error) return { error: error.message };
  return { ok: true };
}
