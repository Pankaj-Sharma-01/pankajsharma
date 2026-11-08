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
      <h2 id={headingId} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}
