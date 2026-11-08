import type { NextConfig } from "next";

/**
 * The site is fully static: every route is pre-rendered at build time and
 * emitted to `out/`, which can be served by any static host (Cloudflare
 * Workers static assets / Pages). See README → "Deployment".
 *
 * Static export forbids server-only features (Route Handlers that read the
 * request, cookies/headers, Server Actions, rewrites/redirects/headers config,
 * ISR, default image optimization). If one of those becomes necessary, remove
 * `output: "export"` and adopt the OpenNext Cloudflare adapter instead.
 */
const nextConfig: NextConfig = {
  output: "export",
  // Don't generate an AGENTS.md file in the project root during `next dev`.
  agentRules: false,
  // Emit /about/index.html rather than /about.html so clean URLs work on any
  // static host without rewrite rules.
  trailingSlash: true,
  images: {
    // The default next/image loader needs a server; static export requires
    // either this or a custom loader.
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
