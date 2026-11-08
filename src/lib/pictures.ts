import type { Picture } from "@/types/content";

export type PictureYear = {
  year: string;
  pictures: Picture[];
};

/**
 * Groups pictures by year, oldest year first, so the page reads as a timeline.
 * Within a year, pictures are sorted by date (year-only dates come first).
 */
export function groupPicturesByYear(pictures: readonly Picture[]): PictureYear[] {
  const byYear = new Map<string, Picture[]>();
  for (const picture of pictures) {
    const year = picture.date.slice(0, 4);
    const group = byYear.get(year) ?? [];
    group.push(picture);
    byYear.set(year, group);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, group]) => ({
      year,
      pictures: group.sort((a, b) => a.date.localeCompare(b.date)),
    }));
}
