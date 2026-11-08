export type NavItem = {
  label: string;
  href: `/${string}`;
};

export type ExternalLink = {
  label: string;
  href: string;
};

export type SiteConfig = {
  name: string;
  role: string;
  /** Canonical production origin, without a trailing slash. */
  url: string;
  description: string;
  intro: string;
  links: {
    github: ExternalLink;
    linkedin: ExternalLink;
    x: ExternalLink;
  };
};
