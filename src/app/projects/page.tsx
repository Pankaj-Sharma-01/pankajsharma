import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { createPageMetadata } from "@/lib/metadata";

const title = "Projects";
const description = "Selected work across backend engineering and production AI systems.";

export const metadata = createPageMetadata({ title, description, path: "/projects" });

export default function ProjectsPage() {
  return (
    <Container className="space-y-10">
      <PageHeader title={title} description={description} />
      <PlaceholderNotice>Project case studies will be added here.</PlaceholderNotice>
    </Container>
  );
}
