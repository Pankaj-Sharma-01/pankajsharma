import type { Metadata } from "next";

import { siteConfig } from "@/data/site";
import { withTrailingSlash } from "@/lib/paths";

type PageMetadataInput = {
  title: string;
  description: string;
  /** Route path, e.g. "/about". Used for the canonical URL. */
  path: `/${string}`;
};

/** Open Graph fields every page shares. Next.js merges `openGraph` shallowly,
 * so pages must restate these rather than rely on the root layout. */
export const baseOpenGraph = {
  type: "website",
  locale: "en_US",
  siteName: siteConfig.name,
} as const;

/**
 * Builds consistent per-page metadata. The root layout supplies `metadataBase`
 * and the title template, so `title` here is just the page name.
 */
export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataInput): Metadata {
  const url = withTrailingSlash(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { ...baseOpenGraph, title, description, url },
  };
}
