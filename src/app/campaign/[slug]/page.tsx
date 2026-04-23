import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { colorForTurnOrder } from "@/lib/colors";
import CampaignActivity from "./CampaignActivity";
import Countdown from "./Countdown";
import CampaignCTA from "./CampaignCTA";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("campaigns")
    .select("title, description, spots_filled, max_collaborators")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!c) return { title: "Campaign · Fab Collab" };
  const remaining = Math.max(0, c.max_collaborators - c.spots_filled);
  return {
    title: `${c.title} · Fab Collab`,
    description:
      c.description ??
      `${remaining} spots left in this collaboration on Fab Collab.`,
    openGraph: {
      title: `${c.title} · Fab Collab`,
      description:
        c.description ??
        `${remaining} spots left — join before it's full.`,
      type: "website",
    },
  };
}

function computeOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "https://fabcollab.vercel.app";
}

export default async function CampaignLanding({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { error?: string };
}) {
  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select(
      "id, project_id, owner_id, slug, title, description, reward, max_collaborators, spots_filled, end_date, status, users(display_name), projects(project_type)",
    )
    .eq("slug", params.slug)
    .maybeSingle();
  if (!campaign) notFound();

  const ownerRel = campaign.users as
    | { display_name: string | null }
    | Array<{ display_name: string | null }>
    | null;
  const ownerRow = Array.isArray(ownerRel) ? ownerRel[0] : ownerRel;
  const ownerName = ownerRow?.display_name?.trim() || "The creator";
  const ownerInitial = ownerName.charAt(0).toUpperCase();

  const projRel = campaign.projects as
    | { project_type: string }
    | Array<{ project_type: string }>
    | null;
  const projRow = Array.isArray(projRel) ? projRel[0] : projRel;
  const projectType = (projRow?.project_type ?? "freeform") as ProjectTypeId;
  const typeMeta = PROJECT_TYPES.find((t) => t.id === projectType);

  const filled = campaign.spots_filled;
  const max = campaign.max_collaborators;
  const remaining = Math.max(0, max - filled);
  const pct = Math.max(0, Math.min(100, (filled / max) * 100));
  const isFull = campaign.status === "full" || remaining <= 0;

  const scarcity = scarcityTier(pct);

  const currentUser = await (async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    } catch {
      return null;
    }
  })();

  // Recent joins + last-hour aggregate
  const { data: recent } = await admin
    .from("campaign_participants")
    .select("user_id, joined_at, users(display_name)")
    .eq("campaign_id", campaign.id)
    .order("joined_at", { ascending: false })
    .limit(5);

  const recentJoins =
    (recent ?? []).map((r) => {
      const rel = r.users as
        | { display_name: string | null }
        | Array<{ display_name: string | null }>
        | null;
      const row = Array.isArray(rel) ? rel[0] : rel;
      return {
        name: row?.display_name?.trim() || "A collaborator",
        joinedAtIso: r.joined_at as string,
      };
    }) ?? [];

  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count: lastHourCount } = await admin
    .from("campaign_participants")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id)
    .gte("joined_at", oneHourAgo);

  const origin = computeOrigin();
  const shareUrl = `${origin}/campaign/${campaign.slug}`;
  const shareText = `I just got one of the last ${remaining} spots in ${ownerName}'s collab on Fab Collab! Only ${remaining} left: ${shareUrl} 🎵`;

  const ownerColor = colorForTurnOrder(1);

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Fab Collab home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">fab</span>
              <span className="text-lagoon">collab</span>
            </span>
          </Link>
          <Link
            href="/discover"
            className="text-sm font-medium text-ocean/70 hover:text-ocean"
          >
            Browse campaigns
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: ownerColor, color: "white" }}
            className="flex h-10 w-10 items-center justify-center rounded-full font-display text-base font-bold"
          >
            {ownerInitial}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
              {typeMeta?.emoji ?? "✨"} {typeMeta?.label ?? projectType}
            </div>
            <div className="text-sm font-semibold text-ocean">{ownerName}</div>
          </div>
        </div>

        <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-ocean sm:text-5xl">
          {campaign.title}
        </h1>
        {campaign.description && (
          <p className="mt-3 text-base text-ocean/80 sm:text-lg">
            {campaign.description}
          </p>
        )}

        {campaign.reward && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-display text-sm font-semibold text-ocean shadow-sm">
            🏆 <span>Reward:</span>
            <span className="text-lagoon">{campaign.reward}</span>
          </div>
        )}

        {/* Scarcity card */}
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div
                className="font-display text-3xl font-extrabold"
                style={{ color: scarcity.color }}
              >
                {filled} / {max}
              </div>
              <div
                className={`mt-1 font-display text-sm font-semibold ${scarcity.pulse ? "animate-pulse" : ""}`}
                style={{ color: scarcity.color }}
              >
                {isFull ? "Campaign full — join waitlist" : scarcity.label}
              </div>
            </div>
            {campaign.end_date && (
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-wider text-ocean/60">
                  Ends in
                </div>
                <div className="mt-1">
                  <Countdown endDateIso={campaign.end_date} />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-ocean/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: scarcity.color }}
            />
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ocean/60">
                Live activity
              </div>
              <div className="mt-2">
                <CampaignActivity
                  recentJoins={recentJoins}
                  lastHourCount={lastHourCount ?? 0}
                />
              </div>
            </div>
            <div className="w-full sm:w-72">
              {searchParams.error && (
                <p className="mb-2 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
                  {searchParams.error}
                </p>
              )}
              <CampaignCTA
                slug={campaign.slug}
                isFull={isFull}
                isLoggedIn={Boolean(currentUser)}
                shareUrl={shareUrl}
                shareText={shareText}
              />
            </div>
          </div>
        </div>

        {currentUser?.id === campaign.owner_id && (
          <Link
            href={`/campaign/${campaign.slug}/manage`}
            className="mt-8 inline-block text-sm font-medium text-lagoon hover:underline"
          >
            Manage campaign →
          </Link>
        )}
      </main>
    </div>
  );
}

function scarcityTier(pct: number): {
  label: string;
  color: string;
  pulse?: boolean;
} {
  if (pct < 50) return { label: "Spots available", color: "#0BBFBF" };
  if (pct < 75) return { label: "Filling up fast", color: "#FFB347" };
  if (pct < 90) return { label: "Almost full!", color: "#FF6B47" };
  if (pct < 100) return { label: "Last few spots!", color: "#E53935", pulse: true };
  return { label: "Full", color: "#E53935" };
}
