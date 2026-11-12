/** Helpers for race times. Everything here is arithmetic on the recorded time and distance. */

export const KM_PER_MILE = 1.609344;

/** "22:47" or "2:04:18" to seconds; null if it is not a clock time. */
export function parseClock(value: string): number | null {
  const parts = value.split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Seconds to "4:33" or "1:02:09". */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}
