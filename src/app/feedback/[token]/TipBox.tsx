"use client";

import { useState } from "react";

type Quick = { cents: number; label: string };

const QUICK_AMOUNTS: Quick[] = [
  { cents: 100, label: "$1 ☕" },
  { cents: 300, label: "$3 🎵" },
  { cents: 500, label: "$5 ⭐" },
  { cents: 1000, label: "$10 🏆" },
];

export default function TipBox({ token }: { token: string }) {
  const [selected, setSelected] = useState<number | null>(300);
  const [custom, setCustom] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const customCents = (() => {
    const n = Number.parseFloat(custom.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  })();

  const amountCents = selected ?? customCents ?? 0;

  const submit = async () => {
    if (busy) return;
    if (amountCents < 100) {
      setErr("Tip must be at least $1.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          amount_cents: amountCents,
          tipper_name: name,
          tipper_email: email,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setErr(data.error ?? "Could not start checkout.");
        setBusy(false);
        return;
      }
      window.location.href = data.url as string;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error.");
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ocean">
        Love what you&rsquo;re reading? Support the creators
      </h2>
      <p className="mt-1 text-sm text-ocean/70">
        100% goes to the team behind this project (minus a 10% Fab Collab fee).
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUICK_AMOUNTS.map((q) => {
          const active = selected === q.cents;
          return (
            <button
              key={q.cents}
              type="button"
              onClick={() => {
                setSelected(q.cents);
                setCustom("");
              }}
              style={
                active
                  ? { backgroundColor: "#FF6B47", color: "white", borderColor: "#FF6B47" }
                  : undefined
              }
              className="rounded-full border border-ocean/15 bg-white px-4 py-2 font-display text-sm font-semibold text-ocean transition hover:border-coral hover:text-coral"
            >
              {q.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-ocean/60">or</span>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ocean/50">
            $
          </span>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="decimal"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              setSelected(null);
            }}
            placeholder="Custom amount"
            className="w-full rounded-lg border border-ocean/15 bg-white py-2 pl-7 pr-3 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email for receipt (optional)"
          className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </div>

      {err && (
        <p className="mt-3 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
          {err}
        </p>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={submit}
          disabled={busy || amountCents < 100}
          style={{ backgroundColor: "#FF6B47", color: "white" }}
          className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy
            ? "Redirecting…"
            : `Support the creators${amountCents >= 100 ? ` · $${(amountCents / 100).toFixed(amountCents % 100 === 0 ? 0 : 2)}` : ""}`}
        </button>
      </div>
    </div>
  );
}
