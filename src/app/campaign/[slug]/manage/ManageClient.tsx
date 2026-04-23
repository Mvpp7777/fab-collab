"use client";

import { useState } from "react";
import {
  closeCampaign,
  extendDeadline,
  messageParticipants,
  reopenCampaign,
} from "./actions";

type Props = {
  slug: string;
  status: string;
  endDate: string | null;
};

export default function ManageClient({ slug, status, endDate }: Props) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentEnd, setCurrentEnd] = useState(endDate);
  const [newDate, setNewDate] = useState(endDate ? endDate.slice(0, 10) : "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(null), 2000);
  };

  const handleClose = async () => {
    setBusy(true);
    const r = await closeCampaign({ slug });
    setBusy(false);
    if ("error" in r) return flash(r.error);
    setCurrentStatus("closed");
    flash("Campaign closed");
  };

  const handleReopen = async () => {
    setBusy(true);
    const r = await reopenCampaign({ slug });
    setBusy(false);
    if ("error" in r) return flash(r.error);
    setCurrentStatus("open");
    flash("Campaign reopened");
  };

  const handleExtend = async () => {
    if (!newDate) return;
    setBusy(true);
    const r = await extendDeadline({ slug, newEndDate: newDate });
    setBusy(false);
    if ("error" in r) return flash(r.error);
    setCurrentEnd(new Date(newDate).toISOString());
    flash("Deadline updated");
  };

  const handleMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    const r = await messageParticipants({ slug, message });
    setBusy(false);
    if ("error" in r) return flash(r.error);
    setMessage("");
    flash("Message sent to participants");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
          Status
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="font-display text-lg font-bold capitalize text-ocean">
            {currentStatus}
          </div>
          {currentStatus === "closed" ? (
            <button
              type="button"
              onClick={handleReopen}
              disabled={busy}
              className="rounded-full border border-ocean/15 bg-white px-4 py-1.5 text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white disabled:opacity-60"
            >
              Reopen
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
              className="rounded-full border border-coral bg-white px-4 py-1.5 text-sm font-medium text-coral transition hover:bg-coral hover:text-white disabled:opacity-60"
            >
              Close early
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
          Deadline
        </div>
        <div className="mt-1 text-sm text-ocean/80">
          {currentEnd
            ? new Date(currentEnd).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "No deadline"}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-lg border border-ocean/15 bg-white px-3 py-1.5 text-sm text-ocean focus:border-lagoon focus:outline-none"
          />
          <button
            type="button"
            onClick={handleExtend}
            disabled={busy || !newDate}
            style={{ backgroundColor: "#0BBFBF", color: "white" }}
            className="rounded-full px-4 py-1.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Update
          </button>
        </div>
      </div>

      <form
        onSubmit={handleMessage}
        className="rounded-2xl bg-white p-5 shadow-sm"
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-lagoon">
          Message participants
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Share an update or nudge everyone to keep writing…"
          className="mt-2 w-full resize-y rounded-lg border border-ocean/15 bg-white px-3 py-2 text-sm text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
        <div className="mt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={busy || !message.trim()}
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send to all
          </button>
        </div>
      </form>

      {toast && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-ocean px-5 py-2 font-display text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
