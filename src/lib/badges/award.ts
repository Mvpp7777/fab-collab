import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { type BadgeId, BADGES } from "../badges";

export type AwardedBadge = { id: BadgeId; name: string; emoji: string };

async function ensureBadge(userId: string, badgeId: BadgeId): Promise<boolean> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badgeId)
    .maybeSingle();
  if (existing) return false;
  const { error } = await admin.from("user_badges").insert({
    user_id: userId,
    badge_id: badgeId,
  });
  if (error) return false;
  const meta = BADGES.find((b) => b.id === badgeId);
  if (!meta) return true;
  await admin.from("notifications").insert({
    user_id: userId,
    type: "badge_earned",
    body: `${meta.emoji} You earned the ${meta.name} badge!`,
    link: null,
    read: false,
  });
  return true;
}

// Best-effort evaluator. Call after any event that could unlock a badge.
// Never throws.
export async function checkAndAwardBadges(userId: string): Promise<AwardedBadge[]> {
  const awarded: AwardedBadge[] = [];
  try {
    const admin = createAdminClient();

    // Project-derived stats (single shot).
    const { data: ownedProjects } = await admin
      .from("projects")
      .select("id, project_type, status")
      .eq("owner_id", userId);
    const owned = ownedProjects ?? [];
    const completed = owned.filter((p) => p.status === "completed");
    const completedSongs = completed.filter((p) => p.project_type === "song");
    const completedThinkTanks = completed.filter(
      (p) => p.project_type === "think_tank",
    );

    if (completedSongs.length >= 1 && (await ensureBadge(userId, "first_song"))) {
      awarded.push({ id: "first_song", name: "First Song", emoji: "🎵" });
    }
    if (completed.length >= 10 && (await ensureBadge(userId, "legend"))) {
      awarded.push({ id: "legend", name: "Legend", emoji: "🏆" });
    }
    if (
      completedThinkTanks.length >= 1 &&
      (await ensureBadge(userId, "think_tank"))
    ) {
      awarded.push({ id: "think_tank", name: "Think Tank", emoji: "💡" });
    }

    // First Collab: completed project with >=2 collaborators.
    if (completed.length > 0) {
      const { data: collabRows } = await admin
        .from("collaborators")
        .select("project_id")
        .in(
          "project_id",
          completed.map((p) => p.id),
        );
      const counts = new Map<string, number>();
      for (const r of collabRows ?? []) {
        const id = r.project_id as string;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const hasFirstCollab = Array.from(counts.values()).some((n) => n >= 2);
      if (hasFirstCollab && (await ensureBadge(userId, "first_collab"))) {
        awarded.push({ id: "first_collab", name: "First Collab", emoji: "🤝" });
      }
    }

    // Community Builder: 5+ distinct collaborators across all owned projects.
    if (owned.length > 0) {
      const { data: allCollabs } = await admin
        .from("collaborators")
        .select("user_id")
        .in(
          "project_id",
          owned.map((p) => p.id),
        )
        .neq("user_id", userId);
      const distinct = new Set(
        (allCollabs ?? []).map((r) => r.user_id as string),
      );
      if (distinct.size >= 5 && (await ensureBadge(userId, "community_builder"))) {
        awarded.push({
          id: "community_builder",
          name: "Community Builder",
          emoji: "🌍",
        });
      }
    }

    // Campaign Creator / Viral
    const { data: campaigns } = await admin
      .from("campaigns")
      .select("id, spots_filled")
      .eq("owner_id", userId);
    if ((campaigns?.length ?? 0) >= 1 && (await ensureBadge(userId, "campaign_creator"))) {
      awarded.push({
        id: "campaign_creator",
        name: "Campaign Creator",
        emoji: "📢",
      });
    }
    if (
      (campaigns ?? []).some((c) => (c.spots_filled ?? 0) >= 50) &&
      (await ensureBadge(userId, "viral"))
    ) {
      awarded.push({ id: "viral", name: "Viral", emoji: "🚀" });
    }

    // Writing streak badges: requires the streak computation. Approximate by
    // checking distinct ISO weeks in last 5 weeks of content_snapshots.
    const since = new Date(Date.now() - 5 * 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSaves } = await admin
      .from("content_snapshots")
      .select("created_at")
      .eq("saved_by", userId)
      .gte("created_at", since);
    const weeks = new Set<string>();
    for (const r of recentSaves ?? []) {
      const d = new Date(r.created_at as string);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
      );
      weeks.add(`${d.getUTCFullYear()}-W${weekNo}`);
    }
    if (weeks.size >= 3 && (await ensureBadge(userId, "on_a_roll"))) {
      awarded.push({ id: "on_a_roll", name: "On a Roll", emoji: "🔥" });
    }
    if (weeks.size >= 4 && (await ensureBadge(userId, "consistent_creator"))) {
      awarded.push({
        id: "consistent_creator",
        name: "Consistent Creator",
        emoji: "⭐",
      });
    }
  } catch {
    // best-effort
  }
  return awarded;
}
