"use client";

import { useState } from "react";

export default function UnlockButton({
  token,
  priceCents,
  projectTypeLabel,
}: {
  token: string;
  priceCents: number;
  projectTypeLabel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
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

  const dollars = (priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2);

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email for your unlock receipt (optional)"
        className="w-full max-w-sm rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        style={{ backgroundColor: "#FF6B47", color: "white" }}
        className="rounded-full px-6 py-3 font-display text-base font-semibold shadow-lg transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy
          ? "Redirecting…"
          : `Unlock the full ${projectTypeLabel} for $${dollars}`}
      </button>
      {err && (
        <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
          {err}
        </p>
      )}
    </div>
  );
}
