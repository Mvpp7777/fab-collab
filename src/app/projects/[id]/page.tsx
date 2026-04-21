import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProjectEditor, {
  type CollaboratorEntry,
  type PendingInvitation,
} from "./ProjectEditor";
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

function computeOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "https://fabcollab.vercel.app";
}

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
    .select("id, title, project_type, collab_mode, status, owner_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!project) notFound();

  const isOwner = project.owner_id === user.id;

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

  // Collaborators + invitations via admin so we don't depend on RLS nuances
  // (owner has RLS SELECT anyway; this keeps the page resilient).
  const admin = createAdminClient();
  const { data: collabRows } = await admin
    .from("collaborators")
    .select("id, user_id, role, turn_order, users(display_name)")
    .eq("project_id", project.id)
    .order("turn_order", { ascending: true, nullsFirst: false });

  const userIds = (collabRows ?? []).map((c) => c.user_id);
  const { data: authUsers } =
    userIds.length > 0
      ? await admin
          .from("users")
          .select("id, display_name")
          .in("id", userIds)
      : { data: [] as Array<{ id: string; display_name: string | null }> };
  // Fetch emails via auth admin (RLS-bypass path).
  const emailById: Record<string, string | null> = {};
  for (const id of userIds) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(id);
      emailById[id] = u?.user?.email ?? null;
    } catch {
      emailById[id] = null;
    }
  }

  const nameById: Record<string, string | null> = {};
  for (const r of authUsers ?? []) nameById[r.id] = r.display_name;

  const collaborators: CollaboratorEntry[] = (collabRows ?? []).map((c) => ({
    id: c.id,
    user_id: c.user_id,
    role: String(c.role ?? "editor"),
    turn_order: c.turn_order,
    display_name: nameById[c.user_id] ?? null,
    email: emailById[c.user_id] ?? null,
    isOwner: c.user_id === project.owner_id,
  }));

  const { data: inviteRows } = await admin
    .from("invitations")
    .select("id, email, token, role, expires_at, accepted_at")
    .eq("project_id", project.id)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  const pendingInvitations: PendingInvitation[] = (inviteRows ?? [])
    .filter((r) => new Date(r.expires_at) >= new Date())
    .map((r) => ({
      id: r.id,
      email: r.email,
      token: r.token,
      role: String(r.role ?? "editor"),
      expires_at: r.expires_at,
    }));

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
      isOwner={isOwner}
      collaborators={collaborators}
      pendingInvitations={pendingInvitations}
      origin={computeOrigin()}
    />
  );
}
