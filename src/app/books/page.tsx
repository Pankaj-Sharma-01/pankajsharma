import { Container } from "@/components/layout/container";
import { ExternalLink } from "@/components/ui/external-link";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { Section } from "@/components/ui/section";
import { books } from "@/data/books";
import { formatYearMonth } from "@/lib/dates";
import { createPageMetadata } from "@/lib/metadata";
import type { Book, BookStatus } from "@/types/content";

const title = "Books";
const description = "What I'm reading, what I've read, and what stayed with me.";

export const metadata = createPageMetadata({ title, description, path: "/books" });

const shelves: readonly { status: BookStatus; title: string }[] = [
  { status: "reading", title: "Currently reading" },
  { status: "read", title: "Read" },
  { status: "to-read", title: "Want to read" },
];

function BookItem({ book }: { book: Book }) {
  return (
    <li className="space-y-1">
      <p>
        {book.url ? (
          <ExternalLink href={book.url} className="font-medium">
            {book.title}
          </ExternalLink>
        ) : (
          <cite className="font-medium not-italic">{book.title}</cite>
        )}{" "}
        <span className="text-muted">by {book.author}</span>
      </p>
      {book.finished ? (
        <p className="text-sm text-muted">Finished {formatYearMonth(book.finished)}</p>
      ) : null}
      {book.note ? <p className="text-muted">{book.note}</p> : null}
    </li>
  );
}

export default function BooksPage() {
  return (
    <Container className="space-y-12">
      <PageHeader title={title} description={description} />

      {books.length === 0 ? (
        <PlaceholderNotice>The reading list is coming soon.</PlaceholderNotice>
      ) : (
        shelves.map((shelf) => {
          const shelfBooks = books.filter((book) => book.status === shelf.status);
          if (shelfBooks.length === 0) return null;
          return (
            <Section key={shelf.status} id={shelf.status} title={shelf.title}>
              <ul className="space-y-5">
                {shelfBooks.map((book) => (
                  <BookItem key={`${book.title}-${book.author}`} book={book} />
                ))}
              </ul>
            </Section>
          );
        })
      )}
    </Container>
  );
}
