import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDigestEmail } from "@/lib/resend";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://fabcollab.vercel.app";

export type DigestRunSummary = {
  scanned: number;
  candidates: number;
  sent: number;
  failed: number;
};

// Find users whose pending turns haven't been touched in >3 days and send
// them a digest. Intended to be triggered manually (admin button) or by a
// future cron. Returns a summary.
export async function sendWeeklyDigest(): Promise<DigestRunSummary> {
  const admin = createAdminClient();
  const summary: DigestRunSummary = { scanned: 0, candidates: 0, sent: 0, failed: 0 };

  const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: states } = await admin
    .from("relay_state")
    .select("project_id, current_holder, updated_at");
  const stale = (states ?? []).filter(
    (s) => s.current_holder && (s.updated_at as string) < threshold,
  );
  summary.scanned = (states ?? []).length;

  // Group stale holders -> project list
  const byUser = new Map<string, Array<{ projectId: string }>>();
  for (const s of stale) {
    const list = byUser.get(s.current_holder as string) ?? [];
    list.push({ projectId: s.project_id as string });
    byUser.set(s.current_holder as string, list);
  }
  summary.candidates = byUser.size;

  for (const [userId, projects] of Array.from(byUser.entries())) {
    const { data: userRow } = await admin
      .from("users")
      .select("id, display_name, email_digest_enabled")
      .eq("id", userId)
      .maybeSingle();
    if (!userRow) continue;
    if (userRow.email_digest_enabled === false) continue;

    const { data: auth } = await admin.auth.admin.getUserById(userId);
    const email = auth?.user?.email;
    if (!email) continue;

    const { data: projRows } = await admin
      .from("projects")
      .select("id, title")
      .in(
        "id",
        projects.map((p) => p.projectId),
      );
    const pendingTurns = (projRows ?? []).map((p) => ({
      title: String(p.title),
      url: `${SITE}/projects/${p.id}`,
    }));
    if (pendingTurns.length === 0) continue;

    // Unread count
    const { count: unread } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    const result = await sendDigestEmail({
      to: email,
      userName: userRow.display_name?.trim() || "there",
      pendingTurns,
      streakWeeks: 0,
      unreadNotifications: unread ?? 0,
    });
    if (result.ok) summary.sent += 1;
    else summary.failed += 1;
  }

  return summary;
}
