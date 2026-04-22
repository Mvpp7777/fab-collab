import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { FALLBACK_COLOR, colorForTurnOrder } from "@/lib/colors";

export const dynamic = "force-dynamic";

type DiscoverProjectRow = {
  id: string;
  title: string;
  project_type: string;
  completed_at: string | null;
  updated_at: string;
};

type ContributorRow = {
  project_id: string;
  user_id: string;
  turn_order: number | null;
  color: string | null;
};

type UserNameRow = {
  id: string;
  display_name: string | null;
};

export default async function DiscoverIndex() {
  const admin = createAdminClient();

  const { data: projectsData } = await admin
    .from("projects")
    .select("id, title, project_type, completed_at, updated_at")
    .eq("is_public", true)
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(60);

  const projects = (projectsData ?? []) as DiscoverProjectRow[];
  const projectIds = projects.map((p) => p.id);

  const { data: collabData } =
    projectIds.length > 0
      ? await admin
          .from("collaborators")
          .select("project_id, user_id, turn_order, color")
          .in("project_id", projectIds)
          .order("turn_order", { ascending: true })
      : { data: [] as ContributorRow[] };

  const collabRows = (collabData ?? []) as ContributorRow[];
  const userIds = Array.from(new Set(collabRows.map((c) => c.user_id)));

  const { data: usersData } =
    userIds.length > 0
      ? await admin
          .from("users")
          .select("id, display_name")
          .in("id", userIds)
      : { data: [] as UserNameRow[] };

  const nameById: Record<string, string> = {};
  for (const u of (usersData ?? []) as UserNameRow[]) {
    nameById[u.id] = u.display_name?.trim() || "Someone";
  }

  const contributorsByProject: Record<
    string,
    Array<{ name: string; color: string }>
  > = {};
  for (const c of collabRows) {
    const list = contributorsByProject[c.project_id] ?? [];
    list.push({
      name: nameById[c.user_id] ?? "Someone",
      color:
        (typeof c.color === "string" && c.color.length > 0
          ? c.color
          : colorForTurnOrder(c.turn_order)) || FALLBACK_COLOR,
    });
    contributorsByProject[c.project_id] = list;
  }

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Fab Collab home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">fab</span>
              <span className="text-lagoon">collab</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-ocean/70 hover:text-ocean"
            >
              Dashboard
            </Link>
            <Link
              href="/auth/signup"
              style={{ backgroundColor: "#FF6B47", color: "white" }}
              className="rounded-full px-4 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
            >
              Start writing
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-ocean sm:text-5xl">
            Discover
          </h1>
          <p className="mt-3 font-display text-lg text-ocean/70 sm:text-xl">
            Completed projects shared by the Fab Collab community.
          </p>
        </section>

        <section className="mt-12">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ocean/20 bg-white/60 px-6 py-20 text-center">
              <p className="font-display text-xl font-semibold text-ocean">
                Nothing here yet
              </p>
              <p className="mt-2 max-w-sm text-sm text-ocean/70">
                When people finish a project and choose to share it, their work
                will show up here.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const meta = PROJECT_TYPES.find(
                  (t) => t.id === (p.project_type as ProjectTypeId),
                );
                const contributors = contributorsByProject[p.id] ?? [];
                const completedStr = p.completed_at
                  ? new Date(p.completed_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : null;
                return (
                  <li
                    key={p.id}
                    className="flex flex-col rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ocean/60">
                      <span aria-hidden>{meta?.emoji ?? "✨"}</span>
                      <span>{meta?.label ?? p.project_type}</span>
                    </div>
                    <div className="mt-3 font-display text-xl font-bold text-ocean">
                      {p.title}
                    </div>
                    {contributors.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {contributors.map((c, i) => (
                          <li
                            key={i}
                            style={{ backgroundColor: c.color, color: "white" }}
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          >
                            {c.name}
                          </li>
                        ))}
                      </ul>
                    )}
                    {completedStr && (
                      <div className="mt-4 text-xs text-ocean/50">
                        Completed {completedStr}
                      </div>
                    )}
                    <Link
                      href={`/discover/${p.id}`}
                      className="mt-4 inline-block self-start rounded-full border border-ocean/15 bg-white px-3 py-1.5 text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
                    >
                      View →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
