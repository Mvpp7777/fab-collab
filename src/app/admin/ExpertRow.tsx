"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveExpert, rejectExpert } from "./actions";

type Row = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  company: string | null;
  category: string | null;
  years_experience: string | null;
  contribution_rate: string | null;
  open_to_investing: boolean | null;
  achievements: string | null;
  linkedin_url: string | null;
  created_at: string;
};

export default function ExpertRow({ row }: { row: Row }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const doAction = async (kind: "approve" | "reject") => {
    setBusy(kind);
    setErr(null);
    const r =
      kind === "approve"
        ? await approveExpert({ id: row.id })
        : await rejectExpert({ id: row.id });
    setBusy(null);
    if ("error" in r) setErr(r.error);
    else router.refresh();
  };

  return (
    <li className="rounded-xl border border-ocean/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-base font-bold text-ocean">
            {row.name}
          </div>
          <div className="text-xs text-ocean/60">
            {row.title ?? "—"} · {row.company ?? "—"} · {row.category ?? "—"}
          </div>
          <div className="text-xs text-ocean/50">
            {row.email} · {row.years_experience ?? "?"} years · {row.contribution_rate ?? "?"}
            {row.open_to_investing ? " · 💰 invests" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold text-lagoon hover:underline"
          >
            {expanded ? "Hide" : "Details"}
          </button>
          <button
            type="button"
            onClick={() => doAction("approve")}
            disabled={busy !== null}
            style={{ backgroundColor: "#0BBFBF", color: "white" }}
            className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
          >
            {busy === "approve" ? "…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => doAction("reject")}
            disabled={busy !== null}
            className="rounded-full border border-coral px-3 py-1.5 text-xs font-semibold text-coral disabled:opacity-60"
          >
            {busy === "reject" ? "…" : "Reject"}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 rounded-md bg-foam/60 p-3 text-sm text-ocean">
          {row.linkedin_url && (
            <a
              href={row.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lagoon hover:underline"
            >
              LinkedIn ↗
            </a>
          )}
          {row.achievements && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ocean/80">
              {row.achievements}
            </p>
          )}
        </div>
      )}
      {err && <p className="mt-2 text-xs text-coral">{err}</p>}
    </li>
  );
}
