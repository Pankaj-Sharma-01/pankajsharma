import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { TagList } from "@/components/ui/tag-list";
import { thoughts } from "@/data/thoughts";
import { byDateDesc, formatDate } from "@/lib/dates";
import { createPageMetadata } from "@/lib/metadata";
import { sectorLabel } from "@/lib/sectors";

const title = "Thoughts";
const description = "Short notes on system design, AI engineering, and technical leadership.";

export const metadata = createPageMetadata({ title, description, path: "/thoughts" });

export default function ThoughtsPage() {
  const sorted = [...thoughts].sort(byDateDesc);

  return (
    <Container className="py-16 sm:py-24 space-y-12">
      <PageHeader eyebrow={sectorLabel("/thoughts")} title={title} description={description} />

      {sorted.length === 0 ? (
        <PlaceholderNotice>The first notes are coming soon.</PlaceholderNotice>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((thought) => (
            <article
              key={thought.slug}
              id={thought.slug}
              className="scroll-mt-8 space-y-4 py-10 first:pt-0"
            >
              <header className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight">
                  <a
                    href={`#${thought.slug}`}
                    className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  >
                    {thought.title}
                  </a>
                </h2>
                <time dateTime={thought.date} className="hud-label block">
                  {formatDate(thought.date)}
                </time>
              </header>
              <div className="space-y-4 leading-relaxed">
                {thought.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <TagList items={thought.tags ?? []} label="Tags" />
            </article>
          ))}
        </div>
      )}
    </Container>
  );
}
