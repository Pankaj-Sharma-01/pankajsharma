import type { SiteConfig } from "@/types/site";

/**
 * Single source of truth for identity and profile links.
 * Edit content here; components only render it.
 */
export const siteConfig: SiteConfig = {
  name: "Pankaj Sharma",
  role: "Senior AI Engineer",
  url: "https://pankajsharma.dev",
  description:
    "Pankaj Sharma is a Senior AI Engineer at Lyzr AI, building production document extraction, RAG, and agentic AI systems.",
  // Opening lines on the home page. Edit freely.
  intro:
    "I build the machinery behind AI products: LLM applications, retrieval pipelines, and the backend systems that keep them standing in production. This is my corner of the grid: the work, the thinking behind it, and what I'm still learning.",
  links: {
    github: {
      label: "GitHub",
      href: "https://github.com/Pankaj-Sharma-01",
    },
    linkedin: {
      label: "LinkedIn",
      // TODO(pankaj): Replace with your LinkedIn profile URL.
      href: "https://www.linkedin.com/",
    },
    x: {
      label: "X",
      href: "https://x.com/pankajsharma19_",
    },
  },
};
