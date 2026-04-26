import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { buildTeaser } from "@/lib/shareTeaser";
import FeedbackForm from "./FeedbackForm";
import TipBox from "./TipBox";
import UnlockButton from "./UnlockButton";
import CoWriteButton from "./CoWriteButton";
import UnlockPersist from "./UnlockPersist";

export const dynamic = "force-dynamic";

function publicOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "https://fabcollab.vercel.app";
}

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, title")
    .eq("feedback_token", params.token)
    .maybeSingle();
  if (!project) return { title: "Feedback · Fab Collab" };

  const { data: firstSection } = await admin
    .from("sections")
    .select("id")
    .eq("project_id", project.id)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  let firstContent = "";
  if (firstSection) {
    const { data: snap } = await admin
      .from("content_snapshots")
      .select("content_text")
      .eq("section_id", firstSection.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    firstContent = (snap?.content_text as string | null) ?? "";
  }

  const title = `${project.title} — a collaboration on Fab Collab`;
  const description =
    buildTeaser(firstContent) ||
    `Read the collaboration and leave feedback on Fab Collab.`;
  const url = `${publicOrigin()}/feedback/${params.token}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

type SectionRow = {
  id: string;
  title: string | null;
  position: number;
  purchasable: boolean | null;
  purchase_price_cents: number | null;
};

type SnapshotRow = {
  section_id: string;
  content_text: string;
  created_at: string;
};

const UNLOCK_TARGET_LABELS: Partial<Record<ProjectTypeId, string>> = {
  song: "song",
  screenplay: "screenplay",
  novel: "story",
  poetry: "poem",
  podcast: "episode",
  standup: "set",
  game: "story",
  ad: "campaign",
  freeform: "story",
};

export default async function FeedbackTokenPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: {
    tipped?: string;
    unlock?: string;
    unlock_session?: string;
    unlock_token?: string;
    turn?: string;
    section?: string;
  };
}) {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, title, project_type, unlock_price_cents")
    .eq("feedback_token", params.token)
    .maybeSingle();

  if (!project) notFound();

  // Fire-and-forget view log for owner analytics.
  void admin
    .from("feedback_page_views")
    .insert({ project_id: project.id, token: params.token });

  const { data: sectionsData } = await admin
    .from("sections")
    .select("id, title, position, purchasable, purchase_price_cents")
    .eq("project_id", project.id)
    .order("position", { ascending: true });
  const sections = (sectionsData ?? []) as SectionRow[];

  const { data: snapshotsData } = await admin
    .from("content_snapshots")
    .select("section_id, content_text, created_at")
    .in("section_id", sections.map((s) => s.id))
    .order("created_at", { ascending: false });

  const latestBySection: Record<string, string> = {};
  for (const snap of (snapshotsData ?? []) as SnapshotRow[]) {
    if (!(snap.section_id in latestBySection)) {
      latestBySection[snap.section_id] = snap.content_text;
    }
  }

  // Contributors — first names only
  const { data: collabData } = await admin
    .from("collaborators")
    .select("user_id, turn_order")
    .eq("project_id", project.id)
    .order("turn_order", { ascending: true });
  const userIds = (collabData ?? []).map((c) => c.user_id);
  const { data: usersData } =
    userIds.length > 0
      ? await admin
          .from("users")
          .select("id, display_name")
          .in("id", userIds)
      : { data: [] as Array<{ id: string; display_name: string | null }> };
  const firstNames = (usersData ?? [])
    .map((u) => (u.display_name ?? "").trim().split(" ")[0])
    .filter(Boolean);

  const typeMeta = PROJECT_TYPES.find(
    (t) => t.id === (project.project_type as ProjectTypeId),
  );
  const unlockTargetLabel =
    UNLOCK_TARGET_LABELS[project.project_type as ProjectTypeId] ?? "story";

  // ----- Unlock state ------------------------------------------------------
  let unlocked = false;
  let justUnlockedToken: string | null = null;

  if (searchParams.unlock_session) {
    const { data: row } = await admin
      .from("content_unlocks")
      .select("project_id, status, unlock_token")
      .eq("stripe_session_id", searchParams.unlock_session)
      .maybeSingle();
    if (row && row.project_id === project.id && row.status === "succeeded") {
      unlocked = true;
      justUnlockedToken = row.unlock_token as string;
    }
  } else if (searchParams.unlock_token) {
    const { data: row } = await admin
      .from("content_unlocks")
      .select("project_id, status")
      .eq("unlock_token", searchParams.unlock_token)
      .maybeSingle();
    if (row && row.project_id === project.id && row.status === "succeeded") {
      unlocked = true;
    }
  }

  // ----- Banners -----------------------------------------------------------
  const banners: Array<{ kind: "success" | "info" | "warn"; text: string }> = [];
  if (searchParams.tipped === "true") {
    banners.push({
      kind: "success",
      text: "Thank you for supporting this project! You helped make something great. 🎉",
    });
  } else if (searchParams.tipped === "cancelled") {
    banners.push({
      kind: "info",
      text: "No worries — your tip wasn’t completed. You can try again any time.",
    });
  }
  if (justUnlockedToken) {
    banners.push({
      kind: "success",
      text: `Unlocked! Enjoy the full ${unlockTargetLabel}. 🔓`,
    });
  }
  if (searchParams.unlock === "cancelled") {
    banners.push({
      kind: "info",
      text: "Unlock wasn’t completed. The full project is still locked.",
    });
  }
  if (searchParams.turn === "purchased") {
    banners.push({
      kind: "success",
      text: "🎉 You bought a turn! Check your email — you’re now a collaborator on this project.",
    });
  } else if (searchParams.turn === "cancelled") {
    banners.push({
      kind: "info",
      text: "Turn purchase wasn’t completed.",
    });
  }

  const unlockPriceCents = Number(project.unlock_price_cents ?? 300);

  return (
    <div className="min-h-screen bg-foam">
      <UnlockPersist
        projectId={project.id}
        alreadyUnlockedViaUrl={Boolean(searchParams.unlock_token) || unlocked}
        justUnlockedToken={justUnlockedToken}
      />
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Fab Collab home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">fab</span>
              <span className="text-lagoon">collab</span>
            </span>
          </Link>
          <Link
            href="/auth/signup"
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="rounded-full px-4 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Start writing
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {banners.map((b, i) => (
          <div
            key={i}
            className={[
              "mb-4 rounded-xl px-5 py-3 text-sm font-medium",
              b.kind === "success"
                ? "bg-lagoon text-white"
                : b.kind === "warn"
                  ? "bg-coral/15 text-coral"
                  : "bg-ocean/10 text-ocean",
            ].join(" ")}
          >
            {b.text}
          </div>
        ))}

        <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
          {typeMeta?.emoji ?? "✨"} {typeMeta?.label ?? project.project_type}
        </div>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight tracking-tight text-ocean sm:text-5xl">
          {project.title}
        </h1>

        {firstNames.length > 0 && (
          <p className="mt-3 text-sm text-ocean/70">
            Written by{" "}
            <span className="font-medium text-ocean">
              {firstNames.join(", ")}
            </span>
          </p>
        )}

        <section className="mt-8 space-y-5">
          {sections.map((s, idx) => {
            const isFirst = idx === 0;
            const showFull = isFirst || unlocked;
            const content = latestBySection[s.id] ?? "";
            const purchasable = Boolean(s.purchasable);
            const priceCents = Number(s.purchase_price_cents ?? 0);
            return (
              <article
                key={s.id}
                className="relative rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
                    {s.title ?? `Section ${s.position + 1}`}
                  </div>
                  {purchasable && priceCents >= 100 && (
                    <span
                      style={{ backgroundColor: "#0BBFBF", color: "white" }}
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    >
                      ✍️ Available to co-write
                    </span>
                  )}
                </div>
                {showFull ? (
                  <div className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-ocean">
                    {content || (
                      <span className="italic text-ocean/40">(empty)</span>
                    )}
                  </div>
                ) : (
                  <div className="relative mt-2">
                    <div
                      aria-hidden
                      className="select-none whitespace-pre-wrap text-base leading-relaxed text-ocean blur-md"
                    >
                      {content
                        ? content.slice(0, 220) + "…"
                        : "Locked content. Unlock to read more."}
                    </div>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span
                        aria-hidden
                        className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ocean shadow"
                      >
                        🔒 Locked
                      </span>
                    </div>
                  </div>
                )}
                {purchasable && priceCents >= 100 && (
                  <CoWriteButton
                    token={params.token}
                    sectionId={s.id}
                    priceCents={priceCents}
                  />
                )}
              </article>
            );
          })}
        </section>

        {!unlocked && sections.length > 1 && unlockPriceCents >= 100 && (
          <section className="mt-8 rounded-2xl bg-gradient-to-br from-coral/10 to-lagoon/10 p-6 text-center shadow-sm">
            <div className="text-3xl">🔓</div>
            <h2 className="mt-2 font-display text-xl font-bold text-ocean">
              Read the full {unlockTargetLabel}
            </h2>
            <p className="mt-1 text-sm text-ocean/70">
              You&rsquo;re reading the first section. Unlock the rest in one click.
            </p>
            <div className="mt-4 flex justify-center">
              <UnlockButton
                token={params.token}
                priceCents={unlockPriceCents}
                projectTypeLabel={unlockTargetLabel}
              />
            </div>
          </section>
        )}

        <section className="mt-10 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold text-ocean">
            Leave feedback
          </h2>
          <p className="mt-1 text-sm text-ocean/70">
            Your thoughts go straight to the creator. No account needed.
          </p>
          <div className="mt-4">
            <FeedbackForm token={params.token} />
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <TipBox token={params.token} />
        </section>

        <footer className="mt-10 border-t border-ocean/10 pt-6 text-center text-xs text-ocean/50">
          © 2026 {firstNames[0] ?? "the creator"}
          {firstNames.length > 1 ? " and contributors" : ""}. All rights
          reserved. Created on Fab Collab™
        </footer>
      </main>
    </div>
  );
}
