"use client";

import { useState } from "react";

import { ExternalLink } from "@/components/ui/external-link";
import { formatDate } from "@/lib/dates";
import { KM_PER_MILE, formatClock, parseClock } from "@/lib/pace";
import type { PersonalRecord } from "@/types/content";

type RunTelemetryProps = {
  records: readonly PersonalRecord[];
};

type Unit = "km" | "mi";

/**
 * Race times with the numbers behind them. Pace and speed are worked out
 * from each record's time and distance, in the visitor's choice of unit.
 */
export function RunTelemetry({ records }: RunTelemetryProps) {
  const [unit, setUnit] = useState<Unit>("km");
  const perUnit = unit === "km" ? 1 : KM_PER_MILE;

  const rows = records.map((record) => {
    const seconds = parseClock(record.result);
    const speed = seconds && record.distanceKm ? record.distanceKm / (seconds / 3600) : null; // km/h
    return { record, seconds, speed };
  });
  const fastest = Math.max(...rows.map((row) => row.speed ?? 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="hud-label">Pace and speed are calculated from time and distance</p>
        <div role="group" aria-label="Units" className="flex gap-2">
          {(["km", "mi"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={unit === option}
              onClick={() => setUnit(option)}
              className={`border px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                unit === option
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-surface text-muted hover:border-accent/60 hover:text-accent"
              }`}
            >
              {option === "km" ? "Kilometres" : "Miles"}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        {rows.map(({ record, seconds, speed }) => {
          const details = [record.context, record.date ? formatDate(record.date) : undefined].filter(
            (detail): detail is string => Boolean(detail),
          );
          return (
            <li key={record.event} className="reveal hud-frame hud-frame-interactive group flex flex-col gap-3 p-4">
              <p className="hud-label">{record.event}</p>
              <p className="text-sunrise w-fit font-mono text-3xl font-bold tracking-tight tabular-nums transition-transform group-hover:translate-x-1">
                {record.result}
              </p>
              {seconds && speed && record.distanceKm ? (
                <>
                  <dl className="grid grid-cols-2 gap-px border border-border bg-border font-mono text-sm">
                    <div className="bg-background/90 px-3 py-2">
                      <dt className="hud-label">Pace</dt>
                      <dd className="text-sun tabular-nums">
                        {formatClock(seconds / (record.distanceKm / perUnit))} /{unit}
                      </dd>
                    </div>
                    <div className="bg-background/90 px-3 py-2">
                      <dt className="hud-label">Speed</dt>
                      <dd className="text-sun tabular-nums">
                        {(speed / perUnit).toFixed(1)} {unit === "km" ? "km/h" : "mph"}
                      </dd>
                    </div>
                  </dl>
                  {/* Speed relative to the fastest record. Decorative: the numbers are above. */}
                  <div aria-hidden="true" className="h-1.5 bg-border">
                    <div
                      className="meter-fill h-full bg-gradient-to-r from-hot to-sun shadow-[0_0_10px_var(--hot-glow)]"
                      style={{ width: `${(speed / fastest) * 100}%` }}
                    />
                  </div>
                </>
              ) : null}
              {details.length > 0 ? (
                <p className="text-xs text-muted">
                  {record.url ? <ExternalLink href={record.url}>{details.join(" · ")}</ExternalLink> : details.join(" · ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
