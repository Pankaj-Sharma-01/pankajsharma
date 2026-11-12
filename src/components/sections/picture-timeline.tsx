"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Section } from "@/components/ui/section";
import { formatDate, formatDateWithinYear } from "@/lib/dates";
import type { PictureYear } from "@/lib/pictures";
import type { Picture } from "@/types/content";

type PictureTimelineProps = {
  years: readonly PictureYear[];
};

const viewerButton =
  "grid size-10 place-items-center border border-border bg-background/80 text-muted transition-colors hover:border-hot hover:text-hot focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function caption(picture: Picture) {
  const date = picture.date.length === 10 ? formatDate(picture.date) : picture.date;
  return [picture.caption, picture.location, date].filter(Boolean).join(" · ");
}

/**
 * Photos grouped by year in a masonry collage. Selecting one opens it in a
 * viewer; ← and → move through every photo in order, Esc closes.
 */
export function PictureTimeline({ years }: PictureTimelineProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const all = years.flatMap((year) => year.pictures);
  const [index, setIndex] = useState<number | null>(null);
  const current = index === null ? null : all[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  const step = (offset: number) =>
    setIndex((value) => (value === null ? value : (value + offset + all.length) % all.length));

  return (
    <>
      {years.map(({ year, pictures }) => (
        <Section key={year} id={`year-${year}`} title={year}>
          <ul className="columns-2 gap-3 sm:columns-3">
            {pictures.map((picture) => {
              const details = [picture.caption, picture.location, formatDateWithinYear(picture.date)].filter(Boolean);
              return (
                <li key={picture.image.src} className="mb-3 break-inside-avoid">
                  <figure className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setIndex(all.indexOf(picture))}
                      className="group block w-full cursor-zoom-in overflow-hidden border border-border transition-[border-color,box-shadow] duration-300 hover:border-hot/70 hover:shadow-[0_0_32px_var(--hot-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <Image
                        src={picture.image}
                        alt={picture.alt}
                        placeholder="blur"
                        sizes="(min-width: 640px) 33vw, 50vw"
                        className="h-auto w-full saturate-[0.85] transition-[transform,filter] duration-500 group-hover:scale-[1.03] group-hover:saturate-100"
                      />
                      <span className="sr-only">Open in viewer</span>
                    </button>
                    {details.length > 0 ? (
                      <figcaption className="font-mono text-[0.7rem] tracking-wider text-muted uppercase">
                        {details.join(" · ")}
                      </figcaption>
                    ) : null}
                  </figure>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}

      <dialog
        ref={dialogRef}
        aria-label="Photo viewer"
        onClose={() => setIndex(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIndex(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") step(1);
          if (event.key === "ArrowLeft") step(-1);
        }}
        className="m-auto max-h-dvh w-[min(100%-1.5rem,72rem)] bg-transparent text-foreground backdrop:bg-background/90 backdrop:backdrop-blur-md"
      >
        {current && index !== null ? (
          <figure className="hud-frame space-y-3 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="hud-label">
                Frame <span className="text-hot">{String(index + 1).padStart(2, "0")}</span>/
                {String(all.length).padStart(2, "0")}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => step(-1)} className={viewerButton}>
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  <span className="sr-only">Previous photo</span>
                </button>
                <button type="button" onClick={() => step(1)} className={viewerButton}>
                  <ChevronRight aria-hidden="true" className="size-4" />
                  <span className="sr-only">Next photo</span>
                </button>
                <button type="button" onClick={() => setIndex(null)} className={viewerButton}>
                  <X aria-hidden="true" className="size-4" />
                  <span className="sr-only">Close viewer</span>
                </button>
              </div>
            </div>
            <Image
              key={current.image.src}
              src={current.image}
              alt={current.alt}
              placeholder="blur"
              sizes="100vw"
              className="mx-auto h-auto max-h-[72dvh] w-auto max-w-full"
            />
            <figcaption className="font-mono text-xs tracking-wider text-muted uppercase">{caption(current)}</figcaption>
          </figure>
        ) : null}
      </dialog>
    </>
  );
}
