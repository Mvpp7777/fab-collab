"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markAllNotificationsRead } from "@/lib/notifications/actions";

export default function MarkAllButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        await markAllNotificationsRead();
        setBusy(false);
        router.refresh();
      }}
      className="rounded-full border border-ocean/15 bg-white px-4 py-1.5 text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "Marking…" : "Mark all as read"}
    </button>
  );
}
