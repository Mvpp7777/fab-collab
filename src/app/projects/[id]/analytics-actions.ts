"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AnalyticsRow =
  | { ok: true; data: AnalyticsData }
  | { error: string };

export type AnalyticsData = {
  wordsByContributor: Array<{ userId: string; name: string; color: string; words: number }>;
  timelinePoints: Array<{ day: string; count: number }>;
  sectionCompletion: Array<{ sectionId: string; title: string; wordCount: number }>;
  feedbackCount: number;
  recentFeedback: Array<{ name: string | null; body: string; created_at: string }>;
  feedbackViews: number;
  aiAssistCount: number;
};

export async function getProjectAnalytics(params: {
  projectId: string;
}): Promise<AnalyticsRow> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, owner_id")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return { error: "Project not found." };
  if (project.owner_id !== user.id) {
    return { error: "Only the project owner can see analytics." };
  }

  // Sections
  const { data: sectionsData } = await admin
    .from("sections")
    .select("id, title, position")
    .eq("project_id", project.id)
    .order("position", { ascending: true });
  const sections = sectionsData ?? [];
  const sectionIds = sections.map((s) => s.id);

  // All snapshots for the project
  const { data: snapshots } =
    sectionIds.length > 0
      ? await admin
          .from("content_snapshots")
          .select("section_id, content_text, saved_by, created_at")
          .in("section_id", sectionIds)
          .order("created_at", { ascending: true })
      : { data: [] };
  const rows = (snapshots ?? []) as Array<{
    section_id: string;
    content_text: string;
    saved_by: string | null;
    created_at: string;
  }>;

  // Latest per section (by section_id)
  const latestBySection: Record<string, string> = {};
  for (const s of sections) latestBySection[s.id] = "";
  for (const r of rows) {
    latestBySection[r.section_id] = r.content_text ?? "";
  }

  const sectionCompletion = sections.map((s) => ({
    sectionId: s.id,
    title: (s.title as string | null) ?? `Section ${(s.position as number) + 1}`,
    wordCount: countWords(latestBySection[s.id] ?? ""),
  }));

  // Words by contributor: compute incremental word delta per snapshot save,
  // cumulative per section, attributed to the saver.
  const wordsByUser: Record<string, number> = {};
  const perSectionSeen: Record<string, number> = {};
  for (const r of rows) {
    const before = perSectionSeen[r.section_id] ?? 0;
    const now = countWords(r.content_text ?? "");
    const delta = Math.max(0, now - before);
    perSectionSeen[r.section_id] = now;
    if (r.saved_by) {
      wordsByUser[r.saved_by] = (wordsByUser[r.saved_by] ?? 0) + delta;
    }
  }

  const userIds = Object.keys(wordsByUser);
  const { data: collabRows } =
    userIds.length > 0
      ? await admin
          .from("collaborators")
          .select("user_id, color, users(display_name)")
          .eq("project_id", project.id)
          .in("user_id", userIds)
      : { data: [] };
  const nameColorByUser: Record<string, { name: string; color: string }> = {};
  for (const c of collabRows ?? []) {
    const rel = c.users as
      | { display_name: string | null }
      | Array<{ display_name: string | null }>
      | null;
    const row = Array.isArray(rel) ? rel[0] : rel;
    nameColorByUser[c.user_id as string] = {
      name: row?.display_name?.trim() || "Someone",
      color: (c.color as string | null) || "#0BBFBF",
    };
  }

  const wordsByContributor = Object.entries(wordsByUser)
    .map(([userId, words]) => ({
      userId,
      words,
      name: nameColorByUser[userId]?.name ?? "Someone",
      color: nameColorByUser[userId]?.color ?? "#0BBFBF",
    }))
    .sort((a, b) => b.words - a.words);

  // Timeline — count snapshots per day, last 30 days.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const bucket: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    bucket[key] = 0;
  }
  for (const r of rows) {
    const d = new Date(r.created_at);
    if (d < since) continue;
    const key = d.toISOString().slice(0, 10);
    if (key in bucket) bucket[key] += 1;
  }
  const timelinePoints = Object.entries(bucket).map(([day, count]) => ({
    day,
    count,
  }));

  // Feedback
  const { count: feedbackCount } = await admin
    .from("feedback_submissions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);
  const { data: recentFeedbackRows } = await admin
    .from("feedback_submissions")
    .select("name, body, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: feedbackViews } = await admin
    .from("feedback_page_views")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);

  const { count: aiAssistCount } = await admin
    .from("ai_assist_usage")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);

  return {
    ok: true,
    data: {
      wordsByContributor,
      timelinePoints,
      sectionCompletion,
      feedbackCount: feedbackCount ?? 0,
      recentFeedback: (recentFeedbackRows ?? []) as AnalyticsData["recentFeedback"],
      feedbackViews: feedbackViews ?? 0,
      aiAssistCount: aiAssistCount ?? 0,
    },
  };
}

function countWords(text: string): number {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}
