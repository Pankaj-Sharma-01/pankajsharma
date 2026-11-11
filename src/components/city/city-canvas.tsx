"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";

import type { CityGate, CityPalette, CityScene } from "@/components/city/city-scene";

type CityCanvasProps = {
  gates: readonly CityGate[];
  progressRef: RefObject<number>;
};

function readPalette(): CityPalette {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string) => styles.getPropertyValue(name).trim();
  return {
    background: read("--background"),
    foreground: read("--foreground"),
    muted: read("--muted"),
    border: read("--border"),
    accent: read("--accent"),
    hot: read("--hot"),
    sun: read("--sun"),
    ultra: read("--ultra"),
    skyZenith: read("--sky-zenith"),
    skyDusk: read("--sky-dusk"),
    skyHorizon: read("--sky-horizon"),
  };
}

function readFont(variable: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || "monospace";
}

function isLowPowerDevice(): boolean {
  const smallScreen = window.matchMedia("(max-width: 768px)").matches;
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  return smallScreen || fewCores;
}

/**
 * Full-screen WebGL backdrop for the home page. three.js is loaded with a
 * dynamic import after hydration, so it never blocks the page or ships to
 * other routes. If WebGL is unavailable the canvas simply stays empty.
 *
 * Debugging: add `?fps` to the URL to show the measured frame rate and
 * quality tier, and `?quality=0` (best) to `3` to hold one tier.
 */
export function CityCanvas({ gates, progressRef }: CityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statsRef = useRef<HTMLParagraphElement>(null);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let scene: CityScene | null = null;
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const debug = params.has("fps");
    const quality = params.get("quality");

    async function start(target: HTMLCanvasElement) {
      const fonts = { display: readFont("--font-display-stack"), mono: readFont("--font-geist-mono") };
      const [{ createCityScene }] = await Promise.all([
        import("@/components/city/city-scene"),
        // Signs are drawn to canvas, which needs the fonts loaded first.
        document.fonts.load(`700 64px ${fonts.display}`).catch(() => undefined),
        document.fonts.load(`700 38px ${fonts.mono}`).catch(() => undefined),
      ]);
      if (cancelled) return;
      scene = createCityScene({
        canvas: target,
        gates,
        palette: readPalette(),
        fonts,
        lowPower: isLowPowerDevice(),
        getProgress: () => progressRef.current,
        onNavigate: (href) => router.push(href),
        lockTier: quality === null ? undefined : Number(quality) || 0,
        onStats: debug
          ? (fps, tier) => {
              if (statsRef.current) statsRef.current.textContent = `${Math.round(fps)} fps // quality tier ${tier}`;
            }
          : undefined,
      });
      if (scene) {
        setReady(true);
        setShowStats(debug);
      }
    }

    void start(canvas);
    return () => {
      cancelled = true;
      scene?.dispose();
    };
  }, [gates, progressRef, router]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`fixed inset-0 z-0 h-full w-full transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
      {showStats ? (
        <p
          ref={statsRef}
          aria-hidden="true"
          className="hud-label pointer-events-none fixed bottom-14 left-4 z-30 border border-border bg-background/80 px-2 py-1 text-sun"
        >
          measuring…
        </p>
      ) : null}
    </>
  );
}
