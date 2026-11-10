"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { SectorIcon } from "@/components/ui/sector-icon";
import { mainNav } from "@/data/navigation";
import { normalizePath } from "@/lib/paths";
import { sectorNumber } from "@/lib/sectors";

type Stop = { href: `/${string}`; label: string; number: string };

const city: Stop = { href: "/", label: "The City", number: "00" };

function PagerLink({ stop, direction }: { stop: Stop; direction: "previous" | "next" }) {
  const isNext = direction === "next";
  return (
    <Link
      href={stop.href}
      rel={isNext ? "next" : "prev"}
      className={`hud-frame hud-frame-interactive group flex items-center gap-4 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isNext ? "flex-row-reverse text-right" : ""
      }`}
    >
      <span className="grid size-10 shrink-0 place-items-center border border-border text-accent transition-colors group-hover:border-hot group-hover:text-hot">
        {isNext ? (
          <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
        ) : (
          <ArrowLeft aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5" />
        )}
      </span>
      <span className="min-w-0 space-y-1">
        <span className="hud-label block">
          {isNext ? "Next" : "Previous"} {"//"} {stop.number}
        </span>
        <span className={`flex items-center gap-2 font-display text-sm font-bold tracking-wide uppercase ${isNext ? "justify-end" : ""}`}>
          <SectorIcon href={stop.href} className="size-4 text-hot" />
          {stop.label}
        </span>
      </span>
    </Link>
  );
}

/** Previous / next section links at the foot of every section page. */
export function SectorPager() {
  const pathname = normalizePath(usePathname());
  const index = mainNav.findIndex((item) => item.href === pathname);
  if (index === -1) return null;

  const toStop = (offset: number): Stop => {
    const item = mainNav[index + offset];
    return item ? { href: item.href, label: item.label, number: sectorNumber(item.href) } : city;
  };

  return (
    <nav aria-label="Previous and next sections" className="mx-auto w-full max-w-3xl px-5 pb-20 sm:px-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <PagerLink stop={toStop(-1)} direction="previous" />
        <PagerLink stop={toStop(1)} direction="next" />
      </div>
    </nav>
  );
}
