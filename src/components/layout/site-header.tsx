import Link from "next/link";

import { Container } from "@/components/layout/container";
import { MainNav } from "@/components/layout/main-nav";
import { siteConfig } from "@/data/site";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <Container className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="w-fit rounded-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {siteConfig.name}
        </Link>
        <MainNav />
      </Container>
    </header>
  );
}
