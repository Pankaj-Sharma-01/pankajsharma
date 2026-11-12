import { Container } from "@/components/layout/container";
import { TimelineEntry } from "@/components/sections/timeline-entry";
import { BulletList } from "@/components/ui/bullet-list";
import { ConsoleWindow } from "@/components/ui/console-window";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { Section } from "@/components/ui/section";
import { academicScores, education } from "@/data/education";
import { formatPeriod } from "@/lib/dates";
import { createPageMetadata } from "@/lib/metadata";

const title = "Education";
const description = "Origin files: where the foundations were laid.";

export const metadata = createPageMetadata({ title, description, path: "/education" });

export default function EducationPage() {
  return (
    <Container className="py-16 sm:py-24 space-y-12">
      <PageHeader
        sector="/education"
        title={title}
        description={description}
        status={`${education.length} records recovered. integrity verified.`}
      />

      {education.length === 0 ? (
        <PlaceholderNotice>No records on file yet.</PlaceholderNotice>
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

      {academicScores.length > 0 ? (
        <Section id="scores" title="Benchmarks">
          <ConsoleWindow title="scores.dat" status={`${academicScores.length} results`}>
            <ul className="space-y-6">
              {academicScores.map((score) => {
                const percent = (score.score / score.outOf) * 100;
                return (
                  <li key={score.label} className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <p className="font-display text-sm font-bold tracking-wide uppercase">
                        {score.label}
                        {score.detail ? <span className="hud-label ml-3">{score.detail}</span> : null}
                      </p>
                      <p className="text-sunrise font-mono text-xl font-bold tabular-nums">{score.display}</p>
                    </div>
                    <div
                      role="meter"
                      aria-label={`${score.label}: ${score.display}`}
                      aria-valuemin={0}
                      aria-valuemax={score.outOf}
                      aria-valuenow={score.score}
                      className="h-2 bg-border"
                    >
                      <div
                        className="meter-fill h-full bg-gradient-to-r from-hot to-sun shadow-[0_0_10px_var(--hot-glow)]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {score.note ? <p className="text-sm text-muted">{score.note}</p> : null}
                  </li>
                );
              })}
            </ul>
          </ConsoleWindow>
        </Section>
      ) : null}
    </Container>
  );
}
