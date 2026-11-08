import type { Picture } from "@/types/content";

import portrait from "@/assets/pictures/2026-08-08-portrait.jpg";
import tuffman10k from "@/assets/pictures/2026-01-04-tuffman-10k-new-delhi.jpg";

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
export const pictures: readonly Picture[] = [
  {
    image: tuffman10k,
    alt: "Pankaj running in a black jacket and headphones, wearing race bib 10274, at the Tuffman Global 10K in New Delhi",
    date: "2026-01-04",
    caption: "Tuffman Global 10K",
    location: "New Delhi",
  },
  {
    image: portrait,
    alt: "Black-and-white portrait of Pankaj in a linen shirt, leaning against a stone pillar",
    date: "2026-08-08",
  },
];
