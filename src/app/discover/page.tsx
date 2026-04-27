import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { FALLBACK_COLOR, colorForTurnOrder } from "@/lib/colors";
import { licenseMeta } from "@/lib/licenses";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Discover — Collab It",
  description:
    "Browse completed collaborative projects from songwriters, screenwriters, novelists and more.",
};

type DiscoverProjectRow = {
  id: string;
  title: string;
  project_type: string;
  completed_at: string | null;
  updated_at: string;
  license: string | null;
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

export default async function DiscoverIndex({
  searchParams,
}: {
  searchParams: { genre?: string; q?: string };
}) {
  const genreFilter = (searchParams.genre ?? "").trim();
  const searchQuery = (searchParams.q ?? "").trim();
  const admin = createAdminClient();

  const { data: campaignRows } = await admin
    .from("campaigns")
    .select(
      "id, slug, title, reward, max_collaborators, spots_filled, end_date, status, users(display_name), projects(project_type)",
    )
    .eq("status", "open")
    .order("spots_filled", { ascending: false })
    .limit(12);

  type CampaignCard = {
    slug: string;
    title: string;
    reward: string | null;
    spots_filled: number;
    max_collaborators: number;
    end_date: string | null;
    owner: string;
    projectType: string;
  };
  const liveCampaigns: CampaignCard[] = (campaignRows ?? []).map((c) => {
    const ownerRel = c.users as
      | { display_name: string | null }
      | Array<{ display_name: string | null }>
      | null;
    const ownerRow = Array.isArray(ownerRel) ? ownerRel[0] : ownerRel;
    const projRel = c.projects as
      | { project_type: string }
      | Array<{ project_type: string }>
      | null;
    const projRow = Array.isArray(projRel) ? projRel[0] : projRel;
    return {
      slug: String(c.slug),
      title: String(c.title),
      reward: (c.reward as string | null) ?? null,
      spots_filled: Number(c.spots_filled ?? 0),
      max_collaborators: Number(c.max_collaborators ?? 1),
      end_date: (c.end_date as string | null) ?? null,
      owner: ownerRow?.display_name?.trim() || "Creator",
      projectType: projRow?.project_type ?? "freeform",
    };
  });

  let projectsQuery = admin
    .from("projects")
    .select("id, title, project_type, completed_at, updated_at, license, genre")
    .eq("is_public", true)
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(60);
  if (genreFilter) projectsQuery = projectsQuery.eq("genre", genreFilter);
  if (searchQuery) projectsQuery = projectsQuery.ilike("title", `%${searchQuery}%`);
  const { data: projectsData } = await projectsQuery;

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
          <Link href="/" aria-label="Collab It home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/industry"
              className="text-sm font-medium text-ocean/70 hover:text-ocean"
            >
              Industry
            </Link>
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
        <div className="mb-8 rounded-2xl border border-lagoon/30 bg-lagoon/10 px-5 py-4 text-sm text-ocean">
          🚀 Industry Scout portal coming Summer 2026 — agents and publishers will browse this gallery. Complete your projects and make them public to be ready.
        </div>

        <section>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-ocean sm:text-5xl">
            Discover
          </h1>
          <p className="mt-3 font-display text-lg text-ocean/70 sm:text-xl">
            Completed projects shared by the Collab It community.
          </p>
        </section>

        <form
          method="get"
          className="mt-6 flex flex-wrap items-center gap-2"
        >
          <input
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search titles…"
            className="flex-1 rounded-full border border-ocean/15 bg-white px-4 py-2 text-sm text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
          <select
            name="genre"
            defaultValue={genreFilter}
            className="rounded-full border border-ocean/15 bg-white px-3 py-2 text-sm text-ocean focus:border-lagoon focus:outline-none"
          >
            <option value="">All genres</option>
            <optgroup label="Songs">
              {["Pop","Country","Hip-Hop","Rock","R&B","Electronic","Folk","Jazz","Classical"].map(g => <option key={`s-${g}`} value={g}>{g}</option>)}
            </optgroup>
            <optgroup label="Screenplays">
              {["Drama","Comedy","Thriller","Horror","Sci-Fi","Romance","Action","Documentary"].map(g => <option key={`f-${g}`} value={g}>{g}</option>)}
            </optgroup>
            <optgroup label="Novels">
              {["Literary Fiction","Mystery","Fantasy","Romance","Historical"].map(g => <option key={`n-${g}`} value={g}>{g}</option>)}
            </optgroup>
          </select>
          <button
            type="submit"
            className="rounded-full border border-ocean/15 bg-white px-4 py-2 text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
          >
            Filter
          </button>
        </form>

        {liveCampaigns.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-extrabold text-ocean">
              🔥 Live Campaigns
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveCampaigns.map((c) => {
                const meta = PROJECT_TYPES.find(
                  (t) => t.id === (c.projectType as ProjectTypeId),
                );
                const remaining = Math.max(
                  0,
                  c.max_collaborators - c.spots_filled,
                );
                const pct = Math.min(
                  100,
                  (c.spots_filled / Math.max(1, c.max_collaborators)) * 100,
                );
                const barColor =
                  pct < 50
                    ? "#0BBFBF"
                    : pct < 75
                      ? "#FFB347"
                      : pct < 90
                        ? "#FF6B47"
                        : "#E53935";
                return (
                  <li
                    key={c.slug}
                    className="flex flex-col rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ocean/60">
                      <span aria-hidden>{meta?.emoji ?? "✨"}</span>
                      <span>{meta?.label ?? c.projectType}</span>
                    </div>
                    <div className="mt-3 font-display text-lg font-bold text-ocean">
                      {c.title}
                    </div>
                    <div className="mt-1 text-xs text-ocean/60">
                      by {c.owner}
                    </div>
                    {c.reward && (
                      <div className="mt-3 rounded-full bg-lagoon/10 px-3 py-1 text-xs font-semibold text-lagoon">
                        🏆 {c.reward}
                      </div>
                    )}
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-ocean/70">
                        {remaining} of {c.max_collaborators} spots left
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ocean/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                    <Link
                      href={`/campaign/${c.slug}`}
                      style={{ backgroundColor: "#FF6B47", color: "white" }}
                      className="mt-4 inline-block self-start rounded-full px-4 py-1.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
                    >
                      View campaign →
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

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
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ocean/50">
                      {completedStr && <span>Completed {completedStr}</span>}
                      <span
                        className="rounded-full border border-ocean/15 bg-foam/50 px-2 py-0.5 font-semibold text-ocean/70"
                        title={licenseMeta(p.license).name}
                      >
                        {licenseMeta(p.license).badge}
                      </span>
                    </div>

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
