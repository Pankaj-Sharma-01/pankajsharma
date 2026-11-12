import { SectorIcon } from "@/components/ui/sector-icon";
import { sectorLabel, sectorNumber } from "@/lib/sectors";
import type { NavItem } from "@/types/site";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** The section this page belongs to: adds its number, icon, and label. */
  sector?: NavItem["href"];
  /** Small label above the title, when the page isn't a numbered section. */
  eyebrow?: string;
  /** One line of system output typed out under the description, e.g. "5 log entries loaded". */
  status?: string;
};

/** Title block shared by top-level pages. Renders the page's single <h1>. */
export function PageHeader({ title, description, sector, eyebrow, status }: PageHeaderProps) {
  const label = sector ? sectorLabel(sector) : eyebrow;
  return (
    <header className="relative space-y-4 border-b border-border pb-8">
      {sector ? (
        // Oversized outlined sector number, as a watermark.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 right-0 font-display text-8xl leading-none font-bold text-transparent select-none [-webkit-text-stroke:1px_var(--border)] sm:text-9xl"
        >
          {sectorNumber(sector)}
        </span>
      ) : null}
      {label ? (
        <p className="hud-label text-glow-hot relative flex items-center gap-2 text-hot">
          {sector ? <SectorIcon href={sector} className="size-4" /> : null}
          <span>
            {label}
            <span aria-hidden="true" className="caret ml-1">
              _
            </span>
          </span>
        </p>
      ) : null}
      <h1
        data-text={title}
        className="glitch relative w-fit font-display text-2xl leading-tight font-bold uppercase sm:text-4xl"
      >
        {title}
      </h1>
      {description ? <p className="relative max-w-prose text-lg text-muted">{description}</p> : null}
      {status ? (
        <p className="relative font-mono text-xs tracking-wider text-accent">
          <span aria-hidden="true" className="text-hot">
            &gt;{" "}
          </span>
          <span className="typewriter">{status}</span>
        </p>
      ) : null}
    </header>
  );
}
