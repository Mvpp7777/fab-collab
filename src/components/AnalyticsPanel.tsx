"use client";

import { useEffect, useState } from "react";
import {
  getProjectAnalytics,
  type AnalyticsData,
} from "@/app/projects/[id]/analytics-actions";

export default function AnalyticsPanel({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getProjectAnalytics({ projectId });
      if (cancelled) return;
      setLoading(false);
      if ("error" in r) setErr(r.error);
      else setData(r.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const maxWords = data
    ? Math.max(1, ...data.wordsByContributor.map((w) => w.words))
    : 1;
  const maxDay = data ? Math.max(1, ...data.timelinePoints.map((p) => p.count)) : 1;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-ocean/30"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-ocean/10 px-5 py-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
              Analytics
            </div>
            <div className="font-display text-base font-semibold text-ocean">
              Project insights
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close analytics"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ocean/60 hover:bg-ocean/10 hover:text-ocean"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-center text-sm text-ocean/60">Loading…</p>
          ) : err ? (
            <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{err}</p>
          ) : data ? (
            <>
              <Section title="Words by contributor">
                {data.wordsByContributor.length === 0 ? (
                  <Empty text="No contributions yet." />
                ) : (
                  <ul className="space-y-2">
                    {data.wordsByContributor.map((w) => (
                      <li key={w.userId}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium" style={{ color: w.color }}>
                            {w.name}
                          </span>
                          <span className="text-ocean/60">{w.words} words</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ocean/10">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(w.words / maxWords) * 100}%`,
                              backgroundColor: w.color,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Contributions (last 30 days)">
                <div className="flex items-end gap-0.5 h-24">
                  {data.timelinePoints.map((p) => (
                    <div
                      key={p.day}
                      title={`${p.day}: ${p.count}`}
                      className="flex-1 rounded-t bg-lagoon/60"
                      style={{ height: `${(p.count / maxDay) * 100}%` }}
                    />
                  ))}
                </div>
              </Section>

              <Section title="Section completion">
                <ul className="space-y-1.5">
                  {data.sectionCompletion.map((s) => (
                    <li
                      key={s.sectionId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate text-ocean">{s.title}</span>
                      <span
                        className={
                          s.wordCount > 0
                            ? "text-ocean/60"
                            : "text-ocean/40 italic"
                        }
                      >
                        {s.wordCount > 0 ? `${s.wordCount} words` : "empty"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Engagement">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Feedback" value={data.feedbackCount} />
                  <Stat label="Shares viewed" value={data.feedbackViews} />
                  <Stat label="AI uses" value={data.aiAssistCount} />
                </div>
                {data.recentFeedback.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-ocean/60">
                      Recent feedback
                    </div>
                    <ul className="space-y-1.5">
                      {data.recentFeedback.map((f, i) => (
                        <li
                          key={i}
                          className="rounded-md bg-foam/60 px-3 py-2 text-xs text-ocean"
                        >
                          <span className="font-semibold">{f.name ?? "Anonymous"}:</span>{" "}
                          {f.body.length > 140
                            ? f.body.slice(0, 140) + "…"
                            : f.body}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-lagoon">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ocean/10 bg-white p-2 text-center">
      <div className="font-display text-lg font-extrabold text-lagoon">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ocean/60">
        {label}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm italic text-ocean/50">{text}</p>;
}
