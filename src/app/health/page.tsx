import { Container } from "@/components/layout/container";
import { ExternalLink } from "@/components/ui/external-link";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { Section } from "@/components/ui/section";
import { personalRecords } from "@/data/health";
import { formatDate } from "@/lib/dates";
import { createPageMetadata } from "@/lib/metadata";
import { sectorLabel } from "@/lib/sectors";
import type { PersonalRecord, PersonalRecordCategory } from "@/types/content";

const title = "Health";
const description = "Training, personal records, and staying active.";

export const metadata = createPageMetadata({ title, description, path: "/health" });

const categories: readonly { id: PersonalRecordCategory; title: string }[] = [
  { id: "running", title: "Running" },
  { id: "strength", title: "Strength" },
];

function RecordTile({ record }: { record: PersonalRecord }) {
  const details = [record.context, record.date ? formatDate(record.date) : undefined].filter(
    (detail): detail is string => Boolean(detail),
  );

  return (
    <div className="hud-frame hud-frame-interactive group flex flex-col gap-2 p-4">
      <dt className="hud-label">{record.event}</dt>
      <dd className="text-sunrise w-fit font-mono text-2xl font-bold tracking-tight tabular-nums transition-transform group-hover:translate-x-1 sm:text-3xl">
        {record.result}
      </dd>
      {details.length > 0 ? (
        <dd className="text-xs text-muted">
          {record.url ? (
            <ExternalLink href={record.url}>{details.join(" · ")}</ExternalLink>
          ) : (
            details.join(" · ")
          )}
        </dd>
      ) : null}
    </div>
  );
}

function PersonalRecords() {
  if (personalRecords.length === 0) {
    return <PlaceholderNotice>Personal records are coming soon.</PlaceholderNotice>;
  }

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const records = personalRecords.filter((record) => record.category === category.id);
        if (records.length === 0) return null;
        return (
          <div key={category.id} className="space-y-3">
            <h3 className="hud-label">{category.title}</h3>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {records.map((record) => (
                <RecordTile key={record.event} record={record} />
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

export default function HealthPage() {
  return (
    <Container className="py-16 sm:py-24 space-y-14">
      <PageHeader eyebrow={sectorLabel("/health")} title={title} description={description} />

      <Section id="records" title="Personal records">
        <PersonalRecords />
      </Section>

      <Section id="activities" title="Recent activities">
        <PlaceholderNotice>Activity tracking is coming soon.</PlaceholderNotice>
      </Section>
    </Container>
  );
}
