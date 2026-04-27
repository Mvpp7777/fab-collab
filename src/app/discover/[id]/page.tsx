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
  saved_by?: string | null;
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
    .select("section_id, content_text, created_at, saved_by")
    .in("section_id", sections.map((s) => s.id))
    .order("created_at", { ascending: false });

  const latestBySection: Record<string, string> = {};
  for (const snap of (snapshotsData ?? []) as SnapshotRow[]) {
    if (!(snap.section_id in latestBySection)) {
      latestBySection[snap.section_id] = snap.content_text;
    }
  }

  // Chronological timeline for the "How this was created" strip.
  const orderedSaves = [...((snapshotsData ?? []) as SnapshotRow[])].sort(
    (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
  );
  const sectionTitleById: Record<string, string> = Object.fromEntries(
    sections.map((s) => [s.id, s.title ?? `Section ${s.position + 1}`]),
  );

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
          <Link href="/" aria-label="Collab It home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
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

        {orderedSaves.length > 0 && (
          <section className="mt-12 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-display text-2xl font-extrabold text-ocean">
              How this was created
            </h2>
            <p className="mt-1 text-sm text-ocean/70">
              Every contribution timestamped and attributed
            </p>
            <ol className="mt-6 space-y-3 border-l-2 border-ocean/10 pl-4">
              {orderedSaves.map((s, i) => {
                const editor = contributors.find(
                  (_, idx) =>
                    collabRows[idx]?.user_id === s.saved_by,
                );
                const name = editor?.name ?? "Someone";
                const color = editor?.color ?? "#0BBFBF";
                const words = (s.content_text || "").trim().split(/\s+/).filter(Boolean).length;
                return (
                  <li key={i} className="relative">
                    <span
                      style={{ backgroundColor: color }}
                      className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full ring-2 ring-white"
                    />
                    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-semibold" style={{ color }}>
                        {name}
                      </span>
                      <span className="text-ocean/60">
                        on {sectionTitleById[s.section_id] ?? "a section"}
                      </span>
                      <span className="text-xs text-ocean/50">
                        · ~{words} words · {new Date(s.created_at).toLocaleString()}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

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
