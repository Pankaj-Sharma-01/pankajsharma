import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { Section } from "@/components/ui/section";
import { TagList } from "@/components/ui/tag-list";
import { about } from "@/data/about";
import { createPageMetadata } from "@/lib/metadata";
import { sectorLabel } from "@/lib/sectors";

const title = "About";
const description = "Background, engineering interests, and how I approach building systems.";

export const metadata = createPageMetadata({ title, description, path: "/about" });

export default function AboutPage() {
  return (
    <Container className="py-16 sm:py-24 space-y-14">
      <PageHeader eyebrow={sectorLabel("/about")} title={title} description={description} />

      {about.bio.length > 0 ? (
        <div className="space-y-4 text-lg leading-relaxed">
          {about.bio.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <PlaceholderNotice>A longer introduction is coming soon.</PlaceholderNotice>
      )}

      <Section id="focus" title="What I work on">
        <TagList items={about.focusAreas} label="Focus areas" />
      </Section>

      <Section id="interests" title="Engineering interests">
        <TagList items={about.interests} label="Engineering interests" />
      </Section>
    </Container>
  );
}
