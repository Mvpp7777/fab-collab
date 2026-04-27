import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ExpertRow from "./ExpertRow";
import DigestButton from "./DigestButton";
import WaitlistExport from "./WaitlistExport";

const ADMIN_EMAIL = "lenbenti@me.com";

export const dynamic = "force-dynamic";

type ExpertApp = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  company: string | null;
  category: string | null;
  years_experience: string | null;
  contribution_rate: string | null;
  open_to_investing: boolean | null;
  achievements: string | null;
  linkedin_url: string | null;
  created_at: string;
  status: string;
};

type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  looking_for: string | null;
  created_at: string;
};

type RecentUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  created_at: string;
};

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  spots_filled: number;
  max_collaborators: number;
  created_at: string;
};

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || user.email.toLowerCase() !== ADMIN_EMAIL) {
    notFound();
  }

  const admin = createAdminClient();
  const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    usersCountRes,
    projectsCountRes,
    activeProjectsRes,
    completedProjectsRes,
    pendingExpertsRes,
    approvedExpertsRes,
    waitlistRes,
    campaignsRes,
    recentUsersRes,
    newUsersLast7Res,
  ] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("projects").select("id", { count: "exact", head: true }),
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .gte("updated_at", since30Days),
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    admin
      .from("expert_applications")
      .select(
        "id, name, email, title, company, category, years_experience, contribution_rate, open_to_investing, achievements, linkedin_url, created_at, status"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    admin
      .from("expert_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    admin
      .from("industry_waitlist")
      .select("id, name, email, company, role, looking_for, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("campaigns")
      .select("id, slug, title, status, spots_filled, max_collaborators, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("users")
      .select("id, email, display_name, username, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7Days),
  ]);

  const pendingExperts = (pendingExpertsRes.data ?? []) as ExpertApp[];
  const waitlist = (waitlistRes.data ?? []) as WaitlistEntry[];
  const campaigns = (campaignsRes.data ?? []) as CampaignRow[];
  const recentUsers = (recentUsersRes.data ?? []) as RecentUser[];

  const stats = [
    { label: "Total users", value: usersCountRes.count ?? 0 },
    { label: "New (last 7d)", value: newUsersLast7Res.count ?? 0 },
    { label: "Total projects", value: projectsCountRes.count ?? 0 },
    { label: "Active (30d)", value: activeProjectsRes.count ?? 0 },
    { label: "Completed", value: completedProjectsRes.count ?? 0 },
    { label: "Pending experts", value: pendingExperts.length },
    { label: "Approved experts", value: approvedExpertsRes.count ?? 0 },
    { label: "Scout waitlist", value: waitlist.length },
  ];

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link
              href="/"
              className="font-display text-xl font-extrabold tracking-tight"
            >
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
              <span className="ml-2 rounded-full bg-ocean px-2 py-0.5 text-xs font-semibold uppercase text-white">
                Admin
              </span>
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-ocean/70">
            <Link href="/dashboard" className="hover:text-ocean">
              Dashboard
            </Link>
            <Link href="/discover" className="hover:text-ocean">
              Discover
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl font-extrabold text-ocean">
          Admin overview
        </h1>
        <p className="mt-1 text-sm text-ocean/60">
          Signed in as <span className="font-semibold">{user.email}</span>.
        </p>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="text-xs uppercase tracking-wider text-ocean/50">
                {s.label}
              </div>
              <div className="mt-1 font-display text-2xl font-extrabold text-ocean">
                {s.value}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ocean">
              Pending expert applications
            </h2>
            <span className="text-xs text-ocean/50">
              {pendingExperts.length} pending
            </span>
          </div>
          {pendingExperts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-ocean/20 bg-white/60 p-6 text-center text-sm text-ocean/60">
              No pending applications.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {pendingExperts.map((row) => (
                <ExpertRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-ocean">
              Scout / industry waitlist
            </h2>
            <WaitlistExport entries={waitlist} />
          </div>
          {waitlist.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-ocean/20 bg-white/60 p-6 text-center text-sm text-ocean/60">
              No signups yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-ocean/10 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-foam/60 text-left text-xs uppercase tracking-wider text-ocean/60">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Company</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Looking for</th>
                    <th className="px-4 py-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.slice(0, 50).map((w) => (
                    <tr key={w.id} className="border-t border-ocean/5">
                      <td className="px-4 py-2 font-medium text-ocean">
                        {w.name}
                      </td>
                      <td className="px-4 py-2 text-ocean/70">{w.email}</td>
                      <td className="px-4 py-2 text-ocean/70">
                        {w.company ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-ocean/70">
                        {w.role ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-ocean/70">
                        {w.looking_for ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-ocean/50">
                        {new Date(w.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {waitlist.length > 50 && (
                <div className="border-t border-ocean/5 px-4 py-2 text-xs text-ocean/50">
                  Showing 50 of {waitlist.length}. Export for full list.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-bold text-ocean">
              Recent campaigns
            </h2>
            {campaigns.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-ocean/20 bg-white/60 p-6 text-center text-sm text-ocean/60">
                No campaigns yet.
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {campaigns.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-ocean/10 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/c/${c.slug}`}
                        className="font-semibold text-ocean hover:underline"
                      >
                        {c.title}
                      </Link>
                      <span className="rounded-full bg-foam px-2 py-0.5 text-[10px] font-semibold uppercase text-ocean/60">
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-ocean/60">
                      {c.spots_filled}/{c.max_collaborators} filled ·{" "}
                      {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-ocean">
              Recent signups
            </h2>
            {recentUsers.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-ocean/20 bg-white/60 p-6 text-center text-sm text-ocean/60">
                No users yet.
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {recentUsers.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-xl border border-ocean/10 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-ocean">
                        {u.display_name ?? u.username ?? u.email ?? "Unknown"}
                      </span>
                      <span className="text-xs text-ocean/50">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {u.email && (
                      <div className="mt-0.5 text-xs text-ocean/60">
                        {u.email}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-ocean">
            Operations
          </h2>
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-ocean">
                  Send weekly relay digest now
                </div>
                <p className="mt-1 text-sm text-ocean/60">
                  Emails users whose turn has been stuck for 3+ days
                  (respects email_digest_enabled).
                </p>
              </div>
              <DigestButton />
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-white p-5 text-sm text-ocean/60 shadow-sm">
            Revenue metrics — pending Stripe integration.
          </div>
        </section>
      </main>
    </div>
  );
}
