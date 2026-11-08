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

function isLowPowerDevice(): boolean {
  const smallScreen = window.matchMedia("(max-width: 768px)").matches;
  const fewCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  return smallScreen || fewCores;
}

/**
 * Full-screen WebGL backdrop for the home page. three.js is loaded with a
 * dynamic import after hydration, so it never blocks the page or ships to
 * other routes. If WebGL is unavailable the canvas simply stays empty.
 */
export function CityCanvas({ gates, progressRef }: CityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let scene: CityScene | null = null;
    let cancelled = false;

    async function start(target: HTMLCanvasElement) {
      const fontFamily =
        getComputedStyle(document.documentElement).getPropertyValue("--font-display-stack").trim() ||
        "monospace";
      const [{ createCityScene }] = await Promise.all([
        import("@/components/city/city-scene"),
        document.fonts.load(`400 64px ${fontFamily}`).catch(() => undefined),
      ]);
      if (cancelled) return;
      scene = createCityScene({
        canvas: target,
        gates,
        palette: readPalette(),
        fontFamily,
        lowPower: isLowPowerDevice(),
        getProgress: () => progressRef.current,
        onNavigate: (href) => router.push(href),
      });
      if (scene) setReady(true);
    }

    void start(canvas);
    return () => {
      cancelled = true;
      scene?.dispose();
    };
  }, [gates, progressRef, router]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 z-0 h-full w-full transition-opacity duration-1000 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
