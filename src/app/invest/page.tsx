import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { buildTeaser } from "@/lib/shareTeaser";
import InterestButton from "./InterestButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invest — Fab Collab",
  description:
    "Discover Think Tank projects seeking funding from the Fab Collab community.",
};

const THINK_TANK_TYPES = [
  "think_tank",
  "community_challenge",
  "research_collective",
  "innovation_sprint",
] as const;

type ProjectRow = {
  id: string;
  title: string;
  project_type: string;
  description: string | null;
  owner_id: string;
  seeking_investment_at: string | null;
};

export default async function InvestPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);

  const admin = createAdminClient();
  const { data: projectsData } = await admin
    .from("projects")
    .select("id, title, project_type, description, owner_id, seeking_investment_at")
    .eq("is_seeking_investment", true)
    .in("project_type", THINK_TANK_TYPES as unknown as string[])
    .order("seeking_investment_at", { ascending: false, nullsFirst: false })
    .limit(60);
  const projects = (projectsData ?? []) as ProjectRow[];
  const projectIds = projects.map((p) => p.id);

  // Pull team size + a brief from the first section per project.
  const collabCounts: Record<string, number> = {};
  if (projectIds.length > 0) {
    const { data: collabs } = await admin
      .from("collaborators")
      .select("project_id")
      .in("project_id", projectIds);
    for (const row of (collabs ?? []) as Array<{ project_id: string }>) {
      collabCounts[row.project_id] = (collabCounts[row.project_id] ?? 0) + 1;
    }
  }

  // First section content for each project (used as a fallback brief when
  // the owner hasn't set a description).
  const briefs: Record<string, string> = {};
  if (projectIds.length > 0) {
    const { data: sections } = await admin
      .from("sections")
      .select("id, project_id, position")
      .in("project_id", projectIds)
      .order("position", { ascending: true });
    const firstSectionByProject: Record<string, string> = {};
    for (const s of (sections ?? []) as Array<{
      id: string;
      project_id: string;
      position: number;
    }>) {
      if (!(s.project_id in firstSectionByProject)) {
        firstSectionByProject[s.project_id] = s.id;
      }
    }
    const firstSectionIds = Object.values(firstSectionByProject);
    if (firstSectionIds.length > 0) {
      const { data: snaps } = await admin
        .from("content_snapshots")
        .select("section_id, content_text, created_at")
        .in("section_id", firstSectionIds)
        .order("created_at", { ascending: false });
      const latestBySection: Record<string, string> = {};
      for (const snap of (snaps ?? []) as Array<{
        section_id: string;
        content_text: string;
      }>) {
        if (!(snap.section_id in latestBySection)) {
          latestBySection[snap.section_id] = snap.content_text;
        }
      }
      for (const [pid, sid] of Object.entries(firstSectionByProject)) {
        briefs[pid] = buildTeaser(latestBySection[sid] ?? "") ?? "";
      }
    }
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
          <nav className="flex items-center gap-4 text-sm font-medium text-ocean/70">
            <Link href="/discover" className="hover:text-ocean">Discover</Link>
            <Link href="/experts" className="hidden hover:text-ocean sm:inline">Experts</Link>
            {signedIn ? (
              <Link href="/dashboard" className="hover:text-ocean">Dashboard</Link>
            ) : (
              <Link href="/auth/login" className="hover:text-ocean">Log in</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section>
          <div className="inline-block rounded-full bg-lagoon/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-lagoon">
            🦈 Think Tank · Investor Hub
          </div>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-ocean sm:text-5xl">
            Discover investment opportunities
          </h1>
          <p className="mt-3 font-display text-lg text-ocean/70 sm:text-xl">
            Think Tank projects seeking funding from the Fab Collab community.
          </p>
        </section>

        <section className="mt-10">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ocean/20 bg-white/60 px-6 py-20 text-center">
              <p className="font-display text-xl font-semibold text-ocean">
                No open opportunities yet
              </p>
              <p className="mt-2 max-w-md text-sm text-ocean/70">
                When teams open their Think Tanks for investment, they show up here.
                Want to be notified the moment one goes live?{" "}
                <Link href="/experts" className="font-medium text-lagoon hover:underline">
                  Verify as an investor
                </Link>{" "}
                and we&rsquo;ll send you an in-app alert.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const meta = PROJECT_TYPES.find(
                  (t) => t.id === (p.project_type as ProjectTypeId),
                );
                const teamSize = collabCounts[p.id] ?? 1;
                const brief =
                  (p.description?.trim() || briefs[p.id] || "").slice(0, 220);
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
                    <div className="mt-1 text-xs text-ocean/60">
                      Team of {teamSize}
                    </div>
                    {brief && (
                      <p className="mt-3 line-clamp-4 text-sm text-ocean/80">
                        {brief}
                        {brief.length >= 220 ? "…" : ""}
                      </p>
                    )}
                    <div className="flex-1" />
                    <InterestButton projectId={p.id} signedIn={signedIn} />
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
