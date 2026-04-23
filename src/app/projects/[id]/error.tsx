"use client";

import Link from "next/link";

export default function ProjectError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-foam px-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="text-4xl" aria-hidden>
          ✍️
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ocean">
          This project hit a snag.
        </h1>
        <p className="mt-2 text-sm text-ocean/70">
          Reload to pick up where you left off, or head back to the dashboard.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Reload editor
          </button>
          <Link
            href="/dashboard"
            className="rounded-full border border-ocean/15 bg-white px-5 py-2 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
