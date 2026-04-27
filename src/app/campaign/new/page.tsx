"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCampaign, type CreateCampaignResult } from "./actions";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";
import { slugify } from "@/lib/slugify";

const CAP_OPTIONS = [10, 25, 50, 100, 250];

export default function NewCampaignPage() {
  const [state, formAction] = useFormState<CreateCampaignResult | null, FormData>(
    createCampaign,
    null,
  );
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [projectType, setProjectType] = useState<ProjectTypeId>("song");
  const [maxChoice, setMaxChoice] = useState<number | "custom">(50);
  const [customMax, setCustomMax] = useState("");

  const effectiveSlug = slug || slugify(title);

  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" aria-label="Collab It home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
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

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-4xl font-extrabold text-ocean sm:text-5xl">
          Launch a campaign
        </h1>
        <p className="mt-3 font-display text-lg text-ocean/70">
          Open your next project to fans or your community. Scarcity drives urgency.
        </p>

        <form action={formAction} className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ocean">
              Title <span className="text-coral">*</span>
            </span>
            <input
              type="text"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Let's write a summer anthem"
              className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ocean">
              Project type <span className="text-coral">*</span>
            </span>
            <select
              name="project_type"
              required
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as ProjectTypeId)}
              className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean focus:border-lagoon focus:outline-none"
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ocean">Description</span>
            <textarea
              name="description"
              rows={3}
              placeholder="What's this campaign about? Who should join?"
              className="w-full resize-y rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
            />
          </label>

          <div>
            <span className="mb-1 block text-sm font-medium text-ocean">
              Max collaborators <span className="text-coral">*</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {CAP_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxChoice(n)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    maxChoice === n
                      ? "bg-lagoon text-white"
                      : "border border-ocean/15 bg-white text-ocean hover:bg-ocean/5"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMaxChoice("custom")}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  maxChoice === "custom"
                    ? "bg-lagoon text-white"
                    : "border border-ocean/15 bg-white text-ocean hover:bg-ocean/5"
                }`}
              >
                Custom
              </button>
            </div>
            {maxChoice === "custom" && (
              <input
                type="number"
                min={1}
                max={10000}
                value={customMax}
                onChange={(e) => setCustomMax(e.target.value)}
                placeholder="e.g. 500"
                className="mt-2 w-40 rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean focus:border-lagoon focus:outline-none"
              />
            )}
            <input
              type="hidden"
              name="max_collaborators"
              value={maxChoice === "custom" ? customMax : String(maxChoice)}
            />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ocean">Campaign end date</span>
            <input
              type="date"
              name="end_date"
              className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean focus:border-lagoon focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ocean">
              Reward <span className="ml-1 text-ocean/40">(optional)</span>
            </span>
            <input
              type="text"
              name="reward"
              placeholder="Co-writer credit, shoutout, signed copy…"
              className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean focus:border-lagoon focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ocean">
              Slug <span className="ml-1 text-ocean/40">(shareable URL)</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ocean/50">collabit.vercel.app/campaign/</span>
              <input
                type="text"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder={effectiveSlug || "summer-anthem"}
                className="flex-1 rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean focus:border-lagoon focus:outline-none"
              />
            </div>
          </label>

          {state && "error" in state && (
            <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
              {state.error}
            </p>
          )}

          <SubmitButton />
        </form>
      </main>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{ backgroundColor: "#FF6B47", color: "white" }}
      className="w-full rounded-full px-6 py-3 font-display text-base font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Launching…" : "Launch campaign →"}
    </button>
  );
}
