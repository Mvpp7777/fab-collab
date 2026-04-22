"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/lib/notifications/actions";

export default function NotificationsBell({
  initialUnread = 0,
}: {
  initialUnread?: number;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const openDropdown = async () => {
    setOpen((v) => !v);
    if (!open) {
      setLoading(true);
      const r = await getNotifications(20);
      setLoading(false);
      if ("ok" in r) {
        setItems(r.items);
        setUnread(r.unread);
      }
    }
  };

  const handleClickItem = async (n: NotificationRow) => {
    if (!n.read) {
      setItems((list) => list.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      setUnread((u) => Math.max(0, u - 1));
      void markNotificationRead({ id: n.id });
    }
    setOpen(false);
  };

  const handleMarkAll = async () => {
    if (unread === 0) return;
    const prev = items;
    setItems((list) => list.map((i) => ({ ...i, read: true })));
    setUnread(0);
    const r = await markAllNotificationsRead();
    if ("error" in r) setItems(prev);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={openDropdown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-ocean/15 bg-white text-ocean transition hover:bg-ocean hover:text-white"
      >
        <span aria-hidden className="text-base">🔔</span>
        {unread > 0 && (
          <span
            aria-hidden
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-ocean/10 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-ocean/10 px-4 py-2">
            <span className="font-display text-sm font-semibold text-ocean">
              Notifications
            </span>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unread === 0}
              className="text-xs font-medium text-lagoon transition hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-ocean/60">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ocean/60">
              You&rsquo;re all caught up.
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-ocean/10 overflow-y-auto">
              {items.map((n) => {
                const inner = (
                  <div className="flex items-start gap-3 px-4 py-3 transition hover:bg-foam/60">
                    <span
                      aria-hidden
                      style={{
                        backgroundColor: n.read
                          ? "rgba(26,46,46,0.15)"
                          : "#0BBFBF",
                      }}
                      className="mt-1.5 h-2 w-2 flex-none rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ocean">
                        {n.body ?? iconForType(n.type) + " " + n.type}
                      </div>
                      <div className="mt-0.5 text-xs text-ocean/50">
                        {formatRelative(n.created_at)}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => handleClickItem(n)}
                        className="block"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleClickItem(n)}
                        className="block w-full text-left"
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function iconForType(type: string): string {
  switch (type) {
    case "turn_passed":
      return "🔄";
    case "call_started":
      return "📹";
    case "invited":
      return "✉️";
    default:
      return "🔔";
  }
}

function formatRelative(iso: string): string {
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
