import type { Book } from "@/types/content";

/**
 * Book reviews, shown in the order listed. Template:
 *
 * {
 *   title: "Book name",
 *   author: "Author",
 *   rating: 8,            // out of 10
 *   thoughts: "My thoughts on it.",
 * }
 */
export const books: readonly Book[] = [
  {
    title: "The Fountainhead",
    author: "Ayn Rand",
    rating: 10,
    thoughts: "Changes my way of life.",
  },
  {
    title: "Imperium",
    author: "Robert Harris",
    rating: 9,
    thoughts:
      "Love the way history has been turned into an adventure, couldn't get enough of it. Cicero is one fascinating man.",
  },
  {
    title: "1984",
    author: "George Orwell",
    rating: 8,
    thoughts:
      "Brought so much skepticism against every authority in my head, it got pretty daunting.",
  },
  {
    title: "Notes from the Underground",
    author: "Fyodor Dostoevsky",
    rating: 10,
    thoughts:
      "Scared me to my core. Don't know how, but it felt like Fyodor was in my mind the whole time.",
  },
];
