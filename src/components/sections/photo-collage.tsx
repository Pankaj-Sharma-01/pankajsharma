import Image from "next/image";

import { formatDateWithinYear } from "@/lib/dates";
import type { Picture } from "@/types/content";

type PhotoCollageProps = {
  pictures: readonly Picture[];
};

/**
 * Masonry-style collage using CSS columns: photos keep their natural aspect
 * ratio and pack into 2–3 columns. No JavaScript involved.
 */
export function PhotoCollage({ pictures }: PhotoCollageProps) {
  return (
    <ul className="columns-2 gap-3 sm:columns-3">
      {pictures.map((picture) => {
        const dateLabel = formatDateWithinYear(picture.date);
        const details = [picture.caption, picture.location, dateLabel].filter(Boolean);
        return (
          <li key={picture.image.src} className="mb-3 break-inside-avoid">
            <figure className="space-y-1.5">
              <a
                href={picture.image.src}
                className="block overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Image
                  src={picture.image}
                  alt={picture.alt}
                  placeholder="blur"
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="h-auto w-full transition-transform duration-300 hover:scale-[1.02]"
                />
                <span className="sr-only">(view full size)</span>
              </a>
              {details.length > 0 ? (
                <figcaption className="text-xs text-muted">{details.join(" · ")}</figcaption>
              ) : null}
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
