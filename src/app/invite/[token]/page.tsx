import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { acceptAndRedirect } from "./actions";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/auth/login?next=${encodeURIComponent(`/invite/${params.token}`)}`,
    );
  }

  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("invitations")
    .select(
      "id, email, role, accepted_at, expires_at, projects(id, title, project_type, owner_id)",
    )
    .eq("token", params.token)
    .maybeSingle();

  const projectRel = invitation?.projects as
    | { id: string; title: string; project_type: string; owner_id: string }
    | Array<{ id: string; title: string; project_type: string; owner_id: string }>
    | null;
  const project = Array.isArray(projectRel) ? projectRel[0] : projectRel;

  const expired =
    invitation && new Date(invitation.expires_at) < new Date();
  const invalid = !invitation || !project;
  const typeMeta = project
    ? PROJECT_TYPES.find((t) => t.id === (project.project_type as ProjectTypeId))
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-foam px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center">
          <span className="font-display text-4xl font-extrabold tracking-tight">
            <span className="text-ocean">collab</span>
            <span className="text-lagoon">it</span>
          </span>
        </Link>

        <div className="mt-10 rounded-2xl bg-white p-8 shadow-sm">
          {invalid ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ocean">
                Invitation unavailable
              </h1>
              <p className="mt-2 text-sm text-ocean/70">
                This invite link doesn&rsquo;t exist. Ask whoever sent it for a fresh link.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-block rounded-full border border-ocean/15 px-5 py-2 text-sm font-medium text-ocean transition hover:bg-ocean hover:text-foam"
              >
                Back to dashboard
              </Link>
            </>
          ) : expired ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ocean">
                Invitation expired
              </h1>
              <p className="mt-2 text-sm text-ocean/70">
                Invites are valid for 7 days. Ask the project owner for a new link.
              </p>
            </>
          ) : invitation!.accepted_at ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ocean">
                Already joined
              </h1>
              <p className="mt-2 text-sm text-ocean/70">
                You&rsquo;re already in <strong>{project!.title}</strong>.
              </p>
              <Link
                href={`/projects/${project!.id}`}
                style={{ backgroundColor: "#FF6B47", color: "white" }}
                className="mt-6 inline-block rounded-full px-5 py-2 font-display text-sm font-semibold shadow"
              >
                Open project
              </Link>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
                You&rsquo;re invited
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold text-ocean">
                Join {project!.title}
              </h1>
              <p className="mt-2 text-sm text-ocean/70">
                {typeMeta?.emoji ?? "✨"}{" "}
                {typeMeta?.label ?? project!.project_type} · role:{" "}
                <span className="capitalize">{invitation!.role}</span>
              </p>
              <p className="mt-3 text-sm text-ocean/70">
                Signed in as{" "}
                <span className="font-semibold text-ocean">{user.email}</span>.
                Accepting adds you as a collaborator and takes you into the editor.
              </p>

              {searchParams.error && (
                <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
                  {searchParams.error}
                </p>
              )}

              <form action={acceptAndRedirect} className="mt-6 flex flex-wrap gap-3">
                <input type="hidden" name="token" value={params.token} />
                <button
                  type="submit"
                  style={{ backgroundColor: "#FF6B47", color: "white" }}
                  className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
                >
                  Accept invitation
                </button>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-ocean/15 px-5 py-2 font-display text-sm font-medium text-ocean/70 transition hover:text-ocean"
                >
                  Maybe later
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
