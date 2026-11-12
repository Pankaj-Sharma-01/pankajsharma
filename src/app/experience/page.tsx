import { Container } from "@/components/layout/container";
import { MissionLog } from "@/components/sections/mission-log";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { experience } from "@/data/experience";
import { formatDuration, formatPeriod, monthsBetween } from "@/lib/dates";
import { createPageMetadata } from "@/lib/metadata";

const title = "Work Experience";
const description = "Mission log: the roles I've held and the systems I've owned.";

export const metadata = createPageMetadata({ title, description, path: "/experience" });

export default function ExperiencePage() {
  const entries = experience.map((job) => {
    const months = monthsBetween(job.start, job.end);
    return {
      id: `${job.company}-${job.start}`,
      role: job.role,
      company: job.company,
      period: formatPeriod(job.start, job.end),
      location: job.location,
      months,
      // A running role's length would go stale between deploys, so it is not shown.
      duration: job.end ? formatDuration(months) : undefined,
      current: !job.end,
      summary: job.summary,
      highlights: job.highlights ?? [],
      technologies: job.technologies ?? [],
    };
  });

  return (
    <Container className="py-16 sm:py-24 space-y-12">
      <PageHeader
        sector="/experience"
        title={title}
        description={description}
        status={`${entries.length} log entries loaded.`}
      />
      {entries.length === 0 ? (
        <PlaceholderNotice>No log entries yet.</PlaceholderNotice>
      ) : (
        <MissionLog entries={entries} />
      )}
    </Container>
  );
}
