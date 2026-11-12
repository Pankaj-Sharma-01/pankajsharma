import type { PersonalRecord } from "@/types/content";

/**
 * Personal records, grouped by category on the page and shown in the order
 * listed. Give running records a `distanceKm` and the page works out pace
 * and speed. Optional fields: date ("YYYY-MM-DD"), context (race/place), url.
 */
export const personalRecords: readonly PersonalRecord[] = [
  { category: "running", event: "5K", result: "22:47", distanceKm: 5 },
  { category: "running", event: "10K", result: "47:38", distanceKm: 10 },
  { category: "running", event: "Half marathon", result: "2:04:18", distanceKm: 21.0975 },
];
