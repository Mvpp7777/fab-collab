"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createProject, type CreateProjectResult } from "./actions";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";

export default function NewProjectPage() {
  const [state, formAction] = useFormState<
    CreateProjectResult | null,
    FormData
  >(createProject, null);

  const [selectedType, setSelectedType] = useState<ProjectTypeId | "">("");
  const [collabMode, setCollabMode] = useState<"relay" | "live">("relay");

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Fab Collab home">
            <span
              className="font-display text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-syne), sans-serif" }}
            >
              <span style={{ color: "#1A2E2E" }}>fab</span>
              <span style={{ color: "#0BBFBF" }}>collab</span>
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-ocean/70 hover:text-ocean"
          >
            Cancel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1
          className="font-display text-4xl font-extrabold leading-normal tracking-tight text-ocean sm:text-5xl"
          style={{ paddingBottom: "40px", marginBottom: "40px" }}
        >
          What are you creating?
        </h1>
        <p className="mt-6 font-display text-lg text-ocean/70">
          Pick a format to get started. You can customize sections later.
        </p>

        <form action={formAction} className="mt-10 space-y-10">
          <input type="hidden" name="project_type" value={selectedType} />
          <input type="hidden" name="collab_mode" value={collabMode} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECT_TYPES.map((t) => {
              const active = selectedType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedType(t.id)}
                  aria-pressed={active}
                  className={[
                    "rounded-2xl bg-white p-5 text-left shadow-sm transition",
                    "border-2",
                    active
                      ? "border-lagoon ring-2 ring-lagoon/30"
                      : "border-transparent hover:border-ocean/15",
                  ].join(" ")}
                >
                  <div className="text-3xl" aria-hidden>
                    {t.emoji}
                  </div>
                  <div className="mt-3 font-display text-lg font-bold text-ocean">
                    {t.label}
                  </div>
                  <div className="mt-1 text-sm text-ocean/70">
                    {t.description}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ocean">
                Project title
              </span>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Midnight Summer"
                className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
              />
            </label>

            <div>
              <span className="mb-1 block text-sm font-medium text-ocean">
                Collaboration mode
              </span>
              <div className="inline-flex rounded-full border border-ocean/15 bg-white p-1">
                {(["relay", "live"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCollabMode(mode)}
                    aria-pressed={collabMode === mode}
                    className={[
                      "rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition",
                      collabMode === mode
                        ? "bg-lagoon text-white shadow"
                        : "text-ocean/70 hover:text-ocean",
                    ].join(" ")}
                  >
                    {mode} mode
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ocean/60">
                {collabMode === "relay"
                  ? "Take turns writing, one person at a time."
                  : "Write together in real time."}
              </p>
            </div>
          </div>

          {state && "error" in state && (
            <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <SubmitButton disabled={!selectedType} />
            {!selectedType && (
              <span className="text-sm text-ocean/60">Pick a format to continue.</span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-full bg-coral px-6 py-3 font-display text-base font-semibold text-white shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating..." : "Create project"}
    </button>
  );
}
