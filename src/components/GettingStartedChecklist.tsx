"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "fabcollab_getting_started_v1";
const DISMISS_KEY = "fabcollab_getting_started_dismissed_v1";

type ChecklistItem = {
  id:
    | "created_project"
    | "invited_collaborator"
    | "wrote_section"
    | "used_ai"
    | "completed_project"
    | "shared_feedback";
  label: string;
  href: string;
  cta: string;
};

const ITEMS: ChecklistItem[] = [
  { id: "created_project",      label: "Create your first project", href: "/projects/new",  cta: "Create" },
  { id: "invited_collaborator", label: "Invite a collaborator",     href: "/dashboard",     cta: "Invite" },
  { id: "wrote_section",        label: "Write your first section",  href: "/dashboard",     cta: "Write" },
  { id: "used_ai",              label: "Try AI Assist",             href: "/dashboard",     cta: "Try" },
  { id: "completed_project",    label: "Complete a project",        href: "/dashboard",     cta: "Finish" },
  { id: "shared_feedback",      label: "Share for feedback",        href: "/dashboard",     cta: "Share" },
];

type ServerHints = {
  hasProject: boolean;
  hasCollaborator: boolean;
  hasContribution: boolean;
  hasCompleted: boolean;
  hasFeedbackToken: boolean;
};

export default function GettingStartedChecklist({
  userId,
  hints,
}: {
  userId: string;
  hints: ServerHints;
}) {
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dis = window.localStorage.getItem(`${DISMISS_KEY}:${userId}`);
    if (dis) {
      setDismissed(true);
      return;
    }
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${userId}`);
    if (raw) {
      try {
        setLocal(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, [userId]);

  const done: Record<ChecklistItem["id"], boolean> = {
    created_project: hints.hasProject || Boolean(local.created_project),
    invited_collaborator: hints.hasCollaborator || Boolean(local.invited_collaborator),
    wrote_section: hints.hasContribution || Boolean(local.wrote_section),
    used_ai: Boolean(local.used_ai),
    completed_project: hints.hasCompleted || Boolean(local.completed_project),
    shared_feedback: hints.hasFeedbackToken || Boolean(local.shared_feedback),
  };

  const total = ITEMS.length;
  const doneCount = ITEMS.filter((i) => done[i.id]).length;
  const allDone = doneCount === total;

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`${DISMISS_KEY}:${userId}`, "1");
    }
    setDismissed(true);
  };

  if (dismissed || allDone) return null;

  return (
    <aside className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="font-display text-sm font-bold text-ocean">
          Getting started
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs font-medium text-ocean/50 hover:text-ocean"
        >
          Dismiss
        </button>
      </div>
      <div className="mt-2 text-xs text-ocean/60">
        {doneCount} of {total} complete
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ocean/10">
        <div
          className="h-full rounded-full bg-lagoon transition-all"
          style={{ width: `${(doneCount / total) * 100}%` }}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {ITEMS.map((item) => (
          <li key={item.id} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden
              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] ${
                done[item.id]
                  ? "bg-lagoon text-white"
                  : "border border-ocean/20 bg-white text-ocean/40"
              }`}
            >
              {done[item.id] ? "✓" : ""}
            </span>
            <span
              className={
                done[item.id] ? "flex-1 text-ocean/50 line-through" : "flex-1 text-ocean"
              }
            >
              {item.label}
            </span>
            {!done[item.id] && (
              <Link
                href={item.href}
                className="text-xs font-semibold text-lagoon hover:underline"
              >
                {item.cta} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
