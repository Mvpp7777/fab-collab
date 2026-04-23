"use client";

import { useEffect, useState } from "react";

type Props = {
  recentJoins: Array<{ name: string; joinedAtIso: string }>;
  lastHourCount: number;
};

export default function CampaignActivity({ recentJoins, lastHourCount }: Props) {
  return (
    <ul className="space-y-1.5 text-sm text-ocean/80">
      {lastHourCount > 1 && (
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#0BBFBF]" />
          {lastHourCount} people joined in the last hour
        </li>
      )}
      {recentJoins.slice(0, 5).map((r, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#0BBFBF]" />
          <Pulse>{r.name}</Pulse> just joined ·{" "}
          <RelativeTime iso={r.joinedAtIso} />
        </li>
      ))}
      {recentJoins.length === 0 && lastHourCount === 0 && (
        <li className="italic text-ocean/50">Be the first to join.</li>
      )}
    </ul>
  );
}

function Pulse({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-ocean">{children}</span>;
}

function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatRelative(iso));
  useEffect(() => {
    const id = setInterval(() => setLabel(formatRelative(iso)), 30000);
    return () => clearInterval(id);
  }, [iso]);
  return <span>{label}</span>;
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
