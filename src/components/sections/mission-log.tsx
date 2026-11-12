"use client";

import { ChevronDown } from "lucide-react";
import { useRef } from "react";

import { BulletList } from "@/components/ui/bullet-list";
import { TagList } from "@/components/ui/tag-list";

export type MissionLogEntry = {
  id: string;
  role: string;
  company: string;
  period: string;
  location?: string;
  /** Length of the role in months, for the timeline. */
  months: number;
  /** "1 yr 3 mos", or undefined for a role still running. */
  duration?: string;
  current: boolean;
  summary?: string;
  highlights: readonly string[];
  technologies: readonly string[];
};

type MissionLogProps = {
  /** Most recent first. */
  entries: readonly MissionLogEntry[];
};

/**
 * Work history as a mission log: a timeline strip sized by how long each
 * role lasted, and one expandable record per role. Records are native
 * <details>, so they work without JavaScript and open for find-in-page;
 * the strip adds a jump-and-open shortcut.
 */
export function MissionLog({ entries }: MissionLogProps) {
  const records = useRef(new Map<string, HTMLDetailsElement>());
  // The strip reads left to right in time, oldest first.
  const chronological = [...entries].reverse();

  function open(id: string) {
    const record = records.current.get(id);
    if (!record) return;
    record.open = true;
    record.scrollIntoView({ block: "center" });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="hud-label">Timeline {"//"} select an entry</p>
        <ol className="flex h-12 gap-1">
          {chronological.map((entry) => (
            <li key={entry.id} style={{ flexGrow: entry.months }} className="min-w-9 basis-0">
              <button
                type="button"
                onClick={() => open(entry.id)}
                title={`${entry.role}, ${entry.company} (${entry.period})`}
                className={`group flex h-full w-full flex-col justify-between border px-2 py-1 text-left transition-[background-color,border-color,box-shadow] hover:border-hot hover:shadow-[0_0_20px_var(--hot-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  entry.current ? "border-accent bg-accent/15" : "border-border bg-surface"
                }`}
              >
                <span className="truncate font-mono text-[0.65rem] tracking-wider text-muted uppercase group-hover:text-hot">
                  {entry.company}
                </span>
                <span
                  aria-hidden="true"
                  className={`h-0.5 w-full ${entry.current ? "bg-accent shadow-[0_0_8px_var(--accent-glow)]" : "bg-border group-hover:bg-hot"}`}
                />
                <span className="sr-only">
                  {entry.role}, {entry.period}. Open this entry.
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <details
            key={entry.id}
            ref={(element) => {
              if (element) records.current.set(entry.id, element);
              else records.current.delete(entry.id);
            }}
            open={index === 0}
            className="reveal hud-frame hud-frame-interactive group scroll-mt-24"
          >
            <summary className="flex cursor-pointer list-none items-start gap-4 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-5 [&::-webkit-details-marker]:hidden">
              <span className="font-mono text-xs text-hot">{String(entries.length - index).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="hud-label flex flex-wrap gap-x-3">
                  <span>{entry.period}</span>
                  {entry.duration ? <span>{entry.duration}</span> : null}
                  {entry.location ? <span>{entry.location}</span> : null}
                  {entry.current ? <span className="text-accent">Active</span> : null}
                </span>
                <span className="block text-lg font-semibold tracking-tight">{entry.role}</span>
                <span className="block font-mono text-sm text-accent">{entry.company}</span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 text-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="space-y-4 border-t border-border p-4 sm:p-5">
              {entry.summary ? <p>{entry.summary}</p> : null}
              <BulletList items={entry.highlights} />
              <TagList items={entry.technologies} label="Technologies" />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
