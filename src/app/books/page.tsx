import { Container } from "@/components/layout/container";
import { BookShelf } from "@/components/sections/book-shelf";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { books } from "@/data/books";
import { createPageMetadata } from "@/lib/metadata";

const title = "Books";
const description = "Reading log: every book rated out of 10, with what it left behind.";

export const metadata = createPageMetadata({ title, description, path: "/books" });

export default function BooksPage() {
  return (
    <Container className="py-16 sm:py-24 space-y-12">
      <PageHeader
        sector="/books"
        title={title}
        description={description}
        status={`${books.length} files on the shelf.`}
      />
      {books.length === 0 ? <PlaceholderNotice>The shelf is empty for now.</PlaceholderNotice> : <BookShelf books={books} />}
    </Container>
  );
}
