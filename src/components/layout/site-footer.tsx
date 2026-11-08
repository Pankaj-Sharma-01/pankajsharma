import { Container } from "@/components/layout/container";
import { SocialLinks } from "@/components/ui/social-links";
import { siteConfig } from "@/data/site";

export function SiteFooter() {
  // Evaluated at build time; the static export refreshes it on each deploy.
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border">
      <Container className="flex flex-col gap-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {year} {siteConfig.name}. All rights reserved.
        </p>
        <SocialLinks />
      </Container>
    </footer>
  );
}
