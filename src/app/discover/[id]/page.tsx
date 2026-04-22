import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { FALLBACK_COLOR, colorForTurnOrder } from "@/lib/colors";

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

type ContributorRow = {
  user_id: string;
  turn_order: number | null;
  color: string | null;
};

export default async function DiscoverProject({
  params,
}: {
  params: { id: string };
}) {
  const admin = createAdminClient();

  // Only completed + public projects are viewable here.
  const { data: project } = await admin
    .from("projects")
    .select("id, title, project_type, collab_mode, completed_at, is_public, status")
    .eq("id", params.id)
    .eq("is_public", true)
    .eq("status", "completed")
    .maybeSingle();

  if (!project) notFound();

  const { data: sectionsData } = await admin
    .from("sections")
    .select("id, title, position")
    .eq("project_id", project.id)
    .order("position", { ascending: true });
  const sections = (sectionsData ?? []) as SectionRow[];

  const { data: snapshotsData } = await admin
    .from("content_snapshots")
    .select("section_id, content_text, created_at")
    .in("section_id", sections.map((s) => s.id))
    .order("created_at", { ascending: false });

  const latestBySection: Record<string, string> = {};
  for (const snap of (snapshotsData ?? []) as SnapshotRow[]) {
    if (!(snap.section_id in latestBySection)) {
      latestBySection[snap.section_id] = snap.content_text;
    }
  }

  const { data: collabData } = await admin
    .from("collaborators")
    .select("user_id, turn_order, color")
    .eq("project_id", project.id)
    .order("turn_order", { ascending: true });
  const collabRows = (collabData ?? []) as ContributorRow[];
  const userIds = collabRows.map((c) => c.user_id);

  const { data: usersData } =
    userIds.length > 0
      ? await admin
          .from("users")
          .select("id, display_name")
          .in("id", userIds)
      : { data: [] as Array<{ id: string; display_name: string | null }> };

  const nameById: Record<string, string> = {};
  for (const u of usersData ?? []) {
    nameById[u.id] = u.display_name?.trim() || "Someone";
  }

  const contributors = collabRows.map((c) => ({
    name: nameById[c.user_id] ?? "Someone",
    color:
      (typeof c.color === "string" && c.color.length > 0
        ? c.color
        : colorForTurnOrder(c.turn_order)) || FALLBACK_COLOR,
  }));

  const typeMeta = PROJECT_TYPES.find(
    (t) => t.id === (project.project_type as ProjectTypeId),
  );

  const completedStr = project.completed_at
    ? new Date(project.completed_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" aria-label="Fab Collab home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">fab</span>
              <span className="text-lagoon">collab</span>
            </span>
          </Link>
          <Link
            href="/discover"
            className="text-sm font-medium text-ocean/70 hover:text-ocean"
          >
            ← All projects
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
          {typeMeta?.emoji ?? "✨"} {typeMeta?.label ?? project.project_type}
        </div>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight tracking-tight text-ocean sm:text-5xl">
          {project.title}
        </h1>
        {completedStr && (
          <p className="mt-2 text-sm text-ocean/60">Completed {completedStr}</p>
        )}

        {contributors.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {contributors.map((c, i) => (
              <li
                key={i}
                style={{ backgroundColor: c.color, color: "white" }}
                className="rounded-full px-3 py-1 text-sm font-semibold"
              >
                {c.name}
              </li>
            ))}
          </ul>
        )}

        <section className="mt-10 space-y-6">
          {sections.map((s) => (
            <article
              key={s.id}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
                {s.title ?? `Section ${s.position + 1}`}
              </div>
              <div className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-ocean">
                {latestBySection[s.id] || (
                  <span className="italic text-ocean/40">
                    (empty)
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>

        <footer className="mt-12 rounded-2xl border border-ocean/10 bg-white p-6 text-center">
          <p className="font-display text-lg font-semibold text-ocean">
            Want to write something like this?
          </p>
          <Link
            href="/auth/signup"
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="mt-4 inline-block rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Start a project →
          </Link>
        </footer>
      </main>
    </div>
  );
}
