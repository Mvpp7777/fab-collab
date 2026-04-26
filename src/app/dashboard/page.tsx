import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import NotificationsBell from "@/components/NotificationsBell";
import OnboardingModal from "@/components/OnboardingModal";
import GettingStartedChecklist from "@/components/GettingStartedChecklist";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnreadCount } from "@/lib/notifications/actions";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import ProjectsBrowser, {
  type DashboardProjectRow,
} from "./ProjectsBrowser";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  title: string;
  project_type: ProjectTypeId;
  updated_at: string;
  status: string;
};

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// ISO-week key (Mon-start): "YYYY-Www". Consistent across timezones using UTC.
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

async function computeStreak(userId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    // Look back at most one year's worth of saves — plenty for streak math.
    const since = new Date(Date.now() - 53 * MS_PER_WEEK).toISOString();
    const { data } = await admin
      .from("content_snapshots")
      .select("created_at")
      .eq("saved_by", userId)
      .gte("created_at", since);
    const weeks = new Set<string>();
    for (const row of (data ?? []) as Array<{ created_at: string }>) {
      weeks.add(isoWeekKey(new Date(row.created_at)));
    }
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 53; i++) {
      const key = isoWeekKey(cursor);
      if (weeks.has(key)) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 7);
      } else {
        // Allow the *current* week to be empty — start counting from last week.
        if (i === 0) {
          cursor.setUTCDate(cursor.getUTCDate() - 7);
          continue;
        }
        break;
      }
    }
    return streak;
  } catch {
    return 0;
  }
}

function badgeForStreak(streak: number): string | null {
  if (streak >= 52) return "🏆 1-year streak";
  if (streak >= 13) return "💎 3-month streak";
  if (streak >= 4) return "⭐ 1-month streak";
  if (streak >= 1) return "🌱 1-week streak";
  return null;
}

