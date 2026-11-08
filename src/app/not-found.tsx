import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <Container className="space-y-6">
      <PageHeader title="Page not found" description="The page you're looking for doesn't exist." />
      <Link
        href="/"
        className="inline-block rounded-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        Back to home
      </Link>
    </Container>
  );
}
