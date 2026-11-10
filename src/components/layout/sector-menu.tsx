"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Map as MapIcon, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { SectorIcon } from "@/components/ui/sector-icon";
import { mainNav } from "@/data/navigation";
import { isTypingTarget } from "@/lib/keyboard";
import { normalizePath } from "@/lib/paths";
import { sectorNumber } from "@/lib/sectors";

const destinations = [
  { href: "/" as const, number: "00", label: "The City", description: "The drive through the city, from the road to the falls." },
  ...mainNav.map((item) => ({ ...item, number: sectorNumber(item.href) })),
];

/**
 * The city map: one button, on every page, that opens a full list of the
 * site's sections. Press M to open it, 0–8 to jump, Esc to close. Built on
 * the native <dialog>, which handles focus trapping and Esc.
 */
export function SectorMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = normalizePath(usePathname());
  const router = useRouter();

  const close = useCallback(() => dialogRef.current?.close(), []);

  // Navigating closes the map.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        if (dialog.open) dialog.close();
        else dialog.showModal();
      } else if (dialog.open && /^[0-9]$/.test(event.key)) {
        const destination = destinations[Number(event.key)];
        if (destination) {
          event.preventDefault();
          dialog.close();
          router.push(destination.href);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-keyshortcuts="M"
        title="Open the city map (M)"
        onClick={() => dialogRef.current?.showModal()}
        className="group inline-flex shrink-0 items-center gap-2 border border-accent/50 bg-accent/10 px-3 py-1.5 font-mono text-xs tracking-[0.2em] text-accent uppercase transition-[background-color,box-shadow] hover:bg-accent/20 hover:shadow-[0_0_20px_var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <MapIcon aria-hidden="true" className="size-4" />
        Map
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="sector-menu-title"
        // A click on the backdrop lands on the dialog element itself.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(100%-2rem,64rem)] overflow-y-auto bg-transparent text-foreground backdrop:bg-background/85 backdrop:backdrop-blur-md"
      >
        <div className="hud-frame space-y-6 p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="hud-label text-hot">Navigation</p>
              <h2 id="sector-menu-title" className="font-display text-2xl font-bold uppercase">
                City map
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="grid size-9 place-items-center border border-border text-muted transition-colors hover:border-hot hover:text-hot focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Close map</span>
            </button>
          </div>

          <nav aria-label="All sections">
            <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {destinations.map((destination) => {
                const isCurrent = pathname === destination.href;
                return (
                  <li key={destination.href}>
                    <Link
                      href={destination.href}
                      onClick={close}
                      aria-current={isCurrent ? "page" : undefined}
                      className={`group flex h-full items-center gap-4 border p-3 transition-[border-color,background-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        isCurrent
                          ? "border-accent bg-accent/10 shadow-[0_0_24px_var(--accent-soft)]"
                          : "border-border bg-surface hover:border-hot/70 hover:shadow-[0_0_24px_var(--hot-soft)]"
                      }`}
                    >
                      <span className="grid size-10 shrink-0 place-items-center border border-border text-accent transition-colors group-hover:border-hot group-hover:text-hot">
                        <SectorIcon href={destination.href} className="size-5" />
                      </span>
                      <span className="space-y-1">
                        <span className="flex items-baseline gap-2">
                          <span className="font-mono text-xs text-hot">{destination.number}</span>
                          <span className="font-display text-sm font-bold tracking-wide uppercase">
                            {destination.label}
                          </span>
                          {isCurrent ? <span className="hud-label text-accent">You are here</span> : null}
                        </span>
                        <span className="hidden text-sm text-muted sm:block">{destination.description}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <p className="hud-label hidden sm:block">
            Press <kbd className="text-accent">M</kbd> to open or close {"//"} <kbd className="text-accent">0</kbd>–
            <kbd className="text-accent">{destinations.length - 1}</kbd> to jump {"//"}{" "}
            <kbd className="text-accent">Esc</kbd> to close
          </p>
        </div>
      </dialog>
    </>
  );
}
