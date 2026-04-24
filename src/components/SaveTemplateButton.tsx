"use client";

import { useState } from "react";
import { saveProjectAsTemplate } from "@/app/templates/actions";

export default function SaveTemplateButton({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const save = async () => {
    if (busy) return;
    const title =
      window.prompt("Template title:", `${projectTitle} template`) ?? "";
    if (!title.trim()) return;
    const makePublic = window.confirm(
      "Share this template with the Fab Collab community?",
    );
    setBusy(true);
    const r = await saveProjectAsTemplate({
      projectId,
      title: title.trim(),
      makePublic,
    });
    setBusy(false);
    if ("error" in r) {
      setToast(r.error);
    } else {
      setToast(
        makePublic
          ? "Template saved and shared!"
          : "Template saved to your library.",
      );
    }
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        title="Save as template"
        className="rounded-full border border-ocean/15 bg-white px-3 py-1.5 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        📑<span className="hidden sm:ml-1 sm:inline">Save as template</span>
      </button>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ocean px-5 py-2 font-display text-sm font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}
