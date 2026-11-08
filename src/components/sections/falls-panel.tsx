import { ArrowUp } from "lucide-react";

import { SocialLinks } from "@/components/ui/social-links";

/** Final stop of the home page journey: the cliff edge facing the falls. */
export function FallsPanel() {
  return (
    <article
      aria-labelledby="district-falls-heading"
      className="district-reveal hud-frame hud-frame-interactive pointer-events-auto w-full max-w-md space-y-5 p-6 text-center sm:p-8"
    >
      <p className="hud-label text-hot">Terminus {"//"} End of the line</p>
      <h2
        id="district-falls-heading"
        data-text="The Falls"
        className="glitch text-sunrise mx-auto w-fit font-display text-2xl uppercase sm:text-3xl"
      >
        The Falls
      </h2>
      <p className="text-muted">
        You&apos;ve reached the edge of the city. Thanks for taking the ride.
      </p>
      <SocialLinks className="justify-center font-mono text-xs tracking-widest text-muted uppercase" />
      <a
        href="#district-entry"
        className="group mx-auto inline-flex items-center gap-2 border border-accent/50 bg-accent/10 px-4 py-2 font-mono text-xs tracking-[0.25em] text-accent uppercase transition-[background-color,box-shadow] hover:bg-accent/20 hover:shadow-[0_0_24px_var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <ArrowUp aria-hidden="true" className="size-4 transition-transform group-hover:-translate-y-0.5" />
        Back to the start
      </a>
    </article>
  );
}
