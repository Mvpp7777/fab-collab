"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROJECT_TYPES, type ProjectTypeId } from "@/lib/projectTypes";

export type DashboardProjectRow = {
  id: string;
  title: string;
  project_type: ProjectTypeId;
  updated_at: string;
  status: string;
  collaborator_count: number;
};

type Sort = "recent" | "oldest" | "alpha" | "collaborators";
type TypeFilter = "all" | ProjectTypeId;
type StatusFilter = "all" | "active" | "completed";

export default function ProjectsBrowser({
  projects,
}: {
  projects: DashboardProjectRow[];
}) {
  const [sort, setSort] = useState<Sort>("recent");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const typesInUse = useMemo(() => {
    const seen = new Set<ProjectTypeId>();
    for (const p of projects) seen.add(p.project_type);
    return PROJECT_TYPES.filter((t) => seen.has(t.id));
  }, [projects]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = projects.filter((p) => {
      if (typeFilter !== "all" && p.project_type !== typeFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !p.title.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "recent":
          return +new Date(b.updated_at) - +new Date(a.updated_at);
        case "oldest":
          return +new Date(a.updated_at) - +new Date(b.updated_at);
        case "alpha":
          return a.title.localeCompare(b.title);
        case "collaborators":
          return b.collaborator_count - a.collaborator_count;
      }
    });
    return sorted;
  }, [projects, sort, typeFilter, statusFilter, search]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your projects…"
          className="flex-1 min-w-[180px] rounded-full border border-ocean/15 bg-white px-3 py-1.5 text-sm text-ocean focus:border-lagoon focus:outline-none"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-full border border-ocean/15 bg-white px-3 py-1.5 text-sm text-ocean focus:border-lagoon focus:outline-none"
          aria-label="Sort projects"
        >
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest</option>
          <option value="alpha">Alphabetical</option>
          <option value="collaborators">Most collaborators</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-full border border-ocean/15 bg-white px-3 py-1.5 text-sm text-ocean focus:border-lagoon focus:outline-none"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>

        {typesInUse.length > 1 && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="rounded-full border border-ocean/15 bg-white px-3 py-1.5 text-sm text-ocean focus:border-lagoon focus:outline-none"
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            {typesInUse.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        )}

        <span className="ml-auto text-xs text-ocean/50">
          {visible.length} of {projects.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ocean/20 bg-white/60 px-6 py-12 text-center text-sm text-ocean/60">
          No projects match those filters.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const meta = PROJECT_TYPES.find((t) => t.id === p.project_type);
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ocean/60">
                  <span aria-hidden>{meta?.emoji ?? "✨"}</span>
                  <span>{meta?.label ?? p.project_type}</span>
                  {p.status === "completed" && (
                    <span className="ml-auto rounded-full bg-lagoon/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-lagoon">
                      Completed
                    </span>
                  )}
                </div>
                <div className="mt-3 font-display text-xl font-bold text-ocean">
                  {p.title}
                </div>
                {p.collaborator_count > 1 && (
                  <div className="mt-2 text-xs text-ocean/50">
                    {p.collaborator_count} collaborators
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
