import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import NotificationsBell from "@/components/NotificationsBell";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnreadCount } from "@/lib/notifications/actions";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  title: string;
  project_type: ProjectTypeId;
  updated_at: string;
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
      .select("id, title, project_type, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });
    projects = (data ?? []) as ProjectRow[];
  } catch {
    projects = [];
  }

  const hasProjects = projects.length > 0;
  const unreadNotifications = await getUnreadCount();

  // Writing streak — consecutive weeks (ending this week) with at least
  // one content_snapshots save by the current user. Admin client so we
  // don't depend on RLS for snapshots owned by the viewer.
  const streak = await computeStreak(user.id);
  const streakBadge = badgeForStreak(streak);

  return (
    <div className="min-h-screen bg-foam">
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
              href="/projects/new"
              className="rounded-full bg-coral px-4 py-2 font-display text-sm font-semibold text-white shadow transition hover:brightness-110 active:scale-95"
            >
              + New project
            </Link>
            <NotificationsBell initialUnread={unreadNotifications} />
            <span className="hidden text-sm text-ocean/80 sm:inline">
              {displayName}
            </span>
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
          {streak > 0 && (
            <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm">
              <span className="text-xl" aria-hidden>
                🔥
              </span>
              <span className="font-display text-sm font-semibold text-ocean">
                {streak}-week streak
                {streak >= 2 ? " — keep going!" : " — you're on a roll!"}
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
          )}
        </section>

        <section className="mt-12">
          {hasProjects ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const meta = PROJECT_TYPES.find((t) => t.id === p.project_type);
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ocean/60">
                      <span aria-hidden>{meta?.emoji ?? "✨"}</span>
                      <span>{meta?.label ?? p.project_type}</span>
                    </div>
                    <div className="mt-3 font-display text-xl font-bold text-ocean">
                      {p.title}
                    </div>
                  </Link>
                );
              })}
            </div>
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
