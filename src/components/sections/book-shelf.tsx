"use client";

import { useState } from "react";

import type { Book } from "@/types/content";

type BookShelfProps = {
  books: readonly Book[];
};

type Order = "shelf" | "rating";

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

/** The reading log: every review, with a switch between shelf order and best first. */
export function BookShelf({ books }: BookShelfProps) {
  const [order, setOrder] = useState<Order>("shelf");
  const sorted = order === "rating" ? [...books].sort((a, b) => b.rating - a.rating) : books;
  const average = books.reduce((total, book) => total + book.rating, 0) / books.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <dl className="flex gap-6">
          <div>
            <dt className="hud-label">Files</dt>
            <dd className="text-glow-sun font-mono text-xl font-bold text-sun">{books.length}</dd>
          </div>
          <div>
            <dt className="hud-label">Average rating</dt>
            <dd className="text-glow-sun font-mono text-xl font-bold text-sun">{average.toFixed(1)}</dd>
          </div>
        </dl>
        <div role="group" aria-label="Sort books" className="flex gap-2">
          {(
            [
              ["shelf", "Shelf order"],
              ["rating", "Top rated"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={order === id}
              onClick={() => setOrder(id)}
              className={`border px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                order === id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-surface text-muted hover:border-accent/60 hover:text-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {sorted.map((book, index) => (
          <article key={`${book.title}-${book.author}`} className="hud-frame hud-frame-interactive space-y-4 p-5 sm:p-6">
            <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <div className="space-y-1">
                <p className="hud-label text-hot">File {String(index + 1).padStart(2, "0")}</p>
                <h2 className="font-display text-xl font-bold tracking-wide uppercase">{book.title}</h2>
                <p className="hud-label">by {book.author}</p>
              </div>
              <RatingMeter rating={book.rating} />
            </header>
            <blockquote className="border-l-2 border-hot/60 pl-4 text-lg text-foreground/85">
              <p>{book.thoughts}</p>
            </blockquote>
          </article>
        ))}
      </div>
    </div>
  );
}
