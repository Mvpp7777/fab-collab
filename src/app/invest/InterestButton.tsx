"use client";

import { useState } from "react";
import { expressInterest } from "./actions";

export default function InterestButton({
  projectId,
  signedIn,
}: {
  projectId: string;
  signedIn: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <a
        href={`/auth/login?next=/invest`}
        style={{ backgroundColor: "#FF6B47", color: "white" }}
        className="mt-4 inline-block self-start rounded-full px-4 py-1.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
      >
        Sign in to express interest →
      </a>
    );
  }

  if (done) {
    return (
      <p className="mt-4 rounded-lg bg-lagoon/10 px-3 py-2 text-sm font-medium text-lagoon">
        Your interest has been sent to the team. They will reach out directly.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ backgroundColor: "#FF6B47", color: "white" }}
        className="mt-4 inline-block self-start rounded-full px-4 py-1.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
      >
        Express Interest →
      </button>
    );
  }

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    const r = await expressInterest({ projectId, message });
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    setDone(true);
  };

  return (
    <div className="mt-4 rounded-xl border border-lagoon/30 bg-lagoon/5 p-4">
      <p className="font-display text-sm font-semibold text-ocean">
        Send a quick note to the team
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Optional — what excites you about this project?"
        className="mt-2 w-full resize-y rounded-lg border border-ocean/15 bg-white px-3 py-2 text-sm text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
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
          className="rounded-full px-4 py-1.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send my interest"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-ocean/15 bg-white px-4 py-1.5 font-display text-sm font-medium text-ocean/70 transition hover:text-ocean"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
