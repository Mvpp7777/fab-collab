import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { colorForTurnOrder } from "@/lib/colors";
import { licenseMeta } from "@/lib/licenses";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("display_name, bio")
    .eq("username", params.username)
    .maybeSingle();
  if (!profile) return { title: "Portfolio · Collab It" };
  const name = profile.display_name?.trim() || params.username;
  const description =
    profile.bio ?? `${name}'s completed projects on Collab It`;
  return {
    title: `${name}'s portfolio · Collab It`,
    description,
    openGraph: {
      title: `${name}'s portfolio · Collab It`,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name}'s portfolio · Collab It`,
      description,
    },
  };
}

type ProjectRow = {
  id: string;
  title: string;
  project_type: string;
  completed_at: string | null;
  license: string | null;
};

type CollabRow = {
  project_id: string;
  user_id: string;
  color: string | null;
  turn_order: number | null;
};

export default async function PortfolioPage({
  params,
}: {
  params: { username: string };
}) {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("users")
    .select("id, display_name, username, bio")
    .eq("username", params.username)
    .maybeSingle();
  if (!profile) notFound();

  const { data: memberships } = await admin
    .from("collaborators")
    .select("project_id")
    .eq("user_id", profile.id);
  const projectIds = (memberships ?? []).map((m) => m.project_id as string);

  let publicProjects: ProjectRow[] = [];
  if (projectIds.length > 0) {
    const { data: prows } = await admin
      .from("projects")
      .select("id, title, project_type, completed_at, license")
      .in("id", projectIds)
      .eq("is_public", true)
      .eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false });
    publicProjects = (prows ?? []) as ProjectRow[];
  }

  // Collaborator attribution strip per project
  const allCollabsByProject: Record<
    string,
    Array<{ name: string; color: string }>
  > = {};
  if (publicProjects.length > 0) {
    const pIds = publicProjects.map((p) => p.id);
    const { data: crows } = await admin
      .from("collaborators")
      .select("project_id, user_id, color, turn_order")
      .in("project_id", pIds)
      .returns<CollabRow[]>();
    const userIds = Array.from(
      new Set((crows ?? []).map((c) => c.user_id)),
    );
    const { data: urows } =
      userIds.length > 0
        ? await admin
            .from("users")
            .select("id, display_name")
            .in("id", userIds)
        : { data: [] as Array<{ id: string; display_name: string | null }> };
    const nameById: Record<string, string> = {};
    for (const u of urows ?? []) {
      nameById[u.id as string] = (u.display_name as string | null)?.trim() || "Someone";
    }
    for (const c of crows ?? []) {
      const list = allCollabsByProject[c.project_id] ?? [];
      list.push({
        name: nameById[c.user_id] ?? "Someone",
        color: c.color || colorForTurnOrder(c.turn_order),
      });
      allCollabsByProject[c.project_id] = list;
    }
  }

  const displayName =
    profile.display_name?.trim() || profile.username || "Creator";
  const avatarColor = colorForTurnOrder(1);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Collab It home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
            </span>
          </Link>
          <Link
            href={`/profile/${profile.username}`}
            className="text-sm font-medium text-ocean/70 hover:text-ocean"
          >
            Full profile →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <section className="text-center">
          <div
            style={{ backgroundColor: avatarColor }}
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full font-display text-4xl font-bold text-white shadow-sm"
          >
            {initial}
          </div>
          <h1 className="mt-6 font-display text-4xl font-extrabold text-ocean sm:text-5xl">
            {displayName}&rsquo;s portfolio
          </h1>
          {profile.bio && (
            <p className="mx-auto mt-3 max-w-xl text-base text-ocean/70">
              {profile.bio}
            </p>
          )}
          <div className="mt-4 text-sm text-ocean/50">
            collabit.vercel.app/portfolio/{profile.username}
          </div>
        </section>

        <section className="mt-12">
          {publicProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ocean/20 bg-white/60 px-6 py-14 text-center">
              <p className="font-display text-lg font-semibold text-ocean">
                No public projects yet
              </p>
              <p className="mt-1 text-sm text-ocean/60">
                Completed projects marked public will appear here.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {publicProjects.map((p) => {
                const meta = PROJECT_TYPES.find(
                  (t) => t.id === (p.project_type as ProjectTypeId),
                );
                const contributors = allCollabsByProject[p.id] ?? [];
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
                      View project →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className="mt-16 rounded-2xl border border-ocean/10 bg-white p-6 text-center">
          <p className="font-display text-lg font-semibold text-ocean">
            Create your own portfolio on Collab It →
          </p>
          <Link
            href="/auth/signup"
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="mt-4 inline-block rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Start writing →
          </Link>
        </footer>
      </main>
    </div>
  );
}
