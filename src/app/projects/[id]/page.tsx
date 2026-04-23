import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProjectEditor, {
  type CollaboratorEntry,
  type PendingInvitation,
  type LastEditor,
} from "./ProjectEditor";
import type { ProjectTypeId } from "@/lib/projectTypes";
import { FALLBACK_COLOR, colorForTurnOrder } from "@/lib/colors";
import { getUnreadCount } from "@/lib/notifications/actions";

export const dynamic = "force-dynamic";

type SectionRow = { id: string; title: string | null; position: number };

type SnapshotRow = {
  section_id: string;
  content_text: string;
  saved_by: string | null;
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

  // Admin client for server-render reads so the page works regardless of
  // which RLS migrations the user has applied. Access is gated below by an
  // explicit owner-or-collaborator check.
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, title, project_type, collab_mode, status, owner_id, completed_at, is_public, license")
    .eq("id", params.id)
    .maybeSingle();

  if (!project) notFound();

  const isOwner = project.owner_id === user.id;

  if (!isOwner) {
    const { data: membership } = await admin
      .from("collaborators")
      .select("id")
      .eq("project_id", project.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) notFound();
  }

  const { data: sectionsData } = await admin
    .from("sections")
    .select("id, title, position")
    .eq("project_id", project.id)
    .order("position", { ascending: true });

  const sections = (sectionsData ?? []) as SectionRow[];

  const { data: snapshotsData } = await admin
    .from("content_snapshots")
    .select("section_id, content_text, saved_by, created_at")
    .in(
      "section_id",
      sections.map((s) => s.id),
    )
    .order("created_at", { ascending: false });

  const latestBySection: Record<string, SnapshotRow> = {};
  for (const snap of (snapshotsData ?? []) as SnapshotRow[]) {
    if (!(snap.section_id in latestBySection)) {
      latestBySection[snap.section_id] = snap;
    }
  }
  const initialContent: Record<string, string> = Object.fromEntries(
    sections.map((s) => [s.id, latestBySection[s.id]?.content_text ?? ""]),
  );

  // Relay state — who currently holds the turn
  const { data: relayStateRow } = await admin
    .from("relay_state")
    .select("current_holder")
    .eq("project_id", project.id)
    .maybeSingle();

  const currentHolderId = relayStateRow?.current_holder ?? project.owner_id;
  const isMyTurn = currentHolderId === user.id;

  // Collaborators (includes color + turn_order from DB)
  let { data: collabRows } = await admin
    .from("collaborators")
    .select("id, user_id, role, turn_order, color, users(display_name)")
    .eq("project_id", project.id)
    .order("turn_order", { ascending: true, nullsFirst: false });

  // Self-heal: pre-seed/backfill gap. If the owner isn't in the collaborators
  // table yet (project created before the owner-seed logic or before migration
  // 007's backfill ran), insert them now so they appear in the turn order and
  // their avatar color resolves correctly.
  const ownerInList = (collabRows ?? []).some(
    (c) => c.user_id === project.owner_id,
  );
  if (!ownerInList) {
    await admin.from("collaborators").insert({
      project_id: project.id,
      user_id: project.owner_id,
      role: "editor",
      turn_order: 1,
      color: "#0BBFBF",
      invited_by: project.owner_id,
    });
    const { data: refreshed } = await admin
      .from("collaborators")
      .select("id, user_id, role, turn_order, color, users(display_name)")
      .eq("project_id", project.id)
      .order("turn_order", { ascending: true, nullsFirst: false });
    collabRows = refreshed;
  }

  const userIds = (collabRows ?? []).map((c) => c.user_id);
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
  for (const r of collabRows ?? []) {
    const rel = r.users as
      | { display_name: string | null }
      | { display_name: string | null }[]
      | null;
    const row = Array.isArray(rel) ? rel[0] : rel;
    nameById[r.user_id] = row?.display_name ?? null;
  }

  const collaborators: CollaboratorEntry[] = (collabRows ?? []).map((c) => ({
    id: c.id,
    user_id: c.user_id,
    role: String(c.role ?? "editor"),
    turn_order: c.turn_order,
    color:
      (typeof c.color === "string" && c.color.length > 0
        ? c.color
        : colorForTurnOrder(c.turn_order)) || FALLBACK_COLOR,
    display_name: nameById[c.user_id] ?? null,
    email: emailById[c.user_id] ?? null,
    isOwner: c.user_id === project.owner_id,
  }));

  const currentHolder = collaborators.find((c) => c.user_id === currentHolderId);
  const currentHolderName =
    currentHolder?.display_name?.trim() ||
    currentHolder?.email ||
    (currentHolderId === user.id ? "you" : "a collaborator");
  const currentHolderColor = currentHolder?.color ?? FALLBACK_COLOR;

  // Last editor per section
  const lastEditorBySection: Record<string, LastEditor | null> = {};
  for (const s of sections) {
    const savedById = latestBySection[s.id]?.saved_by ?? null;
    if (!savedById) {
      lastEditorBySection[s.id] = null;
      continue;
    }
    const editor = collaborators.find((c) => c.user_id === savedById);
    lastEditorBySection[s.id] = editor
      ? {
          name: editor.display_name?.trim() || editor.email || "Someone",
          color: editor.color,
        }
      : null;
  }

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
  const myCollab = collaborators.find((c) => c.user_id === user.id);
  const myColor =
    myCollab?.color ||
    colorForTurnOrder(myCollab?.turn_order ?? 1);
  const unreadNotifications = await getUnreadCount();

  // Comment counts per section
  const commentCountsBySection: Record<string, number> = {};
  if (sections.length > 0) {
    const { data: commentRows } = await admin
      .from("comments")
      .select("section_id")
      .in(
        "section_id",
        sections.map((s) => s.id),
      );
    for (const row of (commentRows ?? []) as Array<{ section_id: string }>) {
      commentCountsBySection[row.section_id] =
        (commentCountsBySection[row.section_id] ?? 0) + 1;
    }
  }

  return (
    <ProjectEditor
      project={{
        id: project.id,
        title: project.title,
        project_type: project.project_type as ProjectTypeId,
        collab_mode: project.collab_mode as "relay" | "live",
        status: String(project.status ?? "active"),
        completed_at: (project.completed_at as string | null) ?? null,
        is_public: Boolean(project.is_public),
        license: String(project.license ?? "all-rights-reserved"),
      }}
      sections={sections}
      initialContent={initialContent}
      displayName={displayName}
      initial={initial}
      myColor={myColor}
      isOwner={isOwner}
      collaborators={collaborators}
      pendingInvitations={pendingInvitations}
      origin={computeOrigin()}
      currentHolderId={currentHolderId}
      currentHolderName={currentHolderName}
      currentHolderColor={currentHolderColor}
      isMyTurn={isMyTurn}
      lastEditorBySection={lastEditorBySection}
      unreadNotifications={unreadNotifications}
      commentCountsBySection={commentCountsBySection}
      userId={user.id}
    />
  );
}
