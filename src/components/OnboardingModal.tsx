"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "fabcollab_onboarding_dismissed_v1";

export default function OnboardingModal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${STORAGE_KEY}:${userId}`;
    if (!window.localStorage.getItem(key)) {
      setOpen(true);
    }
  }, [userId]);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`${STORAGE_KEY}:${userId}`, "1");
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ocean/40 px-4"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ocean/60 hover:bg-ocean/10 hover:text-ocean"
        >
          ✕
        </button>

        <h2 className="font-display text-2xl font-extrabold text-ocean sm:text-3xl">
          Welcome to Fab Collab! 👋
        </h2>
        <p className="mt-2 text-sm text-ocean/70">
          Here&rsquo;s how to get started in 3 steps
        </p>

        <ol className="mt-6 space-y-4">
          <Step
            index={1}
            title="Create a project"
            body="Pick your type and give it a title."
            action={
              <Link
                href="/projects/new"
                onClick={dismiss}
                style={{ backgroundColor: "#FF6B47", color: "white" }}
                className="mt-2 inline-block rounded-full px-4 py-1.5 font-display text-xs font-semibold shadow transition hover:brightness-110 active:scale-95"
              >
                Create your first project →
              </Link>
            }
          />
          <Step
            index={2}
            title="Invite a collaborator"
            body="Add someone to write with you."
          />
          <Step
            index={3}
            title="Start writing"
            body="Take turns, use AI assist, and create something legendary."
          />
        </ol>

        <div className="mt-8 flex items-center justify-end">
          <button
            type="button"
            onClick={dismiss}
            style={{ backgroundColor: "#0BBFBF", color: "white" }}
            className="rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  index,
  title,
  body,
  action,
}: {
  index: number;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <div
        style={{ backgroundColor: "#0BBFBF", color: "white" }}
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full font-display text-sm font-bold"
      >
        {index}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base font-bold text-ocean">
          {title}
        </div>
        <div className="mt-0.5 text-sm text-ocean/70">{body}</div>
        {action}
      </div>
    </li>
  );
}
