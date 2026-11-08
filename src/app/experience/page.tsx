import { Container } from "@/components/layout/container";
import { TimelineEntry } from "@/components/sections/timeline-entry";
import { BulletList } from "@/components/ui/bullet-list";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { TagList } from "@/components/ui/tag-list";
import { experience } from "@/data/experience";
import { formatPeriod } from "@/lib/dates";
import { createPageMetadata } from "@/lib/metadata";

const title = "Work Experience";
const description = "Roles, responsibilities, and the systems I've owned.";

export const metadata = createPageMetadata({ title, description, path: "/experience" });

export default function ExperiencePage() {
  return (
    <Container className="space-y-12">
      <PageHeader title={title} description={description} />

      {experience.length === 0 ? (
        <PlaceholderNotice>Work experience is coming soon.</PlaceholderNotice>
      ) : (
        <div className="space-y-12">
          {experience.map((job) => (
            <TimelineEntry
              key={`${job.company}-${job.start}`}
              title={job.role}
              subtitle={job.company}
              period={formatPeriod(job.start, job.end)}
              location={job.location}
            >
              {job.summary ? <p>{job.summary}</p> : null}
              <BulletList items={job.highlights ?? []} />
              <TagList items={job.technologies ?? []} label="Technologies" />
            </TimelineEntry>
          ))}
        </div>
      )}
    </Container>
  );
}
