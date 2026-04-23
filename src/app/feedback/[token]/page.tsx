import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { buildTeaser } from "@/lib/shareTeaser";
import FeedbackForm from "./FeedbackForm";

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

type SectionRow = { id: string; title: string | null; position: number };

type SnapshotRow = {
  section_id: string;
  content_text: string;
  created_at: string;
};

export default async function FeedbackTokenPage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, title, project_type")
    .eq("feedback_token", params.token)
    .maybeSingle();

  if (!project) notFound();

  const { data: sectionsData } = await admin
    .from("sections")
    .select("id, title, position")
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
            href="/auth/signup"
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="rounded-full px-4 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Start writing
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
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
          {sections.map((s) => (
            <article
              key={s.id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
                {s.title ?? `Section ${s.position + 1}`}
              </div>
              <div className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-ocean">
                {latestBySection[s.id] || (
                  <span className="italic text-ocean/40">(empty)</span>
                )}
              </div>
            </article>
          ))}
        </section>

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

        <footer className="mt-10 border-t border-ocean/10 pt-6 text-center text-xs text-ocean/50">
          © 2026 {firstNames[0] ?? "the creator"}
          {firstNames.length > 1 ? " and contributors" : ""}. All rights
          reserved. Created on Fab Collab™
        </footer>
      </main>
    </div>
  );
}
