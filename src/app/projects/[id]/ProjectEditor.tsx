"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  aiAssist,
  changeCollaboratorRole,
  changeInvitationRole,
  inviteCollaborator,
  passTurn,
  revokeInvitation,
  saveSection,
  startCall,
  type AssistType,
  type Role,
} from "./actions";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { FALLBACK_COLOR } from "@/lib/colors";
import NotificationsBell from "@/components/NotificationsBell";
import ExportMenu from "@/components/ExportMenu";

type Section = { id: string; title: string | null; position: number };

type Project = {
  id: string;
  title: string;
  project_type: ProjectTypeId;
  collab_mode: "relay" | "live";
};

export type CollaboratorEntry = {
  id: string;
  user_id: string;
  role: string;
  turn_order: number | null;
  color: string;
  display_name: string | null;
  email: string | null;
  isOwner: boolean;
};

export type PendingInvitation = {
  id: string;
  email: string;
  token: string;
  role: string;
  expires_at: string;
};

export type LastEditor = { name: string; color: string };

type Props = {
  project: Project;
  sections: Section[];
  initialContent: Record<string, string>;
  displayName: string;
  initial: string;
  myColor: string;
  isOwner: boolean;
  collaborators: CollaboratorEntry[];
  pendingInvitations: PendingInvitation[];
  origin: string;
  currentHolderId: string | null;
  currentHolderName: string;
  currentHolderColor: string;
  isMyTurn: boolean;
  lastEditorBySection: Record<string, LastEditor | null>;
  unreadNotifications: number;
};

const AUTOSAVE_DEBOUNCE_MS = 2000;

function generateMeetCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

type CallOption = {
  id: "meet" | "zoom" | "facetime" | "teams" | "discord";
  label: string;
  emoji: string;
};

const CALL_OPTIONS: CallOption[] = [
  { id: "meet",     label: "Google Meet",     emoji: "📹" },
  { id: "zoom",     label: "Zoom",            emoji: "🔵" },
  { id: "facetime", label: "FaceTime",        emoji: "🟣" },
  { id: "teams",    label: "Microsoft Teams", emoji: "🟦" },
  { id: "discord",  label: "Discord",         emoji: "🎮" },
];

