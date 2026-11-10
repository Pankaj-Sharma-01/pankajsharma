import { Container } from "@/components/layout/container";
import { PhotoCollage } from "@/components/sections/photo-collage";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { Section } from "@/components/ui/section";
import { pictures } from "@/data/pictures";
import { createPageMetadata } from "@/lib/metadata";
import { groupPicturesByYear } from "@/lib/pictures";

const title = "Pictures";
const description = "Life in pictures, over the years.";

export const metadata = createPageMetadata({ title, description, path: "/pictures" });

export default function PicturesPage() {
  const years = groupPicturesByYear(pictures);

  return (
    <Container size="wide" className="py-16 sm:py-24 space-y-14">
      <PageHeader sector="/pictures" title={title} description={description} />

      {years.length === 0 ? (
        <PlaceholderNotice>Pictures are coming soon.</PlaceholderNotice>
      ) : (
        years.map(({ year, pictures: yearPictures }) => (
          <Section key={year} id={`year-${year}`} title={year}>
            <PhotoCollage pictures={yearPictures} />
          </Section>
        ))
      )}
    </Container>
  );
}
