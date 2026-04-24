import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { createProjectFromTemplate } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Templates · Fab Collab",
  description:
    "Reusable project templates — spin up a new song, screenplay, business plan, or Think Tank in seconds.",
};

type TemplateRow = {
  id: string;
  title: string;
  project_type: string;
  sections_json: unknown;
  is_public: boolean;
  is_official: boolean;
  owner_id: string | null;
  use_count: number;
  created_at: string;
};

function sectionNames(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return (json as Array<{ title?: string }>)
    .map((s) => s.title ?? "")
    .filter(Boolean);
}

export default async function TemplatesIndex() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const admin = createAdminClient();
  const { data: allRows } = await admin
    .from("templates")
    .select(
      "id, title, project_type, sections_json, is_public, is_official, owner_id, use_count, created_at",
    )
    .order("use_count", { ascending: false });

  const all = (allRows ?? []) as TemplateRow[];
  const official = all.filter((t) => t.is_official);
  const community = all.filter((t) => t.is_public && !t.is_official);
  const mine = viewerId ? all.filter((t) => t.owner_id === viewerId) : [];

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Fab Collab home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">fab</span>
              <span className="text-lagoon">collab</span>
            </span>
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-ocean/70 hover:text-ocean">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-4xl font-extrabold text-ocean sm:text-5xl">
          Templates
        </h1>
        <p className="mt-2 font-display text-lg text-ocean/70">
          Start from a proven structure. Every template becomes a new project with
          your name as the first collaborator.
        </p>

        {viewerId && mine.length > 0 && (
          <TemplateSection heading="My templates" templates={mine} showOwnerActions />
        )}
        <TemplateSection heading="Official Fab Collab templates" templates={official} />
        <TemplateSection heading="Community templates" templates={community} />

        {!viewerId && (
          <div className="mt-12 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="font-display text-lg font-semibold text-ocean">
              Log in to save projects as templates
            </p>
            <Link
              href="/auth/login?next=/templates"
              style={{ backgroundColor: "#FF6B47", color: "white" }}
              className="mt-4 inline-block rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
            >
              Log in →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function TemplateSection({
  heading,
  templates,
  showOwnerActions,
}: {
  heading: string;
  templates: TemplateRow[];
  showOwnerActions?: boolean;
}) {
  if (templates.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-extrabold text-ocean">
        {heading}
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const meta = PROJECT_TYPES.find(
            (p) => p.id === (t.project_type as ProjectTypeId),
          );
          const names = sectionNames(t.sections_json);
          return (
            <li key={t.id} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ocean/60">
                <span aria-hidden>{meta?.emoji ?? "✨"}</span>
                <span>{meta?.label ?? t.project_type}</span>
                {t.is_official && (
                  <span className="ml-auto rounded-full bg-lagoon/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-lagoon">
                    Official
                  </span>
                )}
              </div>
              <div className="mt-3 font-display text-xl font-bold text-ocean">
                {t.title}
              </div>
              {names.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {names.slice(0, 6).map((n, i) => (
                    <li
                      key={i}
                      className="rounded-full border border-ocean/10 bg-foam/60 px-2 py-0.5 text-ocean/70"
                    >
                      {n}
                    </li>
                  ))}
                  {names.length > 6 && (
                    <li className="text-ocean/50">+{names.length - 6} more</li>
                  )}
                </ul>
              )}
              {t.use_count > 0 && (
                <div className="mt-3 text-xs text-ocean/50">
                  Used {t.use_count} time{t.use_count === 1 ? "" : "s"}
                </div>
              )}
              <form action={createProjectFromTemplate} className="mt-4 flex gap-2">
                <input type="hidden" name="template_id" value={t.id} />
                <input
                  type="text"
                  name="title"
                  placeholder={`${t.title} copy`}
                  className="flex-1 rounded-full border border-ocean/15 bg-white px-3 py-1.5 text-sm text-ocean focus:border-lagoon focus:outline-none"
                />
                <button
                  type="submit"
                  style={{ backgroundColor: "#FF6B47", color: "white" }}
                  className="rounded-full px-4 py-1.5 font-display text-xs font-semibold shadow transition hover:brightness-110 active:scale-95"
                >
                  Use
                </button>
              </form>
              {showOwnerActions && !t.is_official && (
                <div className="mt-3 text-xs text-ocean/50">
                  {t.is_public ? "Shared publicly" : "Private to you"}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
