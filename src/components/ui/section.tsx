import type { ReactNode } from "react";

type SectionProps = {
  /** Used for the heading id, so it must be unique on the page. */
  id: string;
  title: string;
  children: ReactNode;
};

/** A titled page section. The <h2> labels the section for assistive tech. */
export function Section({ id, title, children }: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className="space-y-5">
      <h2
        id={headingId}
        className="flex items-center gap-3 font-mono text-sm font-semibold tracking-[0.2em] uppercase"
      >
        <span aria-hidden="true" className="text-hot">
          {"//"}
        </span>
        {title}
        <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-hot/40 via-ultra/30 to-transparent" />
      </h2>
      {children}
    </section>
  );
}
