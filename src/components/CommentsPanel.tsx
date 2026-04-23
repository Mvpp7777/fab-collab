"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addComment,
  getComments,
  setCommentResolved,
  type CommentRow,
} from "@/app/projects/[id]/actions";
import { FALLBACK_COLOR } from "@/lib/colors";

export type PanelCollaborator = {
  user_id: string;
  name: string;
  color: string;
};

type Props = {
  sectionId: string;
  sectionTitle: string;
  isOwner: boolean;
  currentUserId: string;
  collaborators: PanelCollaborator[];
  onClose: () => void;
  onCountChange?: (newCount: number) => void;
};

export default function CommentsPanel({
  sectionId,
  sectionTitle,
  isOwner,
  currentUserId,
  collaborators,
  onClose,
  onCountChange,
}: Props) {
  const [items, setItems] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getComments({ sectionId });
    setLoading(false);
    if ("ok" in r) {
      setItems(r.items);
      onCountChange?.(r.items.length);
    }
  }, [sectionId, onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    setErr(null);
    const r = await addComment({
      sectionId,
      body,
      parentId: replyTo,
    });
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    setItems((list) => {
      const next = [...list, r.comment];
      onCountChange?.(next.length);
      return next;
    });
    setBody("");
    setReplyTo(null);
  };

  const handleResolve = async (id: string, resolved: boolean) => {
    const prev = items;
    setItems((list) =>
      list.map((c) =>
        c.id === id ? { ...c, resolved, resolved_by: resolved ? currentUserId : null } : c,
      ),
    );
    const r = await setCommentResolved({ commentId: id, resolved });
    if ("error" in r) setItems(prev);
  };

  const byAuthor = (userId: string | null) =>
    collaborators.find((c) => c.user_id === userId);

  const rootComments = items.filter((c) => !c.parent_id);
  const repliesByParent: Record<string, CommentRow[]> = {};
  for (const c of items) {
    if (c.parent_id) {
      repliesByParent[c.parent_id] = [...(repliesByParent[c.parent_id] ?? []), c];
    }
  }

  const visibleRoots = showResolved
    ? rootComments
    : rootComments.filter((c) => !c.resolved);
  const resolvedCount = rootComments.filter((c) => c.resolved).length;

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
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
              Comments
            </div>
            <div className="truncate font-display text-base font-semibold text-ocean">
              {sectionTitle}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ocean/60 hover:bg-ocean/10 hover:text-ocean"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-center text-sm text-ocean/60">Loading…</p>
          ) : visibleRoots.length === 0 ? (
            <p className="text-center text-sm text-ocean/60">
              {rootComments.length > 0
                ? "All comments are resolved. Toggle below to show them."
                : "No comments yet. Start the thread."}
            </p>
          ) : (
            <ul className="space-y-5">
              {visibleRoots.map((c) => {
                const author = byAuthor(c.user_id);
                const replies = repliesByParent[c.id] ?? [];
                return (
                  <li key={c.id} className={c.resolved ? "opacity-60" : ""}>
                    <CommentItem
                      comment={c}
                      author={author}
                      isOwner={isOwner}
                      onResolve={handleResolve}
                      onReply={() => setReplyTo(c.id)}
                    />
                    {replies.length > 0 && (
                      <ul className="mt-2 space-y-2 border-l-2 border-ocean/10 pl-3">
                        {replies.map((r) => {
                          const a = byAuthor(r.user_id);
                          return (
                            <li key={r.id}>
                              <CommentItem
                                comment={r}
                                author={a}
                                isOwner={isOwner}
                                isReply
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {resolvedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowResolved((v) => !v)}
              className="mt-6 text-xs font-medium text-lagoon hover:underline"
            >
              {showResolved
                ? `Hide resolved (${resolvedCount})`
                : `Show resolved (${resolvedCount})`}
            </button>
          )}
        </div>

        <form
          onSubmit={submit}
          className="border-t border-ocean/10 bg-foam/50 p-4"
        >
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-md bg-lagoon/10 px-3 py-1.5 text-xs text-ocean">
              Replying to a comment
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="ml-2 text-lagoon hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Write a comment…"
            className="w-full resize-y rounded-lg border border-ocean/15 bg-white px-3 py-2 text-sm text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
          />
          {err && (
            <p className="mt-2 rounded-md bg-coral/10 px-3 py-1 text-xs text-coral">
              {err}
            </p>
          )}
          <div className="mt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={busy || !body.trim()}
              style={{ backgroundColor: "#FF6B47", color: "white" }}
              className="rounded-full px-4 py-1.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Posting…" : "Add comment"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function CommentItem({
  comment,
  author,
  isOwner,
  isReply,
  onResolve,
  onReply,
}: {
  comment: CommentRow;
  author: PanelCollaborator | undefined;
  isOwner: boolean;
  isReply?: boolean;
  onResolve?: (id: string, resolved: boolean) => void;
  onReply?: () => void;
}) {
  const color = author?.color ?? FALLBACK_COLOR;
  const name = author?.name ?? "Someone";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex gap-3">
      <div
        style={{ backgroundColor: color }}
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full font-display text-xs font-bold text-white"
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold" style={{ color }}>
            {name}
          </span>
          <span className="text-ocean/50">{relativeTime(comment.created_at)}</span>
          {comment.resolved && (
            <span className="rounded-full bg-lagoon/15 px-2 py-0.5 text-[10px] font-semibold text-lagoon">
              Resolved
            </span>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-ocean">
          {comment.body}
        </p>
        {!isReply && (
          <div className="mt-1 flex items-center gap-3 text-xs">
            {onReply && (
              <button
                type="button"
                onClick={onReply}
                className="font-medium text-ocean/60 hover:text-ocean"
              >
                Reply
              </button>
            )}
            {isOwner && onResolve && (
              <button
                type="button"
                onClick={() => onResolve(comment.id, !comment.resolved)}
                className="font-medium text-lagoon hover:underline"
              >
                {comment.resolved ? "Reopen" : "✓ Mark resolved"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
