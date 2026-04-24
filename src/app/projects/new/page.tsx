"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createProject, type CreateProjectResult } from "./actions";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { GENRE_OPTIONS, POPULAR_TYPES } from "@/lib/genres";

export default function NewProjectPage() {
  const [state, formAction] = useFormState<
    CreateProjectResult | null,
    FormData
  >(createProject, null);

  const [selectedType, setSelectedType] = useState<ProjectTypeId | "">("");
  const [collabMode, setCollabMode] = useState<"relay" | "live">("relay");
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState("");
  const query = search.trim().toLowerCase();
  const filteredTypes = PROJECT_TYPES.filter((t) => {
    if (!query) return true;
    return (
      t.label.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query)
    );
  });
  const genres = selectedType ? (GENRE_OPTIONS as Record<string, string[] | undefined>)[selectedType] : undefined;

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
          style={{ paddingBottom: "16px" }}
        >
          What are you working on?
        </h1>
        <p className="mt-2 font-display text-lg text-ocean/70">
          Pick a format to get started. You can customize sections later.
        </p>

        <form action={formAction} className="mt-10 space-y-10">
          <input type="hidden" name="project_type" value={selectedType} />
          <input type="hidden" name="collab_mode" value={collabMode} />

          <div>
            <label className="block">
              <span className="sr-only">Search project types</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search project types — e.g. song, business…"
                className="w-full rounded-full border border-ocean/15 bg-white px-4 py-2 text-sm text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
              />
            </label>
          </div>

          {(["creative", "professional", "think_tank"] as const).map((category) => {
            const typesInCategory = filteredTypes.filter(
              (t) => t.category === category,
            );
            if (typesInCategory.length === 0) return null;
            const heading =
              category === "creative"
                ? "Creative projects"
                : category === "professional"
                  ? "Work & professional projects"
                  : "Think Tank & Innovation";
            return (
              <section key={category} className="space-y-4">
                <h2 className="font-display text-xl font-bold text-ocean">
                  {heading}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {typesInCategory.map((t) => {
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-3xl" aria-hidden>
                            {t.emoji}
                          </div>
                          {POPULAR_TYPES.includes(t.id) && (
                            <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-coral">
                              Popular
                            </span>
                          )}
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
              </section>
            );
          })}

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

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center justify-between text-sm font-medium text-ocean">
                <span>Description (optional)</span>
                <span className="text-xs text-ocean/50">{description.length}/280</span>
              </span>
              <textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 280))}
                rows={3}
                maxLength={280}
                placeholder="One or two sentences about this project."
                className="w-full resize-y rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
              />
            </label>
            {genres && genres.length > 0 && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ocean">
                  Genre
                </span>
                <select
                  name="genre"
                  defaultValue=""
                  className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean focus:border-lagoon focus:outline-none"
                >
                  <option value="">Pick a genre</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
