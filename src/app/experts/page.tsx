"use client";

import Link from "next/link";
import { useState } from "react";
import { submitExpertApplication } from "./actions";
import InvestorVerificationCard from "./InvestorVerificationCard";

const CATEGORIES = [
  { emoji: "🚀", label: "Founders & Entrepreneurs" },
  { emoji: "💰", label: "Investors & VCs" },
  { emoji: "📊", label: "Marketing & Growth" },
  { emoji: "⚖️", label: "Legal & IP" },
  { emoji: "🏗️", label: "Operations & Scaling" },
  { emoji: "🎵", label: "Music Industry" },
  { emoji: "🎬", label: "Film & Entertainment" },
  { emoji: "📚", label: "Publishing & Media" },
  { emoji: "🏥", label: "Healthcare" },
  { emoji: "🏛️", label: "Policy & Government" },
];

const YEARS = ["5-10", "10-15", "15-20", "20+"];
const RATES = ["$50", "$100", "$200", "$500", "$1000", "$2000", "Custom"];

export default function ExpertsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setBusy(true);
    setError(null);
    const r = await submitExpertApplication(formData);
    setBusy(false);
    if ("error" in r) setError(r.error);
    else setDone(true);
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
          <nav className="flex items-center gap-4 text-sm font-medium text-ocean/70">
            <Link href="/discover" className="hover:text-ocean">Discover</Link>
            <Link href="/industry" className="hidden hover:text-ocean sm:inline">Industry</Link>
            <Link href="/auth/login" className="hover:text-ocean">Log in</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center sm:pt-24">
        <div className="inline-block rounded-full bg-lagoon/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-lagoon">
          Think Tank · Expert Marketplace
        </div>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-ocean sm:text-5xl md:text-6xl">
          Share your expertise. Get paid. Shape the future.
        </h1>
        <p className="mx-auto mt-5 max-w-3xl font-display text-lg text-ocean/70 sm:text-xl">
          Collab It Think Tank connects teams with real-world experts who
          contribute their knowledge directly into collaborative projects. Set
          your own rate. Work on your schedule.
        </p>
        <a
          href="#apply"
          style={{ backgroundColor: "#FF6B47", color: "white" }}
          className="mt-8 inline-block rounded-full px-6 py-3 font-display text-base font-semibold shadow-lg transition hover:brightness-110 active:scale-95"
        >
          Apply as an expert →
        </a>
      </main>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold text-ocean sm:text-4xl">
          How it works
        </h2>
        <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              n: "1",
              title: "Create your expert profile",
              body: "List your credentials, category, and contribution rate.",
            },
            {
              n: "2",
              title: "Get matched with Think Tank projects",
              body: "Teams browse experts and request your input.",
            },
            {
              n: "3",
              title: "Contribute and get paid",
              body: "Add your expertise directly into the project and receive payment instantly.",
            },
          ].map((s) => (
            <li key={s.n} className="rounded-2xl bg-white p-6 shadow-sm">
              <div
                style={{ backgroundColor: "#0BBFBF", color: "white" }}
                className="flex h-10 w-10 items-center justify-center rounded-full font-display text-base font-bold"
              >
                {s.n}
              </div>
              <div className="mt-4 font-display text-lg font-bold text-ocean">
                {s.title}
              </div>
              <p className="mt-1 text-sm text-ocean/70">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* What experts earn */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-2xl bg-white p-8 shadow-sm sm:p-12">
          <h2 className="font-display text-3xl font-extrabold text-ocean">
            You set your own rate
          </h2>
          <p className="mt-2 text-base text-ocean/70">
            Collab It handles all payments — you just contribute.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Rate label="Industry advisor" range="$50–100 per contribution" />
            <Rate label="Serial founder" range="$200–500 per contribution" />
            <Rate label="C-suite executive" range="$500–1,000 per contribution" />
            <Rate label="Top investor" range="$1,000–2,000 per contribution" />
          </ul>
        </div>
      </section>

      {/* Investor verification */}
      <section className="mx-auto max-w-2xl px-6 py-8">
        <InvestorVerificationCard />
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center font-display text-2xl font-extrabold text-ocean sm:text-3xl">
          Expert categories
        </h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <li
              key={c.label}
              className="rounded-xl bg-white p-4 text-center shadow-sm"
            >
              <div className="text-2xl" aria-hidden>
                {c.emoji}
              </div>
              <div className="mt-1.5 text-sm font-semibold text-ocean">
                {c.label}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Application form */}
      <section id="apply" className="mx-auto max-w-2xl scroll-mt-20 px-6 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold text-ocean sm:text-4xl">
          Apply to be an expert
        </h2>
        <p className="mt-2 text-center text-sm text-ocean/70">
          We review applications within 48 hours.
        </p>

        {done ? (
          <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="text-5xl" aria-hidden>
              ✅
            </div>
            <h3 className="mt-4 font-display text-2xl font-bold text-ocean">
              Application received!
            </h3>
            <p className="mt-2 text-sm text-ocean/70">
              We review all applications within 48 hours.
            </p>
          </div>
        ) : (
          <form
            action={handleSubmit}
            className="mt-8 space-y-4 rounded-2xl bg-white p-8 shadow-sm"
          >
            <Field label="Full name" name="name" type="text" required />
            <Field
              label="LinkedIn URL"
              name="linkedin_url"
              type="url"
              required
              placeholder="https://linkedin.com/in/you"
            />
            <Field
              label="Current or most recent title"
              name="title"
              type="text"
              required
            />
            <Field
              label="Company or organization"
              name="company"
              type="text"
              required
            />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ocean">
                Category <span className="text-coral">*</span>
              </span>
              <select
                name="category"
                required
                defaultValue=""
                className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean focus:border-lagoon focus:outline-none"
              >
                <option value="" disabled>
                  Pick your category
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ocean">
                Years of experience
              </span>
              <select
                name="years_experience"
                defaultValue=""
                className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean focus:border-lagoon focus:outline-none"
              >
                <option value="" disabled>
                  Pick a range
                </option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y} years
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ocean">
                Notable achievements
              </span>
              <textarea
                name="achievements"
                rows={4}
                placeholder="Exits, publications, deals, awards, or anything that shows your expertise."
                className="w-full resize-y rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ocean">
                Desired contribution rate
              </span>
              <select
                name="contribution_rate"
                defaultValue=""
                className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean focus:border-lagoon focus:outline-none"
              >
                <option value="" disabled>
                  Pick a rate
                </option>
                {RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="open_to_investing"
                value="yes"
                className="mt-0.5 h-4 w-4 accent-[#0BBFBF]"
              />
              <span className="text-sm text-ocean">
                Open to investing in promising Think Tanks?
              </span>
            </label>
            <Field label="Email" name="email" type="email" required />

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
              {busy ? "Submitting…" : "Apply to be an expert →"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ocean">
        {label}
        {required && <span className="ml-1 text-coral">*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
      />
    </label>
  );
}

function Rate({ label, range }: { label: string; range: string }) {
  return (
    <li className="rounded-xl bg-foam/60 p-3">
      <div className="font-display text-sm font-semibold text-ocean">
        {label}
      </div>
      <div className="text-sm text-lagoon">{range}</div>
    </li>
  );
}
