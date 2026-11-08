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
    <article className="space-y-4 border-l border-border pl-5">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-accent">{subtitle}</p>
        <p className="text-sm text-muted">
          {period}
          {location ? <> &middot; {location}</> : null}
        </p>
      </header>
      {children}
    </article>
  );
}
