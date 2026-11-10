import type { NavItem } from "@/types/site";

/** The site's sections, in order. Also drives the sitemap and the city's gates. */
export const mainNav: readonly NavItem[] = [
  {
    label: "About",
    href: "/about",
    description: "Who I am, what I build, and what I care about as an engineer.",
  },
  {
    label: "Experience",
    href: "/experience",
    description: "Roles, ownership, and the systems I've been responsible for.",
  },
  { label: "Education", href: "/education", description: "Where the foundations were laid." },
  {
    label: "Projects",
    href: "/projects",
    description: "Case studies in backend and production AI systems.",
  },
  {
    label: "Books",
    href: "/books",
    description: "Book reviews, rated out of 10, with what stayed with me.",
  },
  {
    label: "Thoughts",
    href: "/thoughts",
    description: "Short notes on system design, AI engineering, and leadership.",
  },
  { label: "Pictures", href: "/pictures", description: "Life in pictures, over the years." },
  {
    label: "Health",
    href: "/health",
    description: "Personal records, training, and staying active.",
  },
];
