import type { SiteConfig } from "@/types/site";

/**
 * Single source of truth for identity and profile links.
 * Edit content here; components only render it.
 */
export const siteConfig: SiteConfig = {
  name: "Pankaj Sharma",
  role: "AI Engineer",
  url: "https://pankajsharma.dev",
  description:
    "Pankaj Sharma is an AI Engineer working on backend systems, LLM applications, RAG, agentic AI, and production AI infrastructure.",
  // TODO(pankaj): Replace with your own introduction.
  intro:
    "I build backend and AI systems — LLM applications, retrieval pipelines, and the infrastructure that keeps them reliable in production. This site is where I share my work, how I approach engineering problems, and what I'm learning along the way.",
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
  },
};
