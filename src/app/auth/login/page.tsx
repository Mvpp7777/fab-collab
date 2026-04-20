"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-foam px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center">
          <h1 className="font-display text-5xl font-extrabold leading-none tracking-tight">
            <span className="text-ocean">fab</span>
            <span className="text-lagoon">collab</span>
          </h1>
        </Link>

        <div className="mt-10 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-ocean">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-ocean/70">
            Log in to keep writing.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ocean">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ocean">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
              />
            </label>

            {error && (
              <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-coral px-6 py-3 font-display text-base font-semibold text-white shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ocean/70">
            New to Fab Collab?{" "}
            <Link href="/auth/signup" className="font-semibold text-lagoon hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
