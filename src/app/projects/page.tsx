import { Container } from "@/components/layout/container";
import { BulletList } from "@/components/ui/bullet-list";
import { ExternalLink } from "@/components/ui/external-link";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { Section } from "@/components/ui/section";
import { TagList } from "@/components/ui/tag-list";
import { projects } from "@/data/projects";
import { createPageMetadata } from "@/lib/metadata";
import { sectorLabel } from "@/lib/sectors";
import type { Project, ProjectCategory } from "@/types/content";

const title = "Projects";
const description = "Production AI systems I've built and led, and things I've built for myself.";

export const metadata = createPageMetadata({ title, description, path: "/projects" });

const categories: readonly { id: ProjectCategory; title: string }[] = [
  { id: "production", title: "In production" },
  { id: "personal", title: "Personal & college" },
];

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="hud-frame hud-frame-interactive flex flex-col gap-4 p-5">
      <header className="space-y-1">
        {project.organization ? <p className="hud-label">{project.organization}</p> : null}
        <h3 className="text-lg font-semibold tracking-tight">
          {project.url ? <ExternalLink href={project.url}>{project.name}</ExternalLink> : project.name}
        </h3>
        {project.metric ? (
          <p className="flex flex-wrap items-baseline gap-x-2 pt-1">
            <span className="text-sunrise font-mono text-2xl font-bold">{project.metric.value}</span>
            <span className="hud-label">{project.metric.label}</span>
          </p>
        ) : null}
      </header>
      <p className="text-muted">{project.summary}</p>
      <BulletList items={project.details ?? []} />
      <div className="mt-auto">
        <TagList items={project.technologies ?? []} label="Technologies" />
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  return (
    <Container className="py-16 sm:py-24 space-y-14">
      <PageHeader eyebrow={sectorLabel("/projects")} title={title} description={description} />

      {projects.length === 0 ? (
        <PlaceholderNotice>Project case studies will be added here.</PlaceholderNotice>
      ) : (
        categories.map((category) => {
          const items = projects.filter((project) => project.category === category.id);
          if (items.length === 0) return null;
          return (
            <Section key={category.id} id={category.id} title={category.title}>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((project) => (
                  <ProjectCard key={project.name} project={project} />
                ))}
              </div>
            </Section>
          );
        })
      )}
    </Container>
  );
}
