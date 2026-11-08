"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { CityCanvas } from "@/components/city/city-canvas";
import type { CityGate } from "@/components/city/city-scene";

export type CityDistrictLink = CityGate & {
  /** Matches the section's `id="district-<id>"`. */
  id: string;
};

type CityExperienceProps = {
  districts: readonly CityDistrictLink[];
  /**
   * `[data-district]` sections in order: the hero, one per district, then
   * the falls (`#district-falls`).
   */
  children: ReactNode;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on the server, so the canvas only mounts once we know motion is OK. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => true,
  );
}

/**
 * Home page shell: tracks how far the visitor has scrolled through the
 * district sections, drives the 3D city from that, and renders the HUD
 * (city map + progress readout).
 */
export function CityExperience({ districts, children }: CityExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const gates = useMemo<CityGate[]>(
    () => districts.map(({ number, label, href }) => ({ number, label, href })),
    [districts],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const sections = Array.from(container.querySelectorAll<HTMLElement>("[data-district]"));
    const steps = sections.length - 1;
    let frame = 0;

    // Progress is piecewise-linear between section tops, so sections of any
    // height map evenly onto the flight path: section i at the top of the
    // viewport means progress i / steps.
    const update = () => {
      frame = 0;
      const tops = sections.map((section) => section.getBoundingClientRect().top);
      let position = 0;
      for (let index = 0; index < tops.length - 1; index++) {
        if (tops[index] <= 0) {
          const span = tops[index + 1] - tops[index];
          position = index + Math.min(1, -tops[index] / span);
        }
      }
      const progress = steps > 0 ? position / steps : 0;
      progressRef.current = progress;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      if (syncRef.current) syncRef.current.textContent = `${Math.round(progress * 100)}%`.padStart(4, "0");
      setActiveIndex(Math.round(position));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const stops = [
    { id: "entry", number: "00", label: "Entry" },
    ...districts,
    { id: "falls", number: "∞", label: "The Falls" },
  ];
  const active = activeIndex > 0 ? stops[activeIndex] : undefined;

  return (
    <div ref={containerRef} className="relative isolate">
      {reducedMotion ? null : <CityCanvas gates={gates} progressRef={progressRef} />}

      {/* Sections sit above the canvas but let pointer events through to it,
          except on their panels. */}
      <div className="relative z-10">{children}</div>

      {/* City map: jump to any district. */}
      <nav
        aria-label="City map"
        className="fixed top-1/2 left-4 z-30 hidden -translate-y-1/2 xl:block"
      >
        <ol className="space-y-1 font-mono text-[0.68rem] tracking-[0.2em] uppercase">
          {stops.map((district, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={district.id}>
                <a
                  href={`#district-${district.id}`}
                  aria-current={isActive ? "location" : undefined}
                  className={`group flex items-center gap-2 rounded-sm py-1 pr-2 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                    isActive ? "text-accent text-glow" : "text-muted hover:text-foreground"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-px transition-all duration-300 ${
                      isActive ? "w-8 bg-accent shadow-[0_0_8px_var(--accent-glow)]" : "w-3 bg-border group-hover:w-5 group-hover:bg-muted"
                    }`}
                  />
                  <span>{district.number}</span>
                  <span
                    className={`transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                    }`}
                  >
                    {district.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Status bar: decorative readout of where you are in the city. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="flex items-center justify-between gap-4 px-4 pb-2 font-mono text-[0.65rem] tracking-[0.2em] text-muted uppercase sm:px-8">
          <span>
            {active?.id === "falls" ? (
              <>
                Terminus {"//"} <span className="text-hot">{active.label}</span>
              </>
            ) : active ? (
              <>
                Sector <span className="text-hot">{active.number}</span>/{String(districts.length).padStart(2, "0")}{" "}
                {"//"} {active.label}
              </>
            ) : (
              <>Scroll to enter the city</>
            )}
          </span>
          <span>
            Sync <span ref={syncRef} className="text-sun">00%</span>
          </span>
        </div>
        <div className="h-0.5 bg-border/60">
          <div
            ref={barRef}
            className="h-full origin-left scale-x-0 bg-gradient-to-r from-ultra via-hot to-sun shadow-[0_0_12px_var(--hot-glow)]"
          />
        </div>
      </div>
    </div>
  );
}
