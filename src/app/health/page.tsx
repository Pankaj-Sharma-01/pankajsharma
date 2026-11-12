import { Container } from "@/components/layout/container";
import { RunTelemetry } from "@/components/sections/run-telemetry";
import { ConsoleWindow } from "@/components/ui/console-window";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { Section } from "@/components/ui/section";
import { personalRecords } from "@/data/health";
import { createPageMetadata } from "@/lib/metadata";

const title = "Health";
const description = "Body telemetry: race times and the pace behind them.";

export const metadata = createPageMetadata({ title, description, path: "/health" });

export default function HealthPage() {
  const running = personalRecords.filter((record) => record.category === "running");

  return (
    <Container className="py-16 sm:py-24 space-y-14">
      <PageHeader
        sector="/health"
        title={title}
        description={description}
        status={`${personalRecords.length} personal bests on record.`}
      />

      <Section id="records" title="Personal bests">
        {running.length === 0 ? (
          <PlaceholderNotice>No records logged yet.</PlaceholderNotice>
        ) : (
          <RunTelemetry records={running} />
        )}
      </Section>

      <Section id="activities" title="Activity feed">
        <ConsoleWindow title="activity.log" status="Offline">
          <p className="font-mono text-sm text-muted">
            <span aria-hidden="true" className="text-hot">
              &gt;{" "}
            </span>
            no uplink yet. live training data will stream here
            <span aria-hidden="true" className="caret text-accent">
              _
            </span>
          </p>
        </ConsoleWindow>
      </Section>
    </Container>
  );
}