export default function ProjectEditor({
  project,
  sections,
  initialContent,
  displayName,
  initial,
  myColor,
  isOwner,
  collaborators: initialCollaborators,
  pendingInvitations: initialInvitations,
  origin,
  currentHolderId,
  currentHolderName,
  currentHolderColor,
  isMyTurn,
  lastEditorBySection,
  unreadNotifications,
}: Props) {
  const router = useRouter();
  const typeMeta = PROJECT_TYPES.find((t) => t.id === project.project_type);

  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [saveState, setSaveState] = useState<
    Record<string, "idle" | "saving" | "saved" | "error">
  >({});

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [passing, setPassing] = useState(false);
  const [passBanner, setPassBanner] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [callMenuOpen, setCallMenuOpen] = useState(false);
  const [callToast, setCallToast] = useState<string | null>(null);
  const callMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!callMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!callMenuRef.current?.contains(e.target as Node)) {
        setCallMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [callMenuOpen]);

  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [invitations, setInvitations] = useState(initialInvitations);
  useEffect(() => setCollaborators(initialCollaborators), [initialCollaborators]);
  useEffect(() => setInvitations(initialInvitations), [initialInvitations]);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const triggerSave = useCallback((sectionId: string, text: string) => {
    if (debounceTimers.current[sectionId]) clearTimeout(debounceTimers.current[sectionId]);
    debounceTimers.current[sectionId] = setTimeout(async () => {
      setSaveState((s) => ({ ...s, [sectionId]: "saving" }));
      const result = await saveSection({ sectionId, content: text });
      setSaveState((s) => ({ ...s, [sectionId]: "error" in result ? "error" : "saved" }));
    }, AUTOSAVE_DEBOUNCE_MS);
  }, []);
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => Object.values(timers).forEach((t) => clearTimeout(t));
  }, []);

  const handleChange = (sectionId: string, text: string) => {
    if (!isMyTurn) return;
    setContent((c) => ({ ...c, [sectionId]: text }));
    setSaveState((s) => ({ ...s, [sectionId]: "idle" }));
    triggerSave(sectionId, text);
  };

  const activeSection = sections.find((s) => s.id === activeId) ?? sections[0];
  const activeText = activeSection ? content[activeSection.id] ?? "" : "";

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
    if ("error" in result) setAiError(result.error);
    else setAiSuggestion(result.text);
  };

  const useSuggestion = () => {
    if (!activeSection || !aiSuggestion || !isMyTurn) return;
    const current = content[activeSection.id] ?? "";
    const joined = current.trim().length > 0 ? `${current}\n\n${aiSuggestion}` : aiSuggestion;
    handleChange(activeSection.id, joined);
    setAiSuggestion(null);
  };

  const skipSuggestion = () => {
    setAiSuggestion(null);
    setAiError(null);
  };

  const handlePassTurn = async () => {
    if (passing || !isMyTurn) return;
    setPassing(true);
    setPassBanner(null);
    try {
      if (activeSection) {
        if (debounceTimers.current[activeSection.id]) {
          clearTimeout(debounceTimers.current[activeSection.id]);
          delete debounceTimers.current[activeSection.id];
        }
        await saveSection({ sectionId: activeSection.id, content: content[activeSection.id] ?? "" });
      }
      const result = await passTurn({ projectId: project.id });
      if ("error" in result) {
        setPassBanner({ kind: "error", text: result.error });
        return;
      }
      setPassBanner({
        kind: "success",
        text: result.nextName
          ? `Turn passed to ${result.nextName}.`
          : "Turn passed successfully!",
      });
      setTimeout(() => router.refresh(), 1200);
    } catch (e) {
      setPassBanner({
        kind: "error",
        text: e instanceof Error ? e.message : "Pass turn failed.",
      });
    } finally {
      setPassing(false);
    }
  };

  const handleCallOption = async (id: CallOption["id"]) => {
    setCallMenuOpen(false);
    switch (id) {
      case "meet": {
        const url = `https://meet.google.com/lookup/${generateMeetCode()}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          window.prompt("Copy this meet link:", url);
        }
        setCallToast("Link copied!");
        setTimeout(() => setCallToast(null), 2000);
        void startCall({ projectId: project.id, platform: "meet", callUrl: url });
        return;
      }
      case "zoom":
        window.open("https://zoom.us/start/videomeeting", "_blank", "noopener");
        return;
      case "facetime":
        window.location.href = "facetime://";
        return;
      case "teams":
        window.open("https://teams.microsoft.com/l/meeting/new", "_blank", "noopener");
        return;
      case "discord":
        window.open("https://discord.com/channels/@me", "_blank", "noopener");
        return;
    }
  };

  return (
    <div className="min-h-screen bg-foam pb-24">
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

          <div className="flex items-center gap-2">
            <div className="relative" ref={callMenuRef}>
              <button
                type="button"
                onClick={() => setCallMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={callMenuOpen}
                className="rounded-full border border-ocean/15 bg-white px-3 py-1.5 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
              >
                Face to Face 📹
              </button>
              {callMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-ocean/10 bg-white py-1 shadow-lg"
                >
                  {CALL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      role="menuitem"
                      type="button"
                      onClick={() => handleCallOption(opt.id)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium text-ocean transition hover:bg-foam"
                    >
                      <span aria-hidden className="text-base">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="rounded-full border border-ocean/15 bg-white px-3 py-1.5 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
              >
                ＋ Add Collaborator
              </button>
            )}
            <ExportMenu
              projectTitle={project.title}
              sections={sections.map((s) => ({
                title: s.title,
                position: s.position,
                content: content[s.id] ?? "",
              }))}
            />
            <NotificationsBell initialUnread={unreadNotifications} />
            <div
              title={displayName}
              style={{ backgroundColor: myColor }}
              className="flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold text-white ring-2 ring-white"
            >
              {initial}
            </div>
            <button
              type="button"
              onClick={handlePassTurn}
              disabled={passing || !isMyTurn}
              title={!isMyTurn ? `Waiting for ${currentHolderName}` : undefined}
              className="rounded-full px-4 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "#FF6B47", color: "white" }}
            >
              {passing ? "Passing…" : "Pass turn"}
            </button>
          </div>
        </div>
      </header>

      {passBanner && (
        <div
          className={[
            "mx-auto mt-4 max-w-7xl rounded-xl px-5 py-3 text-sm font-medium",
            passBanner.kind === "success" ? "bg-lagoon text-white" : "bg-coral/15 text-coral",
          ].join(" ")}
        >
          {passBanner.text}
        </div>
      )}

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        {/* Left: sections */}
        <div className="space-y-4">
          {sections.map((s) => {
            const active = s.id === activeSection?.id;
            const state = saveState[s.id] ?? "idle";
            const lastEditor = lastEditorBySection[s.id];
            const borderColor = isMyTurn
              ? active ? myColor : "transparent"
              : active ? currentHolderColor : "transparent";
            const pillText = isMyTurn
              ? active ? "Your turn" : "Locked"
              : `${currentHolderName}'s turn`;
            const pillStyle: React.CSSProperties = isMyTurn && active
              ? { backgroundColor: myColor, color: "white" }
              : isMyTurn
                ? { backgroundColor: "rgba(26,46,46,0.1)", color: "rgba(26,46,46,0.6)" }
                : { backgroundColor: "rgba(26,46,46,0.1)", color: "rgba(26,46,46,0.7)" };
            return (
              <article
                key={s.id}
                onClick={() => setActiveId(s.id)}
                style={{
                  borderColor,
                  boxShadow:
                    active
                      ? `0 0 0 2px ${
                          isMyTurn ? myColor : currentHolderColor
                        }33`
                      : undefined,
                }}
                className="cursor-pointer rounded-2xl border-2 bg-white p-5 shadow-sm transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-lagoon">
                    {s.title ?? `Section ${s.position + 1}`}
                  </span>
                  <span
                    style={pillStyle}
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  >
                    {pillText}
                  </span>
                </div>
                <textarea
                  value={content[s.id] ?? ""}
                  onChange={(e) => handleChange(s.id, e.target.value)}
                  onFocus={() => setActiveId(s.id)}
                  onClick={(e) => e.stopPropagation()}
                  readOnly={!isMyTurn}
                  rows={5}
                  placeholder={isMyTurn ? (active ? "Start writing..." : "Click to activate") : `Waiting for ${currentHolderName}...`}
                  className="mt-3 w-full resize-y rounded-lg border border-ocean/10 bg-foam/50 px-3 py-2 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30 read-only:cursor-not-allowed read-only:bg-ocean/5"
                />
                <div className="mt-3 flex items-center justify-between text-xs">
                  {lastEditor ? (
                    <span style={{ color: lastEditor.color }} className="font-medium">
                      Last edited by {lastEditor.name}
                    </span>
                  ) : (
                    <span className="text-ocean/40">Not yet edited</span>
                  )}
                  <span>
                    {state === "saving" && <span className="text-ocean/50">Saving…</span>}
                    {state === "saved" && <span className="text-ocean/50">Saved</span>}
                    {state === "error" && <span className="text-coral">Save failed</span>}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Right: sidebar */}
        <aside className="space-y-4">
          <RelayStatusPanel
            collaborators={collaborators}
            currentHolderId={currentHolderId}
            currentHolderName={currentHolderName}
            currentHolderColor={currentHolderColor}
            isMyTurn={isMyTurn}
          />

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between bg-lagoon px-5 py-2.5">
              <span className="font-display text-sm font-semibold text-white">AI Assist</span>
              {aiLoading && <span className="text-xs font-medium text-white/80">Thinking…</span>}
            </div>
            <div className="px-5 py-4">
              {aiError ? (
                <p className="text-sm text-coral">{aiError}</p>
              ) : aiSuggestion ? (
                <p className="whitespace-pre-wrap text-sm text-ocean">{aiSuggestion}</p>
              ) : (
                <p className="text-sm italic text-ocean/60">
                  {aiLoading
                    ? "Asking Claude…"
                    : "Click Rhymes, Rewrite, or Unblock below."}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={useSuggestion}
                  disabled={!aiSuggestion || !isMyTurn}
                  title={!isMyTurn ? `Waiting for ${currentHolderName}` : undefined}
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

          <CollaboratorsPanel
            isOwner={isOwner}
            collaborators={collaborators}
            invitations={invitations}
            currentHolderId={currentHolderId}
            onChangeCollabRole={async (id, role) => {
              setCollaborators((list) => list.map((c) => (c.id === id ? { ...c, role } : c)));
              const r = await changeCollaboratorRole({ collaboratorId: id, role });
              if ("error" in r) router.refresh();
            }}
            onChangeInviteRole={async (id, role) => {
              setInvitations((list) => list.map((i) => (i.id === id ? { ...i, role } : i)));
              const r = await changeInvitationRole({ invitationId: id, role });
              if ("error" in r) router.refresh();
            }}
            onRevoke={async (id) => {
              const prev = invitations;
              setInvitations((list) => list.filter((i) => i.id !== id));
              const r = await revokeInvitation({ invitationId: id });
              if ("error" in r) setInvitations(prev);
              else router.refresh();
            }}
            onOpenShare={() => setShareOpen(true)}
          />
        </aside>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-ocean/10 bg-foam/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex gap-2">
            <ToolbarButton label={aiLoading ? "Thinking…" : "Rhymes"} onClick={() => runAssist("rhyme")} disabled={!activeSection} />
            <ToolbarButton label={aiLoading ? "Thinking…" : "Rewrite"} onClick={() => runAssist("rewrite")} disabled={!activeSection} />
            <ToolbarButton label={aiLoading ? "Thinking…" : "Unblock"} onClick={() => runAssist("unblock")} disabled={!activeSection} />
          </div>
          <button
            type="button"
            onClick={handlePassTurn}
            disabled={passing || !isMyTurn}
            title={!isMyTurn ? `Waiting for ${currentHolderName}` : undefined}
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passing ? "Passing…" : "Pass turn →"}
          </button>
        </div>
      </footer>

      {shareOpen && (
        <ShareModal
          projectId={project.id}
          origin={origin}
          invitations={invitations}
          onClose={() => setShareOpen(false)}
          onInvited={(newInvite) => {
            setInvitations((list) => [newInvite, ...list]);
            router.refresh();
          }}
          onRevoke={async (id) => {
            const prev = invitations;
            setInvitations((list) => list.filter((i) => i.id !== id));
            const r = await revokeInvitation({ invitationId: id });
            if ("error" in r) setInvitations(prev);
            else router.refresh();
          }}
        />
      )}

      {callToast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-ocean px-5 py-2 font-display text-sm font-semibold text-white shadow-lg"
        >
          {callToast}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
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

// =============================================================================
// Relay status panel — ordered turn list with per-collaborator colors
// =============================================================================
function RelayStatusPanel({
  collaborators,
  currentHolderId,
  currentHolderName,
  currentHolderColor,
  isMyTurn,
}: {
  collaborators: CollaboratorEntry[];
  currentHolderId: string | null;
  currentHolderName: string;
  currentHolderColor: string;
  isMyTurn: boolean;
}) {
  const currentIdx = collaborators.findIndex((c) => c.user_id === currentHolderId);
  const nextIdx = collaborators.length > 0
    ? (currentIdx === -1 ? 0 : (currentIdx + 1) % collaborators.length)
    : -1;

  const progress =
    collaborators.length > 0 && currentIdx >= 0
      ? ((currentIdx + 1) / collaborators.length) * 100
      : 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
        Relay status
      </div>
      <div
        className="mt-2 font-display text-lg font-bold"
        style={{ color: currentHolderColor }}
      >
        {isMyTurn ? "Your turn" : `${currentHolderName}'s turn`}
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ocean/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${progress}%`, backgroundColor: currentHolderColor }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {collaborators.map((c, i) => {
          const name = c.display_name?.trim() || c.email || "Someone";
          const initial = name.charAt(0).toUpperCase();
          let label = "Waiting";
          if (i === currentIdx) label = "Your turn";
          else if (i === nextIdx) label = "Next up";
          return (
            <li key={c.id} className="flex items-center gap-2.5">
              <div
                style={{ backgroundColor: c.color ?? FALLBACK_COLOR }}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full font-display text-xs font-bold text-white"
              >
                {initial}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ocean">
                {i + 1}. {name}
              </span>
              <span
                style={{ color: c.color ?? FALLBACK_COLOR }}
                className="flex-none text-xs font-semibold"
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// =============================================================================
// Collaborators sidebar panel
// =============================================================================
function CollaboratorsPanel({
  isOwner,
  collaborators,
  invitations,
  currentHolderId,
  onChangeCollabRole,
  onChangeInviteRole,
  onRevoke,
  onOpenShare,
}: {
  isOwner: boolean;
  collaborators: CollaboratorEntry[];
  invitations: PendingInvitation[];
  currentHolderId: string | null;
  onChangeCollabRole: (id: string, role: Role) => void;
  onChangeInviteRole: (id: string, role: Role) => void;
  onRevoke: (id: string) => void;
  onOpenShare: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
          Collaborators
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={onOpenShare}
            className="text-xs font-semibold text-lagoon hover:underline"
          >
            ＋ Add Collaborator
          </button>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {collaborators.map((c) => {
          const name = c.display_name?.trim() || c.email || "Someone";
          const initial = name.charAt(0).toUpperCase();
          const editing = c.user_id === currentHolderId;
          return (
            <li key={c.id} className="flex items-center gap-3">
              <div
                style={{ backgroundColor: c.color ?? FALLBACK_COLOR }}
                className="flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold text-white"
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ocean">
                  {name}{" "}
                  {c.isOwner && (
                    <span className="text-xs font-normal text-ocean/50">(owner)</span>
                  )}
                </div>
                {isOwner && !c.isOwner ? (
                  <RoleSelect
                    role={c.role as Role}
                    onChange={(r) => onChangeCollabRole(c.id, r)}
                  />
                ) : (
                  <div
                    style={{ color: editing ? (c.color ?? FALLBACK_COLOR) : undefined }}
                    className="text-xs font-medium capitalize text-lagoon"
                  >
                    {editing ? "editing" : c.role}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {invitations.length > 0 && (
        <>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-ocean/50">
            Pending invites
          </div>
          <ul className="mt-2 space-y-2">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ocean/10 font-display text-xs font-bold text-ocean/60">
                  ?
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ocean">{inv.email}</div>
                  {isOwner ? (
                    <div className="flex items-center gap-2">
                      <RoleSelect
                        role={inv.role as Role}
                        onChange={(r) => onChangeInviteRole(inv.id, r)}
                      />
                      <button
                        type="button"
                        onClick={() => onRevoke(inv.id)}
                        className="text-xs font-medium text-coral hover:underline"
                      >
                        Revoke
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-ocean/60 capitalize">{inv.role} · pending</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function RoleSelect({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  return (
    <select
      value={role}
      onChange={(e) => onChange(e.target.value as Role)}
      className="mt-0.5 rounded-full border border-ocean/15 bg-white px-2 py-0.5 text-xs font-medium text-ocean focus:border-lagoon focus:outline-none"
    >
      <option value="editor">Editor</option>
      <option value="commenter">Commenter</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}

// =============================================================================
// Share modal (unchanged from prior)
// =============================================================================
function ShareModal({
  projectId,
  origin,
  invitations,
  onClose,
  onInvited,
  onRevoke,
}: {
  projectId: string;
  origin: string;
  invitations: PendingInvitation[];
  onClose: () => void;
  onInvited: (invite: PendingInvitation) => void;
  onRevoke: (id: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<
    | { kind: "success"; text: string; url: string; emailed: boolean }
    | { kind: "error"; text: string }
    | null
  >(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    const result = await inviteCollaborator({
      projectId,
      email: email.trim(),
      role,
    });
    setBusy(false);
    if ("error" in result) {
      setNotice({ kind: "error", text: result.error });
      return;
    }
    setNotice({
      kind: "success",
      text: result.emailSent
        ? `Invite emailed to ${email}.`
        : `Invite created. Email skipped${result.emailNote ? ` — ${result.emailNote}` : ""}. Share this link:`,
      url: result.inviteUrl,
      emailed: result.emailSent,
    });
    onInvited({
      id: crypto.randomUUID(),
      email: email.trim().toLowerCase(),
      token: result.inviteUrl.split("/invite/")[1] ?? "",
      role,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    });
    setEmail("");
  };

  const copy = async (token: string) => {
    const url = `${origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((t) => (t === token ? null : t)), 1500);
    } catch {
      window.prompt("Copy this invite link:", url);
    }
  };

  return (
    <ModalShell onClose={onClose} title="Add Collaborator">
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ocean">Invite by email</span>
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-lg border border-ocean/15 bg-white px-3 py-2 text-sm text-ocean focus:border-lagoon focus:outline-none"
            >
              <option value="editor">Editor</option>
              <option value="commenter">Commenter</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </label>
        <button
          type="submit"
          disabled={busy}
          style={{ backgroundColor: "#FF6B47", color: "white" }}
          className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send invite"}
        </button>
      </form>

      {notice && notice.kind === "error" && (
        <p className="mt-3 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{notice.text}</p>
      )}
      {notice && notice.kind === "success" && (
        <div className="mt-3 rounded-md bg-lagoon/10 p-3 text-sm text-ocean">
          <div className="font-medium">{notice.text}</div>
          <div className="mt-2 flex items-center gap-2">
            <code className="block flex-1 truncate rounded bg-white px-2 py-1 text-xs text-ocean">
              {notice.url}
            </code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(notice.url);
                } catch {
                  window.prompt("Copy:", notice.url);
                }
              }}
              className="rounded-full border border-ocean/15 px-3 py-1 text-xs font-medium text-ocean hover:bg-ocean hover:text-white"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-ocean/60">
            Pending invites
          </div>
          <ul className="mt-2 space-y-2">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-ocean/10 bg-foam/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ocean">{inv.email}</div>
                  <div className="text-xs text-ocean/60 capitalize">{inv.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copy(inv.token)}
                    className="rounded-full border border-ocean/15 bg-white px-3 py-1 text-xs font-medium text-ocean hover:bg-ocean hover:text-white"
                  >
                    {copiedToken === inv.token ? "Copied!" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevoke(inv.id)}
                    className="rounded-full px-3 py-1 text-xs font-medium text-coral hover:underline"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ModalShell>
  );
}

// =============================================================================
// Shared modal shell
// =============================================================================
function ModalShell({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ocean/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ocean">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ocean/60 hover:bg-ocean/10 hover:text-ocean"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
