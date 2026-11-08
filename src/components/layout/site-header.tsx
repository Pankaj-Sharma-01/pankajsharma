import Link from "next/link";

import { Container } from "@/components/layout/container";
import { MainNav } from "@/components/layout/main-nav";
import { siteConfig } from "@/data/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-md">
      <Container
        size="wide"
        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
      >
        <Link
          href="/"
          className="w-fit shrink-0 rounded-sm font-display text-sm tracking-[0.12em] uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span aria-hidden="true" className="text-hot">
            &gt;{" "}
          </span>
          <span data-text={siteConfig.name} className="glitch">
            {siteConfig.name}
          </span>
        </Link>
        <MainNav />
      </Container>
    </header>
  );
}
