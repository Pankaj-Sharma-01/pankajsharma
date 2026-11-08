import type { ReactNode } from "react";

type TimelineEntryProps = {
  title: string;
  subtitle: string;
  period: string;
  location?: string;
  children?: ReactNode;
};

/** One dated entry on a CV-style page (a role, a degree). */
export function TimelineEntry({ title, subtitle, period, location, children }: TimelineEntryProps) {
  return (
    <article className="relative border-l border-ultra/50 pl-6">
      <span
        aria-hidden="true"
        className="absolute top-1.5 -left-[5px] size-[9px] rotate-45 border border-hot bg-background shadow-[0_0_12px_var(--hot-glow)]"
      />
      <div className="hud-frame hud-frame-interactive space-y-4 p-5">
        <header className="space-y-1">
          <p className="hud-label">
            {period}
            {location ? <> {"//"} {location}</> : null}
          </p>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="font-mono text-sm text-accent">{subtitle}</p>
        </header>
        {children}
      </div>
    </article>
  );
}
