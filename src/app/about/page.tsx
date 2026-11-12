import { Container } from "@/components/layout/container";
import { AboutConsole } from "@/components/sections/about-console";
import { PageHeader } from "@/components/ui/page-header";
import { about } from "@/data/about";
import { mainNav } from "@/data/navigation";
import { siteConfig } from "@/data/site";
import { createPageMetadata } from "@/lib/metadata";

const title = "About";
const description = "The person behind the terminal: what I build, and what I care about.";

export const metadata = createPageMetadata({ title, description, path: "/about" });

export default function AboutPage() {
  return (
    <Container className="py-16 sm:py-24 space-y-12">
      <PageHeader sector="/about" title={title} description={description} status="identity confirmed. session open." />
      <AboutConsole
        bio={about.bio}
        focusAreas={about.focusAreas}
        interests={about.interests}
        links={Object.values(siteConfig.links)}
        sectors={mainNav.map(({ label, href }) => ({ label, href }))}
      />
    </Container>
  );
}
