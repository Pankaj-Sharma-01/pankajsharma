import { Container } from "@/components/layout/container";
import { TimelineEntry } from "@/components/sections/timeline-entry";
import { BulletList } from "@/components/ui/bullet-list";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { education } from "@/data/education";
import { formatPeriod } from "@/lib/dates";
import { createPageMetadata } from "@/lib/metadata";
import { sectorLabel } from "@/lib/sectors";

const title = "Education";
const description = "Formal education and qualifications.";

export const metadata = createPageMetadata({ title, description, path: "/education" });

export default function EducationPage() {
  return (
    <Container className="py-16 sm:py-24 space-y-12">
      <PageHeader eyebrow={sectorLabel("/education")} title={title} description={description} />

      {education.length === 0 ? (
        <PlaceholderNotice>Education details are coming soon.</PlaceholderNotice>
      ) : (
        <div className="space-y-12">
          {education.map((entry) => (
            <TimelineEntry
              key={`${entry.institution}-${entry.start}`}
              title={entry.field ? `${entry.qualification}, ${entry.field}` : entry.qualification}
              subtitle={entry.institution}
              period={formatPeriod(entry.start, entry.end)}
              location={entry.location}
            >
              <BulletList items={entry.notes ?? []} />
            </TimelineEntry>
          ))}
        </div>
      )}
    </Container>
  );
}
