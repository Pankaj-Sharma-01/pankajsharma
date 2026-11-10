import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderNotice } from "@/components/ui/placeholder-notice";
import { books } from "@/data/books";
import { createPageMetadata } from "@/lib/metadata";
import type { Book } from "@/types/content";

const title = "Books";
const description = "Books I've read, rated out of 10, with what stayed with me.";

export const metadata = createPageMetadata({ title, description, path: "/books" });

/** Ten-segment meter; the text rating is what assistive tech reads. */
function RatingMeter({ rating }: { rating: Book["rating"] }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className={`h-3 w-1.5 -skew-x-12 ${
              index < rating ? "bg-gradient-to-t from-hot to-sun shadow-[0_0_6px_var(--hot-glow)]" : "bg-border"
            }`}
          />
        ))}
      </span>
      <p className="font-mono text-sm">
        <span className="text-sunrise text-lg font-bold">{rating}</span>
        <span className="text-muted">/10</span>
        <span className="sr-only"> rating</span>
      </p>
    </div>
  );
}

function BookReview({ book }: { book: Book }) {
  return (
    <article className="reveal hud-frame hud-frame-interactive space-y-4 p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold tracking-wide uppercase">{book.title}</h2>
          <p className="hud-label">by {book.author}</p>
        </div>
        <RatingMeter rating={book.rating} />
      </header>
      <blockquote className="border-l-2 border-hot/60 pl-4 text-lg text-muted">
        <p>{book.thoughts}</p>
      </blockquote>
    </article>
  );
}

export default function BooksPage() {
  return (
    <Container className="py-16 sm:py-24 space-y-12">
      <PageHeader sector="/books" title={title} description={description} />

      {books.length === 0 ? (
        <PlaceholderNotice>Book reviews are coming soon.</PlaceholderNotice>
      ) : (
        <div className="space-y-5">
          {books.map((book) => (
            <BookReview key={`${book.title}-${book.author}`} book={book} />
          ))}
        </div>
      )}
    </Container>
  );
}
