import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectEditor from "./ProjectEditor";
import type { ProjectTypeId } from "@/lib/projectTypes";

export const dynamic = "force-dynamic";

type SectionRow = {
  id: string;
  title: string | null;
  position: number;
};

type SnapshotRow = {
  section_id: string;
  content_text: string;
  created_at: string;
};

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, project_type, collab_mode, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!project) notFound();

  const { data: sectionsData } = await supabase
    .from("sections")
    .select("id, title, position")
    .eq("project_id", project.id)
    .order("position", { ascending: true });

  const sections = (sectionsData ?? []) as SectionRow[];

  const { data: snapshotsData } = await supabase
    .from("content_snapshots")
    .select("section_id, content_text, created_at")
    .in(
      "section_id",
      sections.map((s) => s.id),
    )
    .order("created_at", { ascending: false });

  const latestBySection: Record<string, string> = {};
  for (const snap of (snapshotsData ?? []) as SnapshotRow[]) {
    if (!(snap.section_id in latestBySection)) {
      latestBySection[snap.section_id] = snap.content_text;
    }
  }
  const initialContent: Record<string, string> = Object.fromEntries(
    sections.map((s) => [s.id, latestBySection[s.id] ?? ""]),
  );

  const displayName =
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    user.email ||
    "You";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <ProjectEditor
      project={{
        id: project.id,
        title: project.title,
        project_type: project.project_type as ProjectTypeId,
        collab_mode: project.collab_mode as "relay" | "live",
      }}
      sections={sections}
      initialContent={initialContent}
      displayName={displayName}
      initial={initial}
    />
  );
}
