import type { ReactNode } from "react";

type PlaceholderNoticeProps = {
  children: ReactNode;
};

/** Marks a section whose real content hasn't been written yet. */
export function PlaceholderNotice({ children }: PlaceholderNoticeProps) {
  return (
    <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted">
      {children}
    </p>
  );
}
