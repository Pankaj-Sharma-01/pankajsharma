import type { ReactNode } from "react";

type PlaceholderNoticeProps = {
  children: ReactNode;
};

/** Marks a section whose real content hasn't been written yet. */
export function PlaceholderNotice({ children }: PlaceholderNoticeProps) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-dashed border-border bg-surface px-4 py-3 font-mono text-xs tracking-wider text-muted uppercase">
      <span aria-hidden="true" className="text-sun">
        [ pending ]
      </span>
      <span>{children}</span>
    </p>
  );
}
