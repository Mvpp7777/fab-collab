import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { colorForTurnOrder } from "@/lib/colors";
import { licenseMeta } from "@/lib/licenses";
import { BADGES } from "@/lib/badges";

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
  if (!profile) return { title: "Profile · Collab It" };
  const name = profile.display_name?.trim() || params.username;
  return {
    title: `${name} · Collab It`,
    description: profile.bio ?? `${name}'s projects on Collab It`,
    openGraph: {
      title: `${name} · Collab It`,
      description: profile.bio ?? `${name}'s projects on Collab It`,
      type: "profile",
    },
  };
}

type CollabRow = {
  project_id: string;
  turn_order: number | null;
  color: string | null;
};

type ProjectRow = {
  id: string;
  title: string;
  project_type: string;
  status: string;
  is_public: boolean | null;
  completed_at: string | null;
  license: string | null;
  created_at: string;
};

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("users")
    .select("id, display_name, username, bio, created_at")
    .eq("username", params.username)
    .maybeSingle();
  if (!profile) notFound();

  // Stats
  const [
    { count: projectsCreated },
    { count: totalContributions },
    { count: completedProjects },
    { data: collabRows },
  ] = await Promise.all([
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", profile.id),
    admin
      .from("content_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("saved_by", profile.id),
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", profile.id)
      .eq("status", "completed"),
    admin
      .from("collaborators")
      .select("project_id, turn_order, color")
      .eq("user_id", profile.id)
      .returns<CollabRow[]>(),
  ]);

  const collabProjectIds = (collabRows ?? []).map((c) => c.project_id);
  const collaboratedCount = collabProjectIds.length;

  // Public projects where this user was a collaborator
  let publicProjects: ProjectRow[] = [];
  if (collabProjectIds.length > 0) {
    const { data } = await admin
      .from("projects")
      .select("id, title, project_type, status, is_public, completed_at, license, created_at")
      .in("id", collabProjectIds)
      .eq("is_public", true)
      .eq("status", "completed")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(30);
    publicProjects = (data ?? []) as ProjectRow[];
  }

  // Earned badges
  const { data: badgeRows } = await admin
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", profile.id)
    .order("earned_at", { ascending: false });
  const earnedBadges = (badgeRows ?? [])
    .map((b) => BADGES.find((meta) => meta.id === (b.badge_id as string)))
    .filter((x): x is (typeof BADGES)[number] => Boolean(x));

  // Active campaigns owned by this user
  const { data: campaignRows } = await admin
    .from("campaigns")
    .select("slug, title, spots_filled, max_collaborators, reward, status")
    .eq("owner_id", profile.id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(6);

  // Current viewer (to hide Edit button for non-owners)
  let viewerId: string | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    viewerId = user?.id ?? null;
  } catch {
    /* no-op */
  }
  const isMe = viewerId === profile.id;

  const displayName = profile.display_name?.trim() || profile.username || "Creator";
  const initial = displayName.charAt(0).toUpperCase();
  const avatarColor = colorForTurnOrder(1);
  const memberSince = new Date(profile.created_at as string).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );

  const inviteMailto = `mailto:?subject=${encodeURIComponent(
    `Collaborate with me on Collab It`,
  )}&body=${encodeURIComponent(
    `Hey ${displayName},\n\nI'd love to collaborate with you on Collab It. Here's my profile: https://collabit.vercel.app/profile/${profile.username}\n\n— Sent via Collab It`,
  )}`;

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
            href="/discover"
            className="text-sm font-medium text-ocean/70 hover:text-ocean"
          >
            Discover
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div
            style={{ backgroundColor: avatarColor }}
            className="flex h-20 w-20 flex-none items-center justify-center rounded-full font-display text-3xl font-bold text-white shadow-sm"
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-extrabold text-ocean sm:text-4xl">
              {displayName}
            </h1>
            <div className="mt-1 text-sm text-ocean/60">@{profile.username}</div>
            {profile.bio && (
              <p className="mt-3 max-w-xl text-sm text-ocean/80">{profile.bio}</p>
            )}
            <div className="mt-3 text-xs text-ocean/50">
              Member since {memberSince}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isMe ? (
              <Link
                href="/profile/edit"
                className="rounded-full border border-ocean/15 bg-white px-4 py-2 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
              >
                Edit profile
              </Link>
            ) : (
              <a
                href={inviteMailto}
                style={{ backgroundColor: "#FF6B47", color: "white" }}
                className="rounded-full px-4 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
              >
                Invite to collaborate
              </a>
            )}
            <Link
              href={`/portfolio/${profile.username}`}
              className="rounded-full border border-ocean/15 bg-white px-4 py-2 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
            >
              View portfolio →
            </Link>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Projects created" value={projectsCreated ?? 0} />
          <Stat label="Collaborations" value={collaboratedCount} />
          <Stat label="Contributions" value={totalContributions ?? 0} />
          <Stat label="Completed" value={completedProjects ?? 0} />
        </section>

        {earnedBadges.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-extrabold text-ocean">
              Badges
            </h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {earnedBadges.map((b) => (
                <li
                  key={b.id}
                  title={b.description}
                  className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm"
                >
                  <span className="text-xl" aria-hidden>
                    {b.emoji}
                  </span>
                  <span className="font-display text-sm font-semibold text-ocean">
                    {b.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(campaignRows?.length ?? 0) > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-extrabold text-ocean">
              Active campaigns
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(campaignRows ?? []).map((c) => (
                <li key={c.slug} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="font-display text-lg font-bold text-ocean">
                    {c.title}
                  </div>
                  {c.reward && (
                    <div className="mt-2 inline-block rounded-full bg-lagoon/10 px-3 py-0.5 text-xs font-semibold text-lagoon">
                      🏆 {c.reward}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-ocean/60">
                    {c.spots_filled} / {c.max_collaborators} spots filled
                  </div>
                  <Link
                    href={`/campaign/${c.slug}`}
                    className="mt-3 inline-block text-xs font-semibold text-lagoon hover:underline"
                  >
                    View →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl font-extrabold text-ocean">
            Public projects
          </h2>
          {publicProjects.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-ocean/20 bg-white/60 px-6 py-10 text-center text-sm text-ocean/60">
              No public projects yet. Completed projects marked public will appear here.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publicProjects.map((p) => {
                const meta = PROJECT_TYPES.find(
                  (t) => t.id === (p.project_type as ProjectTypeId),
                );
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
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ocean/50">
                      {completedStr && <span>Completed {completedStr}</span>}
                      <span className="rounded-full border border-ocean/15 bg-foam/50 px-2 py-0.5 font-semibold text-ocean/70">
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="font-display text-2xl font-extrabold text-lagoon">
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-ocean/60">
        {label}
      </div>
    </div>
  );
}
