import Link from "next/link";

import { Container } from "@/components/layout/container";
import { MainNav } from "@/components/layout/main-nav";
import { SectorMenu } from "@/components/layout/sector-menu";
import { siteConfig } from "@/data/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-md">
      <Container size="wide" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
        <Link
          href="/"
          className="w-fit shrink-0 rounded-sm font-display text-sm font-bold tracking-[0.12em] uppercase focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span aria-hidden="true" className="text-hot">
            &gt;{" "}
          </span>
          <span data-text={siteConfig.name} className="glitch">
            {siteConfig.name}
          </span>
        </Link>
        {/* On narrow screens the tab strip drops to its own row. */}
        <div className="order-last w-full min-w-0 lg:order-none lg:w-auto lg:flex-1 empty:hidden">
          <MainNav />
        </div>
        <SectorMenu />
      </Container>
    </header>
  );
}
