import { Container } from "@/components/layout/container";
import { SocialLinks } from "@/components/ui/social-links";
import { siteConfig } from "@/data/site";

export function SiteFooter() {
  // Evaluated at build time; the static export refreshes it on each deploy.
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-auto border-t border-border bg-background/80 backdrop-blur-md">
      <Container
        size="wide"
        className="flex flex-col gap-4 py-8 font-mono text-xs tracking-wider text-muted uppercase sm:flex-row sm:items-center sm:justify-between"
      >
        <p>
          &copy; {year} {siteConfig.name} <span aria-hidden="true">{"//"}</span> All rights
          reserved
        </p>
        <SocialLinks />
      </Container>
    </footer>
  );
}
