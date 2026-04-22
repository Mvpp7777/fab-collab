import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import NotificationsBell from "@/components/NotificationsBell";
import { createClient } from "@/lib/supabase/server";
import { getUnreadCount } from "@/lib/notifications/actions";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  title: string;
  project_type: ProjectTypeId;
  updated_at: string;
};

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
