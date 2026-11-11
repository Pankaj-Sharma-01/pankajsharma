"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { CityCanvas } from "@/components/city/city-canvas";
import { CityMinimap, type MinimapHandle } from "@/components/city/city-minimap";
import type { CityGate } from "@/components/city/city-scene";
import { isTypingTarget } from "@/lib/keyboard";

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
 * district sections, drives the 3D city from that, and renders the HUD:
 * a route minimap, previous/next travel buttons (also ← and → keys), a
 * progress readout, and a brief wipe whenever the sector changes.
 */
export function CityExperience({ districts, children }: CityExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<HTMLSpanElement>(null);
  const minimapRef = useRef<MinimapHandle>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Counts sector changes; 0 means the visitor has not moved yet, so no wipe plays on load.
  const [wipe, setWipe] = useState(0);
  const lastIndexRef = useRef(0);
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
      minimapRef.current?.setProgress(progress);
      const index = Math.round(position);
      if (index !== lastIndexRef.current) {
        lastIndexRef.current = index;
        setActiveIndex(index);
        setWipe((count) => count + 1);
      }
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

  const stops = useMemo(
    () => [
      { id: "entry", number: "00", label: "Entry" },
      ...districts,
      { id: "falls", number: "∞", label: "The Falls" },
    ],
    [districts],
  );
  const previous = stops[activeIndex - 1];
  const next = stops[activeIndex + 1];

  // Smooth scrolling comes from CSS, which also turns it off for reduced motion.
  const travelTo = useCallback(
    (index: number) => {
      const stop = stops[index];
      if (stop) document.getElementById(`district-${stop.id}`)?.scrollIntoView();
    },
    [stops],
  );

  // ← and → travel between stops (↑ ↓ and scrolling work as usual).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "ArrowRight") travelTo(activeIndex + 1);
      else if (event.key === "ArrowLeft") travelTo(activeIndex - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, travelTo]);

  return (
    <div ref={containerRef} className="relative isolate">
      {reducedMotion ? null : <CityCanvas gates={gates} progressRef={progressRef} />}

      {/* Sections sit above the canvas but let pointer events through to it,
          except on their panels. */}
      <div className="relative z-10">{children}</div>

      <CityMinimap ref={minimapRef} syncRef={syncRef} stops={stops} activeIndex={activeIndex} />

      {/* Glitch wipe and light sweep on each sector change. Remounting restarts the animation. */}
      {wipe > 0 ? <div key={wipe} aria-hidden="true" className="sector-wipe" /> : null}

      {/* Bottom HUD: travel controls and the progress line. The readouts live in the minimap. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="flex justify-center px-4 pb-2 font-mono text-[0.65rem] tracking-[0.2em] text-muted uppercase">
          <div role="group" aria-label="Travel between stops" className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => travelTo(activeIndex - 1)}
              disabled={!previous}
              aria-keyshortcuts="ArrowLeft"
              title="Previous stop (←)"
              className="grid size-10 place-items-center border border-accent/50 bg-background/80 text-accent backdrop-blur-sm transition-[background-color,box-shadow,opacity,transform] hover:bg-accent/20 active:scale-95 hover:shadow-[0_0_20px_var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronUp aria-hidden="true" className="size-4" />
              <span className="sr-only">Previous stop{previous ? `: ${previous.label}` : ""}</span>
            </button>
            <button
              type="button"
              onClick={() => travelTo(activeIndex + 1)}
              disabled={!next}
              aria-keyshortcuts="ArrowRight"
              title="Next stop (→)"
              className="flex h-10 items-center gap-2 border border-accent/50 bg-background/80 px-4 text-xs tracking-[0.2em] text-accent uppercase backdrop-blur-sm transition-[background-color,box-shadow,opacity,transform] hover:bg-accent/20 active:scale-95 hover:shadow-[0_0_20px_var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40"
            >
              {next ? (
                <>
                  <span className="text-muted">Next</span> {next.label}
                </>
              ) : (
                "End of the line"
              )}
              <ChevronDown aria-hidden="true" className="cue-bob size-4" />
            </button>
          </div>
        </div>
        <div aria-hidden="true" className="h-0.5 bg-border/60">
          <div
            ref={barRef}
            className="h-full origin-left scale-x-0 bg-gradient-to-r from-ultra via-hot to-sun shadow-[0_0_12px_var(--hot-glow)]"
          />
        </div>
      </div>
    </div>
  );
}
