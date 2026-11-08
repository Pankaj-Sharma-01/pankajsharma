import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SocialLinks } from "@/components/ui/social-links";
import { siteConfig } from "@/data/site";

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="space-y-6">
      <div className="space-y-2">
        <h1 id="hero-heading" className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="text-xl text-accent">{siteConfig.role}</p>
      </div>
      <p className="max-w-prose text-lg leading-relaxed text-muted">{siteConfig.intro}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          More about me
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <SocialLinks className="text-muted" />
      </div>
    </section>
  );
}
