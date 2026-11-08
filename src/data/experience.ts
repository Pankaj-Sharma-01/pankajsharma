import type { WorkExperience } from "@/types/content";

/**
 * Most recent first. Example entry:
 *
 * {
 *   company: "Company name",
 *   role: "AI Engineer",
 *   location: "City, Country",
 *   start: "2023-04",
 *   // end omitted = current role
 *   summary: "One sentence on what the team does and what you own.",
 *   highlights: ["Outcome-focused bullet", "Another one"],
 *   technologies: ["Python", "PostgreSQL"],
 * }
 */
export const experience: readonly WorkExperience[] = [];