function streakMessage(streak: number): string {
  if (streak === 0) return "Start your streak — write something today!";
  if (streak >= 12) return `${streak} week streak — legendary!`;
  if (streak >= 4) return `${streak} week streak — you're on fire!`;
  return `${streak} week streak — keep writing!`;
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full border border-ocean/10 bg-foam/60 px-4 py-1.5 text-sm text-ocean">
      <span className="font-display font-bold text-lagoon">{value}</span>{" "}
      <span className="text-ocean/70">{label}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const displayName =
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    user.email ||
    "there";

  let projects: ProjectRow[] = [];
  try {
    const { data } = await supabase
      .from("projects")
      .select("id, title, project_type, updated_at, status")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });
    projects = (data ?? []) as ProjectRow[];
  } catch {
    projects = [];
  }

  const hasProjects = projects.length > 0;

  // Collaborator counts per project (admin client bypasses RLS).
  const admin = createAdminClient();
  const projectIds = projects.map((p) => p.id);
  const collaboratorCountByProject: Record<string, number> = {};
  if (projectIds.length > 0) {
    const { data: collabRows } = await admin
      .from("collaborators")
      .select("project_id")
      .in("project_id", projectIds);
    for (const r of (collabRows ?? []) as Array<{ project_id: string }>) {
      collaboratorCountByProject[r.project_id] =
        (collaboratorCountByProject[r.project_id] ?? 0) + 1;
    }
  }

  const enriched: DashboardProjectRow[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    project_type: p.project_type,
    updated_at: p.updated_at,
    status: String(p.status ?? "active"),
    collaborator_count: collaboratorCountByProject[p.id] ?? 1,
  }));

  const totalProjects = enriched.length;
  const activeCollaborations = enriched.filter(
    (p) => p.collaborator_count > 1 && p.status !== "completed",
  ).length;
  const completedCount = enriched.filter(
    (p) => p.status === "completed",
  ).length;
  const mostRecent = enriched[0];
  const mostRecentMeta = mostRecent
    ? PROJECT_TYPES.find((t) => t.id === mostRecent.project_type)
    : null;
  const unreadNotifications = await getUnreadCount();

  // Writing streak — consecutive weeks (ending this week) with at least
  // one content_snapshots save by the current user. Admin client so we
  // don't depend on RLS for snapshots owned by the viewer.
  const streak = await computeStreak(user.id);
  const streakBadge = badgeForStreak(streak);

  // Username for profile link (may be null if user hasn't completed profile yet).
  const { data: profileRow } = await admin
    .from("users")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  const myUsername = (profileRow?.username as string | null) ?? null;

  // Getting-started checklist hints (server-derived).
  const hintsHasProject = enriched.length > 0;
  const hintsHasCollaborator = enriched.some((p) => p.collaborator_count > 1);
  const hintsHasCompleted = enriched.some((p) => p.status === "completed");
  let hintsHasContribution = false;
  let hintsHasFeedbackToken = false;
  try {
    const { count } = await admin
      .from("content_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("saved_by", user.id);
    hintsHasContribution = (count ?? 0) > 0;
  } catch {
    /* ignore */
  }
  if (enriched.length > 0) {
    const { data: tokRows } = await admin
      .from("projects")
      .select("id")
      .eq("owner_id", user.id)
      .not("feedback_token", "is", null)
      .limit(1);
    hintsHasFeedbackToken = (tokRows?.length ?? 0) > 0;
  }

  return (
    <div className="min-h-screen bg-foam">
      {!hasProjects && <OnboardingModal userId={user.id} />}
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Fab Collab home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">fab</span>
              <span className="text-lagoon">collab</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/discover"
              className="hidden text-sm font-medium text-ocean/70 transition hover:text-ocean sm:inline"
            >
              Discover
            </Link>
            <Link
              href="/industry"
              className="hidden text-sm font-medium text-ocean/70 transition hover:text-ocean sm:inline"
            >
              Industry
            </Link>
            <Link
              href="/invest"
              className="hidden text-sm font-medium text-ocean/70 transition hover:text-ocean sm:inline"
            >
              Invest
            </Link>
            <Link
              href="/experts"
              className="hidden text-sm font-medium text-ocean/70 transition hover:text-ocean sm:inline"
            >
              Experts
            </Link>
            <Link
              href="/campaign/new"
              className="hidden text-sm font-medium text-ocean/70 transition hover:text-ocean sm:inline"
            >
              Launch campaign
            </Link>
            <Link
              href="/projects/new"
              className="rounded-full bg-coral px-4 py-2 font-display text-sm font-semibold text-white shadow transition hover:brightness-110 active:scale-95"
            >
              + New project
            </Link>
            <NotificationsBell initialUnread={unreadNotifications} />
            <ThemeToggle />
            <Link
              href={myUsername ? `/profile/${myUsername}` : "/profile/edit"}
              className="hidden text-sm font-medium text-ocean/80 hover:text-ocean sm:inline"
              aria-label="Your profile"
            >
              {displayName}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section>
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-ocean sm:text-5xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-3 font-display text-lg text-ocean/70 sm:text-xl">
            What are you creating today?
          </p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm">
            <span className="text-xl" aria-hidden>
              {streak === 0 ? "✨" : streak >= 12 ? "⭐" : "🔥"}
            </span>
            <span className="font-display text-sm font-semibold text-ocean">
              {streakMessage(streak)}
            </span>
            {streakBadge && (
              <span
                style={{ backgroundColor: "#0BBFBF", color: "white" }}
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              >
                {streakBadge}
              </span>
            )}
          </div>
        </section>

        {hasProjects && (
          <section className="mt-8">
            <div className="flex flex-wrap items-center gap-2">
              <StatChip label="Projects" value={totalProjects} />
              <StatChip label="Active collaborations" value={activeCollaborations} />
              <StatChip label="Completed" value={completedCount} />
            </div>
            {completedCount > 0 && (
              <p className="mt-3 text-xs italic text-ocean/60">
                Completed projects are visible to industry scouts when our portal launches Summer 2026.
              </p>
            )}
          </section>
        )}

        <GettingStartedChecklist
          userId={user.id}
          hints={{
            hasProject: hintsHasProject,
            hasCollaborator: hintsHasCollaborator,
            hasContribution: hintsHasContribution,
            hasCompleted: hintsHasCompleted,
            hasFeedbackToken: hintsHasFeedbackToken,
          }}
        />

        {mostRecent && (
          <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
                Continue where you left off
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-ocean/60">
                <span aria-hidden>{mostRecentMeta?.emoji ?? "✨"}</span>
                <span>{mostRecentMeta?.label ?? mostRecent.project_type}</span>
              </div>
              <div className="mt-1 truncate font-display text-2xl font-bold text-ocean">
                {mostRecent.title}
              </div>
            </div>
            <Link
              href={`/projects/${mostRecent.id}`}
              style={{ backgroundColor: "#FF6B47", color: "white" }}
              className="mt-4 inline-block rounded-full px-5 py-2.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 sm:mt-0"
            >
              Continue writing →
            </Link>
          </section>
        )}

        <section className="mt-10">
          {hasProjects ? (
            <ProjectsBrowser projects={enriched} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ocean/20 bg-white/60 px-6 py-20 text-center">
              <p className="font-display text-xl font-semibold text-ocean">
                No projects yet
              </p>
              <p className="mt-2 max-w-sm text-sm text-ocean/70">
                Spin up your first song, screenplay, or story and invite a
                collaborator.
              </p>
              <Link
                href="/projects/new"
                style={{ backgroundColor: "#FF6B47", color: "white" }}
                className="mt-8 rounded-full px-6 py-3 font-display text-base font-semibold shadow transition hover:brightness-110 active:scale-95"
              >
                Create your first project
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
