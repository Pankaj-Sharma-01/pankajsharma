import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SectorIcon } from "@/components/ui/sector-icon";
import type { District } from "@/lib/districts";

type DistrictPanelProps = {
  district: District;
};

/** The HUD card that materialises as the camera reaches a district's gate. */
export function DistrictPanel({ district }: DistrictPanelProps) {
  const headingId = `district-${district.id}-heading`;
  const online = district.stats.length > 0;

  return (
    <article
      aria-labelledby={headingId}
      className="district-reveal hud-frame hud-frame-interactive pointer-events-auto w-full max-w-md space-y-5 p-6 sm:p-8"
    >
      <p className="hud-label flex items-center gap-2 text-hot">
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${
            online ? "bg-accent shadow-[0_0_8px_var(--accent)]" : "bg-sun shadow-[0_0_8px_var(--sun)]"
          }`}
        />
        Sector {district.number} {"//"} {online ? "Online" : "Pending"}
      </p>

      <span className="grid size-11 place-items-center border border-border text-accent">
        <SectorIcon href={district.href} className="size-5" />
      </span>

      <h2
        id={headingId}
        data-text={district.label}
        className="glitch w-fit font-display font-bold text-2xl uppercase sm:text-3xl"
      >
        {district.label}
      </h2>

      <p className="text-foreground/85">{district.tagline}</p>

      {online ? (
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-px border border-border bg-border">
          {district.stats.map((stat) => (
            <div key={stat.label} className="bg-background/90 px-3 py-2.5">
              <dt className="hud-label">{stat.label}</dt>
              <dd className="text-glow-sun mt-1 font-mono text-base font-semibold break-words text-sun">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="font-mono text-xs tracking-widest text-muted uppercase">
          <span aria-hidden="true" className="text-sun">
            [ ]
          </span>{" "}
          Data incoming
        </p>
      )}

      <Link
        href={district.href}
        className="group inline-flex items-center gap-2 border border-accent/50 bg-accent/10 px-4 py-2 font-mono text-xs tracking-[0.25em] text-accent uppercase transition-[background-color,box-shadow] hover:bg-accent/20 hover:shadow-[0_0_24px_var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        Enter sector<span className="sr-only">: {district.label}</span>
        <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </article>
  );
}
