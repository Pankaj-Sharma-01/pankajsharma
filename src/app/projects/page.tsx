import { Container } from "@/components/layout/container";
import { ProjectExplorer } from "@/components/sections/project-explorer";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { projects } from "@/data/projects";
import { createPageMetadata } from "@/lib/metadata";

const title = "Projects";
const description = "The build archive: production AI systems, and things I made for myself.";

export const metadata = createPageMetadata({ title, description, path: "/projects" });

export default function ProjectsPage() {
  const live = projects.filter((project) => project.category === "production").length;

  return (
    <Container className="py-16 sm:py-24 space-y-12">
      <PageHeader
        sector="/projects"
        title={title}
        description={description}
        status={`${projects.length} builds indexed. ${live} live in production.`}
      />
      {projects.length === 0 ? (
        <PlaceholderNotice>No builds indexed yet.</PlaceholderNotice>
      ) : (
        <ProjectExplorer projects={projects} />
      )}
    </Container>
  );
}
