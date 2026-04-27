import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarkAllButton from "./MarkAllButton";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  type: string;
  project_id: string | null;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

const PAGE_SIZE = 20;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/notifications");

  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, count } = await supabase
    .from("notifications")
    .select(
      "id, type, project_id, body, link, read, created_at",
      { count: "exact" },
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(start, end);

  const rows = (data ?? []) as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? rows.length) / PAGE_SIZE));

  const grouped = groupByDateBucket(rows);
  const hasUnread = rows.some((r) => !r.read);

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Collab It home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-ocean/70 hover:text-ocean"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-extrabold text-ocean sm:text-4xl">
            Notifications
          </h1>
          <MarkAllButton disabled={!hasUnread} />
        </div>

        {rows.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-ocean/20 bg-white/60 px-6 py-16 text-center">
            <div className="text-4xl" aria-hidden>
              🎉
            </div>
            <p className="mt-3 font-display text-xl font-semibold text-ocean">
              You&rsquo;re all caught up!
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {(["Today", "Yesterday", "This week", "Earlier"] as const).map(
              (bucket) =>
                grouped[bucket].length > 0 ? (
                  <section key={bucket}>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-ocean/50">
                      {bucket}
                    </h2>
                    <ul className="mt-3 divide-y divide-ocean/10 rounded-2xl bg-white shadow-sm">
                      {grouped[bucket].map((n) => (
                        <li key={n.id}>
                          <NotificationRow n={n} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null,
            )}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link
                href={`/notifications?page=${page - 1}`}
                className="rounded-full border border-ocean/15 bg-white px-4 py-1.5 font-medium text-ocean hover:bg-ocean hover:text-white"
              >
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-ocean/60">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/notifications?page=${page + 1}`}
                className="rounded-full border border-ocean/15 bg-white px-4 py-1.5 font-medium text-ocean hover:bg-ocean hover:text-white"
              >
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </main>
    </div>
  );
}

function NotificationRow({ n }: { n: Row }) {
  const body = n.body ?? n.type;
  const icon = iconForType(n.type);
  const content = (
    <div className="flex items-start gap-3 px-5 py-4 transition hover:bg-foam/40">
      <span aria-hidden className="mt-0.5 flex-none text-xl">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            style={{
              backgroundColor: n.read ? "rgba(26,46,46,0.15)" : "#0BBFBF",
            }}
            className="mt-1.5 h-2 w-2 flex-none rounded-full"
          />
          <p className={`text-sm ${n.read ? "text-ocean/70" : "text-ocean"}`}>
            {body}
          </p>
        </div>
        <div className="ml-4 mt-0.5 text-xs text-ocean/50">
          {formatTimestamp(n.created_at)}
        </div>
      </div>
    </div>
  );
  return n.link ? <Link href={n.link}>{content}</Link> : content;
}

function iconForType(type: string): string {
  switch (type) {
    case "turn_passed":
      return "🎵";
    case "comment_added":
      return "💬";
    case "call_started":
      return "📞";
    case "campaign_milestone":
      return "🎉";
    case "campaign_joined":
      return "🤝";
    case "campaign_message":
      return "📣";
    case "expert_application":
      return "💡";
    case "invited":
      return "✉️";
    default:
      return "🔔";
  }
}

function groupByDateBucket(rows: Row[]) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfThisWeek = new Date(startOfToday);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - 6);

  const result: Record<"Today" | "Yesterday" | "This week" | "Earlier", Row[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    Earlier: [],
  };

  for (const r of rows) {
    const t = new Date(r.created_at);
    if (t >= startOfToday) result.Today.push(r);
    else if (t >= startOfYesterday) result.Yesterday.push(r);
    else if (t >= startOfThisWeek) result["This week"].push(r);
    else result.Earlier.push(r);
  }
  return result;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
