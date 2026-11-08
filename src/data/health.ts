import type { PersonalRecord } from "@/types/content";

/**
 * Personal records, grouped by category on the page and shown in the order
 * listed. Optional fields: date ("YYYY-MM-DD"), context (race/place), url.
 */
export const personalRecords: readonly PersonalRecord[] = [
  { category: "running", event: "5K", result: "22:47" },
  { category: "running", event: "10K", result: "47:38" },
  { category: "running", event: "Half marathon (21K)", result: "2:04:18" },
  { category: "strength", event: "Push-ups", result: "72 reps" },
  { category: "strength", event: "Pull-ups", result: "13 reps" },
];
