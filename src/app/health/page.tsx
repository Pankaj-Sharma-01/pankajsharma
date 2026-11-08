import { Container } from "@/components/layout/container";
import { ExternalLink } from "@/components/ui/external-link";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { Section } from "@/components/ui/section";
import { personalRecords } from "@/data/health";
import { formatDate } from "@/lib/dates";
import { createPageMetadata } from "@/lib/metadata";

const title = "Health";
const description = "Training, personal records, and staying active.";

export const metadata = createPageMetadata({ title, description, path: "/health" });

function PersonalRecordsTable() {
  if (personalRecords.length === 0) {
    return <PlaceholderNotice>Personal records are coming soon.</PlaceholderNotice>;
  }

  return (
    // Horizontal scroll inside the wrapper keeps the page itself from
    // overflowing on narrow screens.
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Personal records</caption>
        <thead className="border-b border-border text-muted">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">Event</th>
            <th scope="col" className="py-2 pr-4 font-medium">Result</th>
            <th scope="col" className="py-2 pr-4 font-medium">Date</th>
            <th scope="col" className="py-2 font-medium">Where</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {personalRecords.map((record) => (
            <tr key={`${record.event}-${record.date}`}>
              <th scope="row" className="py-3 pr-4 font-medium">{record.event}</th>
              <td className="py-3 pr-4 tabular-nums">{record.result}</td>
              <td className="py-3 pr-4 whitespace-nowrap text-muted">
                <time dateTime={record.date}>{formatDate(record.date)}</time>
              </td>
              <td className="py-3 text-muted">
                {record.url ? (
                  <ExternalLink href={record.url}>{record.context ?? "Details"}</ExternalLink>
                ) : (
                  (record.context ?? "—")
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HealthPage() {
  return (
    <Container className="space-y-14">
      <PageHeader title={title} description={description} />

      <Section id="records" title="Personal records">
        <PersonalRecordsTable />
      </Section>

      <Section id="activities" title="Recent activities">
        <PlaceholderNotice>Activity tracking is coming soon.</PlaceholderNotice>
      </Section>
    </Container>
  );
}
