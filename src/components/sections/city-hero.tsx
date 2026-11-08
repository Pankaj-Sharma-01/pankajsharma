import { ChevronDown } from "lucide-react";

import { SocialLinks } from "@/components/ui/social-links";
import { siteConfig } from "@/data/site";

/** Opening screen of the home page, shown above the city skyline. */
export function CityHero() {
  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col justify-center gap-10 py-16">
      <div className="pointer-events-auto max-w-2xl space-y-6">
        <p className="hud-label text-glow-hot text-hot">
          Connection established {"//"} pankajsharma.dev
          <span aria-hidden="true" className="caret ml-1">
            _
          </span>
        </p>
        <h1
          data-text={siteConfig.name}
          className="glitch-idle text-sunrise w-fit pb-1 font-mono text-5xl leading-none font-bold tracking-tight uppercase sm:text-7xl"
        >
          {siteConfig.name}
        </h1>
        <p className="text-glow font-mono text-lg tracking-[0.3em] text-accent uppercase sm:text-xl">
          {siteConfig.role}
        </p>
        <p className="max-w-prose text-lg leading-relaxed text-muted">{siteConfig.intro}</p>
        <SocialLinks className="font-mono text-xs tracking-widest text-muted uppercase" />
      </div>

      <a
        href="#district-about"
        className="pointer-events-auto flex w-fit items-center gap-3 rounded-sm font-mono text-xs tracking-[0.3em] text-muted uppercase transition-colors hover:text-hot focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <span className="cue-bob grid size-9 place-items-center border border-hot/60 text-hot shadow-[0_0_16px_var(--hot-soft)]">
          <ChevronDown aria-hidden="true" className="size-4" />
        </span>
        Scroll to enter the city
      </a>
    </div>
  );
}
