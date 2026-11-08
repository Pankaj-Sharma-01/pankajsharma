import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <Container className="py-16 sm:py-24 space-y-6">
      <PageHeader
        eyebrow="Error 404 // Signal lost"
        title="Page not found"
        description="The page you're looking for doesn't exist."
      />
      <Link
        href="/"
        className="inline-block rounded-sm font-mono text-sm tracking-widest text-accent uppercase underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        &lt; Return to the city
      </Link>
    </Container>
  );
}
