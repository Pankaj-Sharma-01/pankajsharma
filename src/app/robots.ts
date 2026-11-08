import type { MetadataRoute } from "next";

import { siteConfig } from "@/data/site";

// Required for static export: generate robots.txt once at build time.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
