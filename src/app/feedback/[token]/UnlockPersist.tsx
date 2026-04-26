"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * On mount:
 *  - If we just unlocked (server passes `justUnlockedToken`), persist it to
 *    localStorage so future visits stay unlocked.
 *  - Otherwise, if a token exists in localStorage but isn't in the URL yet,
 *    replace the URL to include `?unlock_token=X` so the server can verify
 *    and render the full content.
 */
export default function UnlockPersist({
  projectId,
  alreadyUnlockedViaUrl,
  justUnlockedToken,
}: {
  projectId: string;
  alreadyUnlockedViaUrl: boolean;
  justUnlockedToken: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const storageKey = `fc_unlock:${projectId}`;
    if (justUnlockedToken) {
      try {
        localStorage.setItem(storageKey, justUnlockedToken);
      } catch {
        /* ignore */
      }
      return;
    }
    if (alreadyUnlockedViaUrl) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(storageKey);
    } catch {
      stored = null;
    }
    if (!stored) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("unlock_token")) return;
    url.searchParams.set("unlock_token", stored);
    router.replace(`${url.pathname}${url.search}`);
  }, [projectId, alreadyUnlockedViaUrl, justUnlockedToken, router]);

  return null;
}
