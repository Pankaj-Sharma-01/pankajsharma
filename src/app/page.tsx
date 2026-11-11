import type { Metadata } from "next";

import { CityExperience } from "@/components/city/city-experience";
import { Container } from "@/components/layout/container";
import { CityHero } from "@/components/sections/city-hero";
import { DistrictPanel } from "@/components/sections/district-panel";
import { FallsPanel } from "@/components/sections/falls-panel";
import { getDistricts } from "@/lib/districts";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * The home page is a drive through a city at sunrise. Every section of the
 * site is a landmark building on the route; its panel appears as the camera
 * pulls up to the entrance. The road ends at a cliff facing an endless waterfall. All content here is plain server-rendered HTML; the 3D city
 * is a progressive enhancement behind it.
 */
export default function HomePage() {
  const districts = getDistricts();
  const links = districts.map(({ id, number, label, href }) => ({ id, number, label, href }));

  return (
    <CityExperience districts={links}>
      <section
        id="district-entry"
        data-district
        className="pointer-events-none bg-gradient-to-r from-background/90 via-background/60 to-transparent"
      >
        <Container size="wide">
          <CityHero />
        </Container>
      </section>

      {districts.map((district, index) => (
        <section
          key={district.id}
          id={`district-${district.id}`}
          data-district
          className="pointer-events-none flex min-h-svh items-end pb-24 sm:pb-20"
        >
          {/* Panels sit at the screen edges so the landmark's entrance stays in view. */}
          <div className={`flex w-full px-5 sm:px-8 xl:px-12 ${index % 2 === 0 ? "justify-start" : "sm:justify-end"}`}>
            <DistrictPanel district={district} />
          </div>
        </section>
      ))}

      <section
        id="district-falls"
        data-district
        className="pointer-events-none flex min-h-svh items-end justify-center pb-24 sm:pb-20"
      >
        <Container size="wide" className="flex justify-center">
          <FallsPanel />
        </Container>
      </section>
    </CityExperience>
  );
}
