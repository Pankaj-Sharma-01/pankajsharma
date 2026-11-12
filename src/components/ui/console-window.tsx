import type { ReactNode } from "react";

type ConsoleWindowProps = {
  /** Shown in the title bar, like a file or process name. */
  title: string;
  /** Short readout on the right of the title bar. */
  status?: string;
  children: ReactNode;
  className?: string;
};

/** A panel dressed as a terminal window: title bar with status lights, then content. */
export function ConsoleWindow({ title, status, children, className = "" }: ConsoleWindowProps) {
  return (
    <section aria-label={title} className={`hud-frame overflow-hidden ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border bg-background/60 px-4 py-2">
        <p className="hud-label flex items-center gap-3">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2 rounded-full bg-hot" />
            <span className="size-2 rounded-full bg-sun" />
            <span className="size-2 rounded-full bg-accent" />
          </span>
          {title}
        </p>
        {status ? <p className="hud-label text-accent">{status}</p> : null}
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
