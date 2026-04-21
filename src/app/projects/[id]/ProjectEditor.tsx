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
  type CallPlatform,
  type Role,
} from "./actions";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";

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

type Props = {
  project: Project;
  sections: Section[];
  initialContent: Record<string, string>;
  displayName: string;
  initial: string;
  isOwner: boolean;
  collaborators: CollaboratorEntry[];
  pendingInvitations: PendingInvitation[];
  origin: string;
};

const AUTOSAVE_DEBOUNCE_MS = 2000;

const CALL_PLATFORMS: {
  id: CallPlatform;
  label: string;
  emoji: string;
  startUrl: string;
  description: string;
}[] = [
  { id: "meet",     label: "Google Meet",     emoji: "📹", startUrl: "https://meet.google.com/new",        description: "Create a room, then paste the link back here" },
  { id: "zoom",     label: "Zoom",            emoji: "🟦", startUrl: "https://zoom.us/start",              description: "Start an instant meeting, then paste the link" },
  { id: "facetime", label: "FaceTime",        emoji: "📞", startUrl: "facetime://",                         description: "Mac/iPhone deep link" },
  { id: "teams",    label: "Microsoft Teams", emoji: "🟪", startUrl: "https://teams.microsoft.com/l/meeting/new?subject=Fab%20Collab%20call", description: "Open a new meeting" },
  { id: "discord",  label: "Discord",         emoji: "🟣", startUrl: "https://discord.com/channels/@me",   description: "Open Discord, then paste an invite link" },
];

