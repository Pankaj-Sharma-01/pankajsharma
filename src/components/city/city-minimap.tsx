"use client";

import { useImperativeHandle, useMemo, useRef, type Ref, type RefObject } from "react";

import { ROUTE, createRoute } from "@/components/city/route";

export type MinimapHandle = {
  /** Moves the marker; called on every scroll frame, so it bypasses React state. */
  setProgress: (progress: number) => void;
};

type MinimapStop = { id: string; number: string; label: string };

type CityMinimapProps = {
  /** Every stop in order: the entry, one per section, then the falls. */
  stops: readonly MinimapStop[];
  activeIndex: number;
  /** Receives the progress percentage as text, updated outside React. */
  syncRef: RefObject<HTMLSpanElement | null>;
  ref: Ref<MinimapHandle>;
};

const PADDING = 26;

/**
 * Plan of the route, drawn from the same geometry the 3D scene drives along:
 * turns, landmarks, and a marker for where you are. Each stop is a link.
 * The map is rotated so the journey reads left to right.
 */
export function CityMinimap({ stops, activeIndex, syncRef, ref }: CityMinimapProps) {
  const markerRef = useRef<SVGCircleElement>(null);
  const trailRef = useRef<SVGPathElement>(null);

  const map = useMemo(() => {
    const route = createRoute(stops.length - 2);
    // World (x, z) to map (x, y): north (-z) runs to the right.
    const project = (point: { x: number; z: number }) => ({ x: -point.z, y: point.x });
    const samples = Math.ceil(route.totalLength / 4);
    const points = Array.from({ length: samples + 1 }, (_, index) =>
      project(route.pointAt((index / samples) * route.totalLength)),
    );
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      route,
      project,
      path: points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(""),
      viewBox: [
        Math.min(...xs) - PADDING,
        Math.min(...ys) - PADDING,
        Math.max(...xs) - Math.min(...xs) + PADDING * 2,
        Math.max(...ys) - Math.min(...ys) + PADDING * 2,
      ].join(" "),
      nodes: stops.map((_, index) => project(route.pointAt(index * ROUTE.stageLength))),
    };
  }, [stops]);

  useImperativeHandle(
    ref,
    () => ({
      setProgress(progress) {
        const point = map.project(map.route.pointAt(progress * map.route.totalLength));
        markerRef.current?.setAttribute("cx", point.x.toFixed(1));
        markerRef.current?.setAttribute("cy", point.y.toFixed(1));
        if (trailRef.current) trailRef.current.style.strokeDasharray = `${progress} 1`;
      },
    }),
    [map],
  );

  const active = stops[activeIndex];
  const sectors = stops.length - 2;
  const isSector = activeIndex > 0 && activeIndex <= sectors;

  return (
    <nav
      aria-label="Route map"
      className="hud-frame fixed top-[4.25rem] right-4 z-30 hidden w-72 px-3 pt-2 pb-1.5 md:block lg:w-80 xl:right-12"
    >
      <svg viewBox={map.viewBox} className="block h-auto w-full overflow-visible" role="list">
        <path d={map.path} fill="none" className="stroke-border" strokeWidth="5" strokeLinejoin="round" />
        <path
          ref={trailRef}
          d={map.path}
          pathLength={1}
          fill="none"
          className="stroke-accent"
          strokeWidth="5"
          strokeLinejoin="round"
          strokeDasharray="0 1"
        />
        {stops.map((stop, index) => {
          const node = map.nodes[index];
          const isActive = index === activeIndex;
          const isLandmark = index > 0 && index < stops.length - 1;
          return (
            <a
              key={stop.id}
              href={`#district-${stop.id}`}
              role="listitem"
              aria-label={`${stop.number} ${stop.label}`}
              aria-current={isActive ? "location" : undefined}
              className="group outline-none"
            >
              {/* Generous invisible hit area. */}
              <circle cx={node.x} cy={node.y} r="20" fill="transparent" />
              {isLandmark ? (
                <rect
                  x={node.x - 8}
                  y={node.y - 8}
                  width="16"
                  height="16"
                  transform={`rotate(45 ${node.x} ${node.y})`}
                  className={`transition-colors group-hover:fill-hot group-focus-visible:fill-hot ${
                    isActive ? "fill-hot" : "fill-background stroke-muted"
                  }`}
                  strokeWidth="3"
                />
              ) : (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="8"
                  className={`transition-colors group-hover:fill-hot group-focus-visible:fill-hot ${
                    isActive ? "fill-hot" : "fill-background stroke-muted"
                  }`}
                  strokeWidth="3"
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r="17"
                fill="none"
                strokeWidth="2.5"
                className="stroke-transparent group-focus-visible:stroke-accent"
              />
            </a>
          );
        })}
        <circle ref={markerRef} cx={map.nodes[0].x} cy={map.nodes[0].y} r="7" className="fill-sun" />
      </svg>
      <p className="hud-label flex justify-between gap-3 pt-0.5">
        <span className="truncate">
          {isSector ? (
            <>
              <span className="sr-only">Sector </span>
              <span className="text-hot">{active.number}</span>/{String(sectors).padStart(2, "0")} {"//"}{" "}
            </>
          ) : null}
          <span className="text-foreground">{active.label}</span>
        </span>
        <span aria-hidden="true" className="shrink-0">
          Sync{" "}
          <span ref={syncRef} className="text-sun">
            000%
          </span>
        </span>
      </p>
    </nav>
  );
}
