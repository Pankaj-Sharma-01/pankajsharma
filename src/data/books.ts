import type { Book } from "@/types/content";

/**
 * Order within each status is preserved. Example entry:
 *
 * {
 *   title: "Book title",
 *   author: "Author name",
 *   status: "read",          // "reading" | "read" | "to-read"
 *   finished: "2025-02",
 *   note: "What stuck with you.",
 * }
 */
export const books: readonly Book[] = [];
