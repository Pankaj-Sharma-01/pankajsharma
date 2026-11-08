import { about } from "@/data/about";
import { books } from "@/data/books";
import { education } from "@/data/education";
import { experience } from "@/data/experience";
import { personalRecords } from "@/data/health";
import { mainNav } from "@/data/navigation";
import { pictures } from "@/data/pictures";
import { projects } from "@/data/projects";
import { siteConfig } from "@/data/site";
import { thoughts } from "@/data/thoughts";
import { byDateDesc, formatDate } from "@/lib/dates";
import { sectorNumber } from "@/lib/sectors";
import type { NavItem } from "@/types/site";

export type DistrictStat = {
  label: string;
  value: string;
};

/** One section of the site, as presented in the home page city. */
export type District = {
  /** Used for the `#district-<id>` anchor. */
  id: string;
  /** "01".."08", matching the nav order. */
  number: string;
  label: string;
  href: NavItem["href"];
  tagline: string;
  /** Live figures from the content files. Empty means nothing published yet. */
  stats: DistrictStat[];
};

const taglines: Record<NavItem["href"], string> = {
  "/about": "Who I am, what I build, and what I care about as an engineer.",
  "/experience": "Roles, ownership, and the systems I've been responsible for.",
  "/education": "Where the foundations were laid.",
  "/projects": "Case studies in backend and production AI systems.",
  "/books": "Book reviews, rated out of 10, with what stayed with me.",
  "/thoughts": "Short notes on system design, AI engineering, and leadership.",
  "/pictures": "Life in pictures, over the years.",
  "/health": "Personal records, training, and staying active.",
};

function count(value: number, singular: string, plural = `${singular}s`): DistrictStat {
  return { label: value === 1 ? singular : plural, value: String(value) };
}

/** Builds the dashboard figures for each section from the content files. */
function statsFor(href: NavItem["href"]): DistrictStat[] {
  switch (href) {
    case "/about":
      return [
        { label: "Role", value: siteConfig.role },
        count(about.focusAreas.length, "Focus area"),
      ];
    case "/experience": {
      if (experience.length === 0) return [];
      const current = experience.find((job) => !job.end);
      return [
        count(experience.length, "Role"),
        ...(current ? [{ label: "Now", value: current.company }] : []),
      ];
    }
    case "/education": {
      const latest = education[0];
      if (!latest) return [];
      return [
        { label: "Degree", value: latest.qualification },
        { label: "From", value: latest.shortName ?? latest.institution },
      ];
    }
    case "/projects": {
      if (projects.length === 0) return [];
      return [
        count(projects.length, "Project"),
        { label: "In production", value: String(projects.filter((project) => project.category === "production").length) },
      ];
    }
    case "/books": {
      if (books.length === 0) return [];
      return [
        count(books.length, "Review"),
        { label: "Top rated", value: [...books].sort((a, b) => b.rating - a.rating)[0].title },
      ];
    }
    case "/thoughts": {
      if (thoughts.length === 0) return [];
      const latest = [...thoughts].sort(byDateDesc)[0];
      return [count(thoughts.length, "Note"), { label: "Latest", value: formatDate(latest.date) }];
    }
    case "/pictures": {
      if (pictures.length === 0) return [];
      const years = pictures.map((picture) => picture.date.slice(0, 4)).sort();
      const span = years[0] === years.at(-1) ? years[0] : `${years[0]}–${years.at(-1)}`;
      return [count(pictures.length, "Photo"), { label: "Years", value: span }];
    }
    case "/health":
      return personalRecords
        .filter((record) => record.category === "running")
        .slice(0, 3)
        .map((record) => ({ label: record.event, value: record.result }));
    default:
      return [];
  }
}

export function getDistricts(): District[] {
  return mainNav.map((item) => ({
    id: item.href.slice(1),
    number: sectorNumber(item.href),
    label: item.label,
    href: item.href,
    tagline: taglines[item.href] ?? "",
    stats: statsFor(item.href),
  }));
}
