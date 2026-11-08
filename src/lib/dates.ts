import type { IsoDate, YearMonth } from "@/types/content";

const LOCALE = "en-GB";

// Dates in content files are calendar dates, not instants. Format them in UTC
// so the build machine's timezone can never shift them by a day.
const monthYear = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const fullDate = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function parseYearMonth(value: YearMonth): Date {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export function formatYearMonth(value: YearMonth): string {
  return monthYear.format(parseYearMonth(value));
}

/** "Apr 2023 – Present" or "Aug 2016 – May 2020". */
export function formatPeriod(start: YearMonth, end?: YearMonth): string {
  return `${formatYearMonth(start)} – ${end ? formatYearMonth(end) : "Present"}`;
}

/** Accepts "YYYY-MM-DD" or a full ISO timestamp; only the date part is used. */
export function formatDate(value: IsoDate | string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return fullDate.format(new Date(Date.UTC(year, month - 1, day)));
}

/** "YYYY-MM-DD" for a <time dateTime> attribute. */
export function toDateAttribute(value: string): string {
  return value.slice(0, 10);
}

/** Sort comparator: newest first, for ISO-formatted date strings. */
export function byDateDesc<T extends { date: string }>(a: T, b: T): number {
  return b.date.localeCompare(a.date);
}
