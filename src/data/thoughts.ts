import type { Thought } from "@/types/content";

/**
 * Short-form notes. Rendered newest first regardless of order here.
 * Example entry:
 *
 * {
 *   slug: "boring-technology",
 *   title: "A short title",
 *   date: "2025-06-01",
 *   body: ["First paragraph.", "Second paragraph."],
 *   tags: ["architecture"],
 * }
 */
export const thoughts: readonly Thought[] = [];
