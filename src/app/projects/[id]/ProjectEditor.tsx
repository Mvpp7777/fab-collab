"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { aiAssist, saveSection, type AssistType } from "./actions";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";

type Section = {
  id: string;
  title: string | null;
  position: number;
};

type Project = {
  id: string;
  title: string;
  project_type: ProjectTypeId;
  collab_mode: "relay" | "live";
};

type Props = {
  project: Project;
  sections: Section[];
  initialContent: Record<string, string>;
  displayName: string;
  initial: string;
};

const AUTOSAVE_DEBOUNCE_MS = 2000;

export default function ProjectEditor({
  project,
  sections,
  initialContent,
  displayName,
  initial,
}: Props) {
  const typeMeta = PROJECT_TYPES.find((t) => t.id === project.project_type);
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [saveState, setSaveState] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const triggerSave = useCallback(
    (sectionId: string, text: string) => {
      if (debounceTimers.current[sectionId]) {
        clearTimeout(debounceTimers.current[sectionId]);
      }
      debounceTimers.current[sectionId] = setTimeout(async () => {
        setSaveState((s) => ({ ...s, [sectionId]: "saving" }));
        const result = await saveSection({ sectionId, content: text });
        setSaveState((s) => ({
          ...s,
          [sectionId]: "error" in result ? "error" : "saved",
        }));
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [],
  );

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleChange = (sectionId: string, text: string) => {
    setContent((c) => ({ ...c, [sectionId]: text }));
    setSaveState((s) => ({ ...s, [sectionId]: "idle" }));
    triggerSave(sectionId, text);
  };

  const activeSection = sections.find((s) => s.id === activeId) ?? sections[0];
  const activeText = activeSection ? (content[activeSection.id] ?? "") : "";

  const runAssist = async (assistType: AssistType) => {
    if (!activeSection) return;
    setAiError(null);
    setAiSuggestion(null);
    setAiLoading(true);
    const result = await aiAssist({
      sectionText: activeText,
      projectType: project.project_type,
      assistType,
    });
    setAiLoading(false);
    if ("error" in result) {
      setAiError(result.error);
    } else {
      setAiSuggestion(result.text);
    }
  };

  const useSuggestion = () => {
    if (!activeSection || !aiSuggestion) return;
    const current = content[activeSection.id] ?? "";
    const joined = current.trim().length > 0
      ? `${current}\n\n${aiSuggestion}`
      : aiSuggestion;
    handleChange(activeSection.id, joined);
    setAiSuggestion(null);
  };

  const skipSuggestion = () => {
    setAiSuggestion(null);
    setAiError(null);
  };

  return (
    <div className="min-h-screen bg-foam pb-24">
      {/* Top bar */}
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-ocean/60 transition hover:bg-white hover:text-ocean"
            >
              ←
            </Link>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-ocean">
                {project.title}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ocean/70">
                  {typeMeta?.emoji ?? "✨"} {typeMeta?.label ?? project.project_type}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium capitalize text-ocean/70">
                  {project.collab_mode} mode
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              title={displayName}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-lagoon font-display text-sm font-bold text-white ring-2 ring-white"
            >
              {initial}
            </div>
            <button
              type="button"
              className="rounded-full bg-coral px-4 py-2 font-display text-sm font-semibold text-white shadow transition hover:brightness-110 active:scale-95"
              style={{ backgroundColor: "#FF6B47", color: "white" }}
            >
              Pass turn
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        {/* Left: sections */}
        <div className="space-y-4">
          {sections.map((s) => {
            const active = s.id === activeSection?.id;
            const state = saveState[s.id] ?? "idle";
            return (
              <article
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={[
                  "cursor-pointer rounded-2xl bg-white p-5 shadow-sm transition",
                  active
                    ? "border-2 border-lagoon ring-2 ring-lagoon/20"
                    : "border-2 border-transparent",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-lagoon">
                    {s.title ?? `Section ${s.position + 1}`}
                  </span>
                  <span
                    className={[
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      active
                        ? "bg-lagoon text-white"
                        : "bg-ocean/10 text-ocean/60",
                    ].join(" ")}
                  >
                    {active ? "Your turn" : "Locked"}
                  </span>
                </div>
                <textarea
                  value={content[s.id] ?? ""}
                  onChange={(e) => handleChange(s.id, e.target.value)}
                  onFocus={() => setActiveId(s.id)}
                  onClick={(e) => e.stopPropagation()}
                  rows={5}
                  placeholder={active ? "Start writing..." : "Click to make this the active section"}
                  className="mt-3 w-full resize-y rounded-lg border border-ocean/10 bg-foam/50 px-3 py-2 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-ocean/50">
                  <span>Last edited by {displayName}</span>
                  <span>
                    {state === "saving" && "Saving…"}
                    {state === "saved" && "Saved"}
                    {state === "error" && (
                      <span className="text-coral">Save failed</span>
                    )}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Right: sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
              Relay status
            </div>
            <div className="mt-2 font-display text-lg font-bold text-ocean">
              Your turn
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ocean/10">
              <div className="h-full w-1/3 rounded-full bg-lagoon" />
            </div>
            <p className="mt-2 text-xs text-ocean/60">
              Section {sections.findIndex((s) => s.id === activeSection?.id) + 1} of {sections.length}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between bg-lagoon px-5 py-2.5">
              <span className="font-display text-sm font-semibold text-white">
                AI Assist
              </span>
              {aiLoading && (
                <span className="text-xs font-medium text-white/80">Thinking…</span>
              )}
            </div>
            <div className="px-5 py-4">
              {aiError ? (
                <p className="text-sm text-coral">{aiError}</p>
              ) : aiSuggestion ? (
                <p className="whitespace-pre-wrap text-sm text-ocean">
                  {aiSuggestion}
                </p>
              ) : (
                <p className="text-sm italic text-ocean/60">
                  {aiLoading
                    ? "Asking Claude…"
                    : "Click Rhymes, Rewrite, or Unblock below to get a suggestion."}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={useSuggestion}
                  disabled={!aiSuggestion}
                  className="rounded-full bg-lagoon px-4 py-1.5 font-display text-xs font-semibold text-white shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Use it
                </button>
                <button
                  type="button"
                  onClick={skipSuggestion}
                  disabled={!aiSuggestion && !aiError}
                  className="rounded-full border border-ocean/15 px-4 py-1.5 font-display text-xs font-medium text-ocean/70 transition hover:text-ocean disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
              Collaborators
            </div>
            <ul className="mt-3 space-y-2">
              <li className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lagoon font-display text-xs font-bold text-white">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ocean">
                    {displayName}
                  </div>
                  <div className="text-xs font-medium text-lagoon">editing</div>
                </div>
              </li>
            </ul>
          </div>
        </aside>
      </main>

      {/* Bottom toolbar */}
      <footer className="fixed inset-x-0 bottom-0 border-t border-ocean/10 bg-foam/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex gap-2">
            <ToolbarButton
              label={aiLoading ? "Thinking…" : "Rhymes"}
              onClick={() => runAssist("rhyme")}
              disabled={!activeSection}
            />
            <ToolbarButton
              label={aiLoading ? "Thinking…" : "Rewrite"}
              onClick={() => runAssist("rewrite")}
              disabled={!activeSection}
            />
            <ToolbarButton
              label={aiLoading ? "Thinking…" : "Unblock"}
              onClick={() => runAssist("unblock")}
              disabled={!activeSection}
            />
          </div>
          <button
            type="button"
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Pass turn →
          </button>
        </div>
      </footer>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-ocean/15 bg-white px-4 py-1.5 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
