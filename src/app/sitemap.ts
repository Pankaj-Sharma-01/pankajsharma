import type { MetadataRoute } from "next";

import { mainNav } from "@/data/navigation";
import { siteConfig } from "@/data/site";
import { withTrailingSlash } from "@/lib/paths";

// Required for static export: generate sitemap.xml once at build time.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", ...mainNav.map((item) => item.href)];
  return paths.map((path) => ({ url: `${siteConfig.url}${withTrailingSlash(path)}` }));
}
