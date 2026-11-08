import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { Hero } from "@/components/sections/hero";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <Container>
      <Hero />
    </Container>
  );
}
