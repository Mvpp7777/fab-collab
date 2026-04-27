"use client";

import { useEffect, useRef, useState } from "react";
import {
  markProjectComplete,
  setProjectLicense,
  setProjectPublic,
} from "@/app/projects/[id]/actions";
import { generateCertificatePdf } from "@/lib/certificate";
import { LICENSES, type LicenseId } from "@/lib/licenses";

export type CompletionContributor = {
  name: string;
  color: string;
};

type Props = {
  projectId: string;
  projectTitle: string;
  contributors: CompletionContributor[];
  alreadyComplete: boolean;
  initialCompletedAt: string | null;
  initialIsPublic: boolean;
  initialLicense?: LicenseId;
  onClose: () => void;
  onComplete?: (completedAt: string, isPublic: boolean) => void;
};

export default function CompletionModal({
  projectId,
  projectTitle,
  contributors,
  alreadyComplete,
  initialCompletedAt,
  initialIsPublic,
  initialLicense,
  onClose,
  onComplete,
}: Props) {
  const [makePublic, setMakePublic] = useState(initialIsPublic);
  const [license, setLicense] = useState<LicenseId>(
    initialLicense ?? "all-rights-reserved",
  );
  const [busy, setBusy] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(
    initialCompletedAt,
  );
  const [completed, setCompleted] = useState(alreadyComplete);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<null | "txt" | "pdf" | "docx">(
    null,
  );

  const firedConfetti = useRef(false);

  useEffect(() => {
    if (!completed || firedConfetti.current) return;
    firedConfetti.current = true;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("canvas-confetti");
        const confetti = mod.default;
        const colors = ["#0BBFBF", "#FF6B47", "#FFB347", "#7F77DD", "#1D9E75"];
        const burst = () => {
          if (cancelled) return;
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors,
          });
        };
        burst();
        setTimeout(burst, 300);
        setTimeout(burst, 700);
      } catch {
        // no-op if import fails
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [completed]);

  const handleComplete = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await markProjectComplete({
      projectId,
      makePublic,
      license,
    });
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setCompletedAt(result.completedAt);
    setIsPublic(result.isPublic);
    setCompleted(true);
    onComplete?.(result.completedAt, result.isPublic);
  };

  const handleLicenseChange = async (next: LicenseId) => {
    setLicense(next);
    if (!completed) return; // only persist after marking complete
    const r = await setProjectLicense({ projectId, license: next });
    if ("error" in r) setError(r.error);
  };

  const handleTogglePublic = async (next: boolean) => {
    setMakePublic(next);
    if (!completed) return; // only affect DB after completion
    const prev = isPublic;
    setIsPublic(next);
    const result = await setProjectPublic({ projectId, isPublic: next });
    if ("error" in result) {
      setIsPublic(prev);
      setError(result.error);
    }
  };

  const handleShareText = async () => {
    const names = contributors.map((c) => c.name);
    const nameClause =
      names.length === 0
        ? "we"
        : names.length === 1
          ? names[0]
          : names.length === 2
            ? `${names[0]} and ${names[1]}`
            : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
    const text =
      `We just finished ${projectTitle} on Collab It! ${nameClause} wrote it together. Try it at collabit.vercel.app`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy:", text);
    }
  };

  const safeFilename = (projectTitle || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "project";

  const downloadText = () => {
    setExporting("txt");
    const lines: string[] = [
      projectTitle || "Untitled",
      "=".repeat(Math.max(10, (projectTitle || "Untitled").length)),
      "",
      `Contributors: ${contributors.map((c) => c.name).join(", ")}`,
      completedAt ? `Completed: ${new Date(completedAt).toDateString()}` : "",
      "",
      "Download the full project from the editor's Export menu.",
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExporting(null);
  };

  const downloadCertificate = async () => {
    setExporting("pdf");
    try {
      const blob = await generateCertificatePdf({
        projectTitle,
        contributors: contributors.map((c) => ({ name: c.name, color: c.color })),
        completedAtIso: completedAt,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFilename}-certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ocean/40 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ocean/60 hover:bg-ocean/10 hover:text-ocean"
        >
          ✕
        </button>

        {completed ? (
          <>
            <div className="text-center">
              <div className="text-5xl" aria-hidden>
                🎉
              </div>
              <h1
                className="mt-4 font-display text-3xl font-extrabold"
                style={{ color: "#0BBFBF" }}
              >
                {projectTitle}
              </h1>
              <p className="mt-1 text-sm text-ocean/70">
                Completed{" "}
                {completedAt
                  ? new Date(completedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "just now"}
              </p>
            </div>

            <div className="mt-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
                Contributors
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {contributors.map((c, i) => (
                  <li
                    key={i}
                    style={{ backgroundColor: c.color, color: "white" }}
                    className="rounded-full px-3 py-1 text-sm font-semibold"
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleShareText}
                style={{ backgroundColor: "#FF6B47", color: "white" }}
                className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
              >
                {copied ? "Copied!" : "Share your achievement"}
              </button>
              <button
                type="button"
                onClick={downloadCertificate}
                disabled={exporting !== null}
                className="rounded-full border-2 border-lagoon bg-white px-5 py-2 font-display text-sm font-semibold text-lagoon transition hover:bg-lagoon hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === "pdf" ? "Generating…" : "🏆 Download Certificate"}
              </button>
              <button
                type="button"
                onClick={downloadText}
                disabled={exporting !== null}
                className="rounded-full border border-ocean/15 bg-white px-5 py-2 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === "txt" ? "Downloading…" : "Download"}
              </button>
            </div>

            <PublicToggle
              checked={isPublic}
              onChange={handleTogglePublic}
              disabled={busy}
            />
            <p className="mt-2 text-xs text-ocean/70">
              Making your project public adds it to the discovery gallery that industry professionals will browse when our Scout portal launches Summer 2026.
            </p>
            {isPublic && (
              <LicensePicker
                value={license}
                onChange={handleLicenseChange}
                disabled={busy}
              />
            )}
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="text-5xl" aria-hidden>
                🏁
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold text-ocean">
                Mark &ldquo;{projectTitle}&rdquo; as complete?
              </h1>
              <p className="mt-2 text-sm text-ocean/70">
                You&rsquo;ll see contributors, share text, and a download link.
                You can still edit the project after marking it complete.
              </p>
            </div>

            <PublicToggle
              checked={makePublic}
              onChange={setMakePublic}
              disabled={busy}
            />
            <p className="mt-2 text-xs text-ocean/70">
              Making your project public adds it to the discovery gallery that industry professionals will browse when our Scout portal launches Summer 2026.
            </p>
            {makePublic && (
              <LicensePicker
                value={license}
                onChange={(v) => setLicense(v)}
                disabled={busy}
              />
            )}

            {error && (
              <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-ocean/15 px-5 py-2 font-display text-sm font-medium text-ocean/70 transition hover:text-ocean"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={busy}
                style={{ backgroundColor: "#FF6B47", color: "white" }}
                className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Marking…" : "Mark as complete"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PublicToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 rounded-xl border border-ocean/10 bg-foam/60 p-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 flex-none accent-[#0BBFBF]"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ocean">
            Share on public gallery? (optional)
          </span>
          <span className="mt-1 block text-xs text-ocean/70">
            Your project will appear on the Collab It discover page.
            Contributors names will be shown. No content is visible without
            your permission.
          </span>
        </span>
      </label>
    </div>
  );
}

function LicensePicker({
  value,
  onChange,
  disabled,
}: {
  value: LicenseId;
  onChange: (v: LicenseId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 rounded-xl border border-ocean/10 bg-white p-4">
      <div className="text-sm font-semibold text-ocean">
        Choose a license for your public project:
      </div>
      <ul className="mt-3 space-y-2">
        {LICENSES.map((l) => (
          <li key={l.id}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="license"
                value={l.id}
                checked={value === l.id}
                onChange={() => onChange(l.id)}
                disabled={disabled}
                className="mt-0.5 h-4 w-4 flex-none accent-[#0BBFBF]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ocean">
                  {l.badge}
                </span>
                <span className="mt-0.5 block text-xs text-ocean/70">
                  {l.description}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
