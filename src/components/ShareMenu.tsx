"use client";

import { useEffect, useRef, useState } from "react";
import { ensureFeedbackToken } from "@/app/projects/[id]/actions";
import {
  buildSharePost,
  buildSharePostForX,
} from "@/lib/shareTeaser";
import type { ProjectTypeId } from "@/lib/projectTypes";

type Props = {
  projectId: string;
  projectTitle: string;
  projectType: ProjectTypeId;
  collaboratorNames: string[];
  firstSectionContent: string;
};

type Platform = {
  id: "copy" | "twitter" | "facebook" | "linkedin" | "instagram" | "whatsapp" | "email";
  label: string;
  emoji: string;
};

const PLATFORMS: Platform[] = [
  { id: "copy",      label: "Copy feedback link",     emoji: "📋" },
  { id: "twitter",   label: "Share on X (Twitter)",   emoji: "🐦" },
  { id: "facebook",  label: "Share on Facebook",      emoji: "📘" },
  { id: "linkedin",  label: "Share on LinkedIn",      emoji: "💼" },
  { id: "instagram", label: "Share on Instagram",     emoji: "📸" },
  { id: "whatsapp",  label: "Share via WhatsApp",     emoji: "💬" },
  { id: "email",     label: "Share via Email",        emoji: "📧" },
];

export default function ShareMenu({
  projectId,
  projectTitle,
  projectType,
  collaboratorNames,
  firstSectionContent,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handlePick = async (id: Platform["id"]) => {
    if (busy) return;
    setOpen(false);
    setBusy(true);
    const r = await ensureFeedbackToken({ projectId });
    setBusy(false);
    if ("error" in r) {
      flash(r.error);
      return;
    }
    const feedbackUrl = r.url;

    const baseParams = {
      projectType,
      projectTitle,
      collaboratorNames,
      firstSectionContent,
      feedbackUrl,
    };

    switch (id) {
      case "copy": {
        try {
          await navigator.clipboard.writeText(feedbackUrl);
        } catch {
          window.prompt("Copy this link:", feedbackUrl);
        }
        flash("Link copied!");
        return;
      }
      case "twitter": {
        const text = buildSharePostForX(baseParams);
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener",
        );
        return;
      }
      case "facebook": {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(feedbackUrl)}`,
          "_blank",
          "noopener",
        );
        return;
      }
      case "linkedin": {
        // LinkedIn's sharing intent ignores pre-filled text; we still open the
        // share dialog and copy the post text so the user can paste it.
        const text = buildSharePost(baseParams);
        try {
          await navigator.clipboard.writeText(text);
          flash("Post copied — paste it into LinkedIn");
        } catch {
          /* non-fatal */
        }
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(feedbackUrl)}`,
          "_blank",
          "noopener",
        );
        return;
      }
      case "instagram": {
        const text = buildSharePost(baseParams);
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          window.prompt("Copy this caption:", text);
        }
        flash(
          "Caption copied! Paste it in Instagram and add the link in your bio",
        );
        return;
      }
      case "whatsapp": {
        const text = buildSharePost(baseParams);
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener",
        );
        return;
      }
      case "email": {
        const text = buildSharePost(baseParams);
        const subject = "Check out what we're creating on Collab It";
        window.location.href = `mailto:?subject=${encodeURIComponent(
          subject,
        )}&body=${encodeURIComponent(text)}`;
        return;
      }
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={open}
          className="rounded-full border border-ocean/15 bg-white px-3 py-1.5 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="hidden sm:inline">{busy ? "Generating…" : "Share"}</span>
          <span className="sm:ml-1">↗</span>
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-ocean/10 bg-white py-1 shadow-lg"
          >
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                role="menuitem"
                type="button"
                onClick={() => handlePick(p.id)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium text-ocean transition hover:bg-foam"
              >
                <span aria-hidden>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 max-w-sm -translate-x-1/2 rounded-full bg-ocean px-5 py-2 font-display text-sm font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}