export default function ProjectEditor({
  project,
  sections,
  initialContent,
  displayName,
  initial,
  isOwner,
  collaborators: initialCollaborators,
  pendingInvitations: initialInvitations,
  origin,
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
  const [callOpen, setCallOpen] = useState(false);

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
    if (!activeSection || !aiSuggestion) return;
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
    if (passing) return;
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
      const result = await passTurn({
        projectId: project.id,
        activeSectionId: activeSection?.id ?? null,
      });
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
            <button
              type="button"
              onClick={() => setCallOpen(true)}
              className="rounded-full border border-ocean/15 bg-white px-3 py-1.5 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
            >
              📞 Start a call
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="rounded-full border border-ocean/15 bg-white px-3 py-1.5 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
              >
                ＋ Share
              </button>
            )}
            <div
              title={displayName}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-lagoon font-display text-sm font-bold text-white ring-2 ring-white"
            >
              {initial}
            </div>
            <button
              type="button"
              onClick={handlePassTurn}
              disabled={passing}
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
                      active ? "bg-lagoon text-white" : "bg-ocean/10 text-ocean/60",
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
                  placeholder={active ? "Start writing..." : "Click to activate"}
                  className="mt-3 w-full resize-y rounded-lg border border-ocean/10 bg-foam/50 px-3 py-2 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
                />
                <div className="mt-3 flex items-center justify-between text-xs text-ocean/50">
                  <span>Last edited by {displayName}</span>
                  <span>
                    {state === "saving" && "Saving…"}
                    {state === "saved" && "Saved"}
                    {state === "error" && <span className="text-coral">Save failed</span>}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {/* Right: sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">Relay status</div>
            <div className="mt-2 font-display text-lg font-bold text-ocean">Your turn</div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ocean/10">
              <div className="h-full w-1/3 rounded-full bg-lagoon" />
            </div>
            <p className="mt-2 text-xs text-ocean/60">
              Section {sections.findIndex((s) => s.id === activeSection?.id) + 1} of {sections.length}
            </p>
          </div>

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

          <CollaboratorsPanel
            isOwner={isOwner}
            collaborators={collaborators}
            invitations={invitations}
            onChangeCollabRole={async (id, role) => {
              setCollaborators((list) =>
                list.map((c) => (c.id === id ? { ...c, role } : c)),
              );
              const r = await changeCollaboratorRole({ collaboratorId: id, role });
              if ("error" in r) router.refresh();
            }}
            onChangeInviteRole={async (id, role) => {
              setInvitations((list) =>
                list.map((i) => (i.id === id ? { ...i, role } : i)),
              );
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
            disabled={passing}
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

      {callOpen && (
        <StartCallModal
          projectId={project.id}
          collaboratorCount={Math.max(collaborators.length - 1, 0)}
          onClose={() => setCallOpen(false)}
        />
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
// Collaborators sidebar panel
// =============================================================================
function CollaboratorsPanel({
  isOwner,
  collaborators,
  invitations,
  onChangeCollabRole,
  onChangeInviteRole,
  onRevoke,
  onOpenShare,
}: {
  isOwner: boolean;
  collaborators: CollaboratorEntry[];
  invitations: PendingInvitation[];
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
            ＋ Invite
          </button>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {collaborators.map((c) => {
          const name = c.display_name?.trim() || c.email || "Unknown";
          const initial = name.charAt(0).toUpperCase();
          return (
            <li key={c.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lagoon font-display text-xs font-bold text-white">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ocean">
                  {name} {c.isOwner && <span className="text-xs font-normal text-ocean/50">(owner)</span>}
                </div>
                {isOwner && !c.isOwner ? (
                  <RoleSelect
                    role={c.role as Role}
                    onChange={(r) => onChangeCollabRole(c.id, r)}
                  />
                ) : (
                  <div className="text-xs font-medium capitalize text-lagoon">{c.role}</div>
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
// Share modal
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
    // Optimistically add a pending invite; server-side pull happens on refresh.
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
    <ModalShell onClose={onClose} title="Share project">
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
// Start a call modal
// =============================================================================
function StartCallModal({
  projectId,
  collaboratorCount,
  onClose,
}: {
  projectId: string;
  collaboratorCount: number;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<CallPlatform | null>(null);
  const [pastedUrl, setPastedUrl] = useState("");
  const [sharing, setSharing] = useState(false);
  const [result, setResult] = useState<
    | { kind: "success"; text: string }
    | { kind: "error"; text: string }
    | null
  >(null);

  const platformMeta = selected ? CALL_PLATFORMS.find((p) => p.id === selected) : null;

  const pickPlatform = (id: CallPlatform) => {
    setSelected(id);
    setResult(null);
    const meta = CALL_PLATFORMS.find((p) => p.id === id);
    if (!meta) return;
    if (id === "facetime") {
      window.location.href = meta.startUrl;
    } else {
      window.open(meta.startUrl, "_blank", "noopener");
    }
  };

  const share = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || sharing) return;
    setSharing(true);
    setResult(null);
    try {
      await navigator.clipboard.writeText(pastedUrl);
    } catch {
      // non-fatal
    }
    const r = await startCall({
      projectId,
      platform: selected,
      callUrl: pastedUrl,
    });
    setSharing(false);
    if ("error" in r) {
      setResult({ kind: "error", text: r.error });
      return;
    }
    setResult({
      kind: "success",
      text:
        collaboratorCount === 0
          ? "Link copied. No other collaborators to notify yet."
          : `Link copied and ${r.count} ${r.count === 1 ? "collaborator" : "collaborators"} notified.`,
    });
  };

  return (
    <ModalShell onClose={onClose} title="Start a call">
      <p className="text-sm text-ocean/70">
        Pick a platform. We&rsquo;ll open it in a new tab — paste the generated
        link back to copy and notify your collaborators.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CALL_PLATFORMS.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPlatform(p.id)}
              aria-pressed={active}
              className={[
                "rounded-xl p-3 text-left transition",
                "border-2",
                active
                  ? "border-lagoon bg-lagoon/5"
                  : "border-ocean/10 bg-white hover:border-ocean/30",
              ].join(" ")}
            >
              <div className="text-2xl">{p.emoji}</div>
              <div className="mt-1 font-display text-sm font-semibold text-ocean">
                {p.label}
              </div>
            </button>
          );
        })}
      </div>

      {selected && platformMeta && selected !== "facetime" && (
        <form onSubmit={share} className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-ocean">
            Paste the {platformMeta.label} link
          </label>
          <input
            type="url"
            required
            value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)}
            placeholder={`https://... your ${platformMeta.label} link`}
            className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={sharing}
              style={{ backgroundColor: "#FF6B47", color: "white" }}
              className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharing ? "Sharing…" : "Copy & notify collaborators"}
            </button>
            <span className="text-xs text-ocean/60">
              {collaboratorCount === 0
                ? "No collaborators yet — link still copies."
                : `${collaboratorCount} ${collaboratorCount === 1 ? "person" : "people"} will be notified`}
            </span>
          </div>
        </form>
      )}

      {selected === "facetime" && (
        <p className="mt-4 text-sm text-ocean/70">
          FaceTime opened — add your collaborators from the app. (FaceTime
          doesn&rsquo;t expose a shareable URL.)
        </p>
      )}

      {result && (
        <p
          className={[
            "mt-4 rounded-md px-3 py-2 text-sm",
            result.kind === "success" ? "bg-lagoon/10 text-ocean" : "bg-coral/10 text-coral",
          ].join(" ")}
        >
          {result.text}
        </p>
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
