import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import ManageClient from "./ManageClient";

export const dynamic = "force-dynamic";

type ParticipantRow = {
  user_id: string;
  joined_at: string;
  contribution_status: string;
  users: { display_name: string | null } | Array<{ display_name: string | null }> | null;
};

export default async function ManageCampaign({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/login?next=${encodeURIComponent(`/campaign/${params.slug}/manage`)}`,
    );
  }

  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, project_id, owner_id, slug, title, status, end_date, spots_filled, max_collaborators")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!campaign) notFound();
  if (campaign.owner_id !== user.id) notFound();

  const { data: participantsData } = await admin
    .from("campaign_participants")
    .select("user_id, joined_at, contribution_status, users(display_name)")
    .eq("campaign_id", campaign.id)
    .order("joined_at", { ascending: true });
  const participants = (participantsData ?? []) as ParticipantRow[];

  const { data: waitlistData } = await admin
    .from("campaign_waitlist")
    .select("id, name, email, joined_at")
    .eq("campaign_id", campaign.id)
    .order("joined_at", { ascending: true });
  const waitlist = waitlistData ?? [];

  const remaining = Math.max(0, campaign.max_collaborators - campaign.spots_filled);

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Collab It home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
            </span>
          </Link>
          <Link
            href={`/campaign/${campaign.slug}`}
            className="text-sm font-medium text-ocean/70 hover:text-ocean"
          >
            ← Campaign page
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
          Manage
        </div>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ocean sm:text-4xl">
          {campaign.title}
        </h1>
        <p className="mt-2 text-sm text-ocean/70">
          {campaign.spots_filled} of {campaign.max_collaborators} spots filled ·{" "}
          {remaining} remaining
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
          <ManageClient
            slug={campaign.slug}
            status={campaign.status}
            endDate={campaign.end_date as string | null}
          />

          <aside className="space-y-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
                Participants ({participants.length})
              </div>
              <ul className="mt-3 space-y-2">
                {participants.map((p) => {
                  const rel = p.users as
                    | { display_name: string | null }
                    | Array<{ display_name: string | null }>
                    | null;
                  const row = Array.isArray(rel) ? rel[0] : rel;
                  const name = row?.display_name?.trim() || "Someone";
                  return (
                    <li key={p.user_id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-ocean">{name}</span>
                      <span className="ml-2 text-xs capitalize text-ocean/60">
                        {p.contribution_status}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Link
                href={`/projects/${campaign.project_id}`}
                className="mt-4 inline-block text-xs font-semibold text-lagoon hover:underline"
              >
                Open project to download work →
              </Link>
            </div>

            {waitlist.length > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
                  Waitlist ({waitlist.length})
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {waitlist.slice(0, 20).map((w) => (
                    <li key={w.id} className="truncate text-ocean">
                      {w.name ?? w.email}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
