"use client";

import Link from "next/link";
import { useState } from "react";
import { submitIndustryWaitlist } from "./actions";

const ROLE_OPTIONS = [
  "A&R Rep",
  "Music Publisher",
  "Literary Agent",
  "Film Producer",
  "Talent Manager",
  "Advertising Agency",
  "Other",
];

export default function IndustryWaitlist() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setBusy(true);
    setError(null);
    const result = await submitIndustryWaitlist(formData);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Collab It home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/discover"
              className="text-sm font-medium text-ocean/70 transition hover:text-ocean"
            >
              Discover
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-ocean/70 transition hover:text-ocean"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <section className="text-center">
          <div className="inline-block rounded-full bg-lagoon/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-lagoon">
            For industry professionals
          </div>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-ocean sm:text-5xl">
            Discover the next hit before anyone else
          </h1>
          <p className="mt-4 font-display text-lg text-ocean/70 sm:text-xl">
            Get early access to completed projects from songwriters, screenwriters,
            novelists and more.
          </p>
        </section>

        <section className="mx-auto mt-12 max-w-xl">
          {done ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <div className="text-5xl" aria-hidden>
                ✅
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold text-ocean">
                You&rsquo;re on the list.
              </h2>
              <p className="mt-2 text-sm text-ocean/70">
                We&rsquo;ll be in touch when Scout access opens.
              </p>
              <Link
                href="/discover"
                className="mt-6 inline-block rounded-full border border-ocean/15 bg-white px-5 py-2 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
              >
                Browse Discover →
              </Link>
            </div>
          ) : (
            <form
              action={handleSubmit}
              className="space-y-4 rounded-2xl bg-white p-8 shadow-sm"
            >
              <Field
                label="Name"
                name="name"
                type="text"
                required
                autoComplete="name"
              />
              <Field
                label="Company"
                name="company"
                type="text"
                autoComplete="organization"
              />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ocean">
                  Role
                </span>
                <select
                  name="role"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
                >
                  <option value="" disabled>
                    Select your role
                  </option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ocean">
                  What are you looking for?
                </span>
                <textarea
                  name="looking_for"
                  rows={4}
                  placeholder="e.g. pop songwriters with a strong topline, or thriller novelists open to co-writing..."
                  className="w-full resize-y rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
                />
              </label>
              <Field
                label="Email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />

              {error && (
                <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                style={{ backgroundColor: "#FF6B47", color: "white" }}
                className="w-full rounded-full px-6 py-3 font-display text-base font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Request Scout access"}
              </button>

              <p className="text-center text-xs text-ocean/50">
                No spam. We&rsquo;ll only email you about Scout tier launch.
              </p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ocean">
        {label}
        {required ? (
          <span className="ml-1 text-coral">*</span>
        ) : (
          <span className="ml-1 text-ocean/40">(optional)</span>
        )}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
      />
    </label>
  );
}
