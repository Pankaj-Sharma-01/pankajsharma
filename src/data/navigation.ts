import type { NavItem } from "@/types/site";

/** The site's sections, in order. Also drives the sitemap and the city's landmarks. */
export const mainNav: readonly NavItem[] = [
  {
    label: "About",
    href: "/about",
    description: "The person behind the terminal: what I build, and what I care about.",
  },
  {
    label: "Experience",
    href: "/experience",
    description: "Mission log: roles held, systems owned, results shipped.",
  },
  { label: "Education", href: "/education", description: "Origin files: where the foundations were laid." },
  {
    label: "Projects",
    href: "/projects",
    description: "The build archive: production AI systems and side experiments.",
  },
  {
    label: "Books",
    href: "/books",
    description: "Reading log: every book rated out of 10, with what it left behind.",
  },
  {
    label: "Thoughts",
    href: "/thoughts",
    description: "Short transmissions on system design, AI engineering, and leadership.",
  },
  { label: "Pictures", href: "/pictures", description: "Memory bank: life in frames, year by year." },
  {
    label: "Health",
    href: "/health",
    description: "Body telemetry: race times and the pace behind them.",
  },
];
