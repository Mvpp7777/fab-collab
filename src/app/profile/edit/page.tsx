import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EditProfileForm from "./EditProfileForm";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/profile/edit");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("display_name, username, bio, email_digest_enabled")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Collab It home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
            </span>
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-ocean/70 hover:text-ocean">
            Cancel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl font-extrabold text-ocean sm:text-4xl">
          Edit profile
        </h1>
        <p className="mt-2 text-sm text-ocean/70">
          Your public profile lives at{" "}
          <span className="font-mono text-lagoon">
            collabit.vercel.app/profile/{profile?.username ?? "your-username"}
          </span>
        </p>
        <EditProfileForm
          initialDisplayName={profile?.display_name ?? ""}
          initialUsername={profile?.username ?? ""}
          initialBio={profile?.bio ?? ""}
          initialDigestEnabled={profile?.email_digest_enabled ?? true}
          email={user.email ?? ""}
        />
      </main>
    </div>
  );
}
