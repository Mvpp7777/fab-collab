"use client";

import { useState } from "react";

export default function CoWriteButton({
  token,
  sectionId,
  priceCents,
}: {
  token: string;
  sectionId: string;
  priceCents: number;
}) {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dollars = (priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2);

  const submit = async () => {
    if (busy) return;
    if (!email.trim()) {
      setErr("Enter an email so we can welcome you to the project.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          section_id: sectionId,
          buyer_email: email,
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ backgroundColor: "#FF6B47", color: "white" }}
        className="mt-3 rounded-full px-4 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
      >
        ✍️ Co-write this section — ${dollars}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-coral/30 bg-coral/5 p-4">
      <p className="font-display text-sm font-semibold text-ocean">
        Co-write this section for ${dollars}
      </p>
      <p className="mt-1 text-xs text-ocean/70">
        After payment you become a collaborator and join the relay queue.
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="mt-3 w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
      />
      {err && (
        <p className="mt-2 rounded-md bg-coral/10 px-3 py-2 text-xs text-coral">
          {err}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          style={{ backgroundColor: "#FF6B47", color: "white" }}
          className="rounded-full px-4 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Redirecting…" : `Pay $${dollars}`}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-ocean/15 bg-white px-4 py-2 font-display text-sm font-medium text-ocean/70 transition hover:text-ocean"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
