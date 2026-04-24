"use client";

import { useState } from "react";
import { runWeeklyDigestNow } from "./actions";

export default function DigestButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    const r = await runWeeklyDigestNow();
    setBusy(false);
    if ("error" in r) {
      setResult(`Error: ${r.error}`);
    } else {
      setResult(
        `Scanned ${r.summary.scanned} · Candidates ${r.summary.candidates} · Sent ${r.summary.sent} · Failed ${r.summary.failed}`
      );
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        style={{ backgroundColor: "#0BBFBF", color: "white" }}
        className="rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-60"
      >
        {busy ? "Sending…" : "Run digest"}
      </button>
      {result && <div className="text-xs text-ocean/70">{result}</div>}
    </div>
  );
}
