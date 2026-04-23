"use client";

import { useState } from "react";
import { submitFeedback } from "./actions";

export default function FeedbackForm({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const result = await submitFeedback({ token, name, email, body });
    setBusy(false);
    if ("error" in result) {
      setErr(result.error);
      return;
    }
    setSent(true);
    setName("");
    setEmail("");
    setBody("");
  };

  if (sent) {
    return (
      <div className="rounded-lg bg-lagoon/10 px-4 py-6 text-center">
        <div className="text-2xl" aria-hidden>
          🙏
        </div>
        <p className="mt-2 font-display text-base font-semibold text-ocean">
          Thanks for the feedback!
        </p>
        <p className="mt-1 text-sm text-ocean/70">
          The creator will see your note on their project.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 rounded-full border border-ocean/15 bg-white px-4 py-1.5 text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ocean/70">
            Name (optional)
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ocean/70">
            Email (optional)
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ocean/70">
          Your feedback
          <span className="ml-1 text-coral">*</span>
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={5}
          placeholder="What worked? What could be stronger?"
          className="w-full resize-y rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      {err && (
        <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
          {err}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={busy}
          style={{ backgroundColor: "#FF6B47", color: "white" }}
          className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send feedback"}
        </button>
      </div>
    </form>
  );
}
