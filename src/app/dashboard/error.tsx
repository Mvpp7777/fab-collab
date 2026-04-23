"use client";

import Link from "next/link";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-foam px-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="text-4xl" aria-hidden>
          🛠️
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ocean">
          Something went sideways.
        </h1>
        <p className="mt-2 text-sm text-ocean/70">
          The dashboard hit a snag. Try again, or head back to the home page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-ocean/15 bg-white px-5 py-2 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
