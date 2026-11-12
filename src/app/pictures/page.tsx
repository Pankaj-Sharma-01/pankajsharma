import { Container } from "@/components/layout/container";
import { PictureTimeline } from "@/components/sections/picture-timeline";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { pictures } from "@/data/pictures";
import { createPageMetadata } from "@/lib/metadata";
import { groupPicturesByYear } from "@/lib/pictures";

const title = "Pictures";
const description = "Memory bank: life in frames, year by year.";

export const metadata = createPageMetadata({ title, description, path: "/pictures" });

export default function PicturesPage() {
  const years = groupPicturesByYear(pictures);

  return (
    <Container size="wide" className="py-16 sm:py-24 space-y-14">
      <PageHeader
        sector="/pictures"
        title={title}
        description={description}
        status={`${pictures.length} frames recovered. select one to enlarge.`}
      />
      {years.length === 0 ? <PlaceholderNotice>No frames recovered yet.</PlaceholderNotice> : <PictureTimeline years={years} />}
    </Container>
  );
}
