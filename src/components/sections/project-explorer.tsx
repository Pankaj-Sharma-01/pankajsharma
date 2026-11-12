"use client";

import { useMemo, useState } from "react";

import { BulletList } from "@/components/ui/bullet-list";
import { ExternalLink } from "@/components/ui/external-link";
import { TagList } from "@/components/ui/tag-list";
import type { Project, ProjectCategory } from "@/types/content";

type ProjectExplorerProps = {
  projects: readonly Project[];
};

type CategoryFilter = ProjectCategory | "all";

const CATEGORIES: readonly { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All builds" },
  { id: "production", label: "In production" },
  { id: "personal", label: "Personal & college" },
];

const filterButton =
  "border px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="hud-frame hud-frame-interactive flex flex-col gap-4 p-5">
      <header className="space-y-1">
        <p className="hud-label flex flex-wrap gap-x-3">
          <span className={project.category === "production" ? "text-accent" : "text-sun"}>
            {project.category === "production" ? "Production" : "Personal"}
          </span>
          {project.organization ? <span>{project.organization}</span> : null}
        </p>
        <h2 className="text-lg font-semibold tracking-tight">
          {project.url ? <ExternalLink href={project.url}>{project.name}</ExternalLink> : project.name}
        </h2>
        {project.metric ? (
          <p className="flex flex-wrap items-baseline gap-x-2 pt-1">
            <span className="text-sunrise font-mono text-2xl font-bold">{project.metric.value}</span>
            <span className="hud-label">{project.metric.label}</span>
          </p>
        ) : null}
      </header>
      <p className="text-muted">{project.summary}</p>
      <BulletList items={project.details ?? []} />
      <div className="mt-auto">
        <TagList items={project.technologies ?? []} label="Technologies" />
      </div>
    </article>
  );
}

/** The project archive with filters: by kind of work, and by technology. */
export function ProjectExplorer({ projects }: ProjectExplorerProps) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [technology, setTechnology] = useState<string | null>(null);

  // Technologies used by more than one project make useful filters.
  const technologies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects) {
      for (const name of project.technologies ?? []) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
  }, [projects]);

  const visible = projects.filter(
    (project) =>
      (category === "all" || project.category === category) &&
      (technology === null || project.technologies?.includes(technology)),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div role="group" aria-label="Filter by kind" className="flex flex-wrap gap-2">
          {CATEGORIES.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={category === option.id}
              onClick={() => setCategory(option.id)}
              className={`${filterButton} ${
                category === option.id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-surface text-muted hover:border-accent/60 hover:text-accent"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {technologies.length > 0 ? (
          <div role="group" aria-label="Filter by technology" className="flex flex-wrap items-center gap-2">
            <span className="hud-label">Tech</span>
            {technologies.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={technology === name}
                onClick={() => setTechnology(technology === name ? null : name)}
                className={`${filterButton} normal-case ${
                  technology === name
                    ? "border-hot bg-hot/15 text-hot"
                    : "border-border bg-surface text-muted hover:border-hot/60 hover:text-hot"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
        <p role="status" className="font-mono text-xs tracking-wider text-muted">
          <span aria-hidden="true" className="text-hot">
            &gt;{" "}
          </span>
          {visible.length} of {projects.length} builds shown
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="border border-dashed border-border bg-surface px-4 py-3 font-mono text-xs tracking-wider text-muted uppercase">
          No builds match those filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
