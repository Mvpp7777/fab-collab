"use client";

import { createBrowserClient } from "@supabase/ssr";

export default function LogoutButton() {
  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-ocean/15 px-3 py-1.5 text-sm font-medium text-ocean transition hover:bg-ocean hover:text-foam"
    >
      Log out
    </button>
  );
}
