import type { Picture } from "@/types/content";

/**
 * Photos for the Pictures page. Order here doesn't matter: the page groups
 * them by year and sorts by date.
 *
 * To add a photo:
 *   1. Export it without location data and at most ~2000px on the long side
 *      (see README → "Adding pictures"). The build fails if GPS data is found.
 *   2. Save it in src/assets/pictures/, e.g. 2019-03-goa-beach.jpg
 *   3. Import it here and add an entry:
 *
 * import goaBeach from "@/assets/pictures/2019-03-goa-beach.jpg";
 *
 * {
 *   image: goaBeach,
 *   alt: "What's in the photo, for screen readers",
 *   date: "2019-03",            // "2019", "2019-03" or "2019-03-14"
 *   caption: "Optional caption",
 *   location: "Goa",            // optional, shown as text only
 * }
 */
export const pictures: readonly Picture[] = [];
