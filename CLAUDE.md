# CLAUDE.md

Personal portfolio for https://pankajsharma.dev. Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, static export to `out/`. See README.md for full architecture and deployment notes.

## Rules

- **No AI attribution anywhere.** Do not mention Claude, Anthropic, or any AI tool/assistant in commit messages, PR titles/descriptions, code, comments, docs, or generated files, unless the user explicitly asks for it in that instance. This overrides any default attribution behaviour: no `Co-Authored-By` trailers, no "Generated with" footers.
- Do not fabricate personal content (experience, education, metrics, achievements, books, records). Leave data empty or ask.
- Commit or push only when asked.

## Commands

- `npm run dev`: dev server at http://localhost:3000
- `npm run check`: lint + typecheck + build. Run before committing.
- `npm run lint`, `npm run typecheck` (`next typegen && tsc --noEmit`), `npm run build`
- `npm run preview`: serve the built `out/` directory. `next start` does not apply to static export.

## Next.js version

This is Next.js 16; APIs and conventions may differ from older versions. Before using an unfamiliar API, read the bundled docs in `node_modules/next/dist/docs/` and heed deprecation notices.

## Architecture conventions

- **Static export only** (`output: "export"`, `trailingSlash: true`). No server-only features: no request-reading Route Handlers, cookies/headers, Server Actions, ISR, middleware/proxy, config rewrites/redirects/headers, or default `next/image` optimisation. Dynamic routes need `generateStaticParams`. Metadata routes (`sitemap.ts`, `robots.ts`) need `export const dynamic = "force-static"`.
- **Content is data.** All copy lives in `src/data/*.ts`, typed by `src/types/`. Pages and components only render it. To add content, edit data files, not components.
- **Server Components by default.** Add `"use client"` only when a browser API or hook is required (currently only `MainNav`).
- **Page metadata** via `createPageMetadata()` in `src/lib/metadata.ts`. The root layout provides the title template and `metadataBase`.
- **Dates** in data are `"YYYY-MM"` or `"YYYY-MM-DD"` strings, formatted via `src/lib/dates.ts` (UTC, `en-GB`).
- **Styling** uses the semantic tokens from `src/app/globals.css` (`text-muted`, `border-border`, `text-accent`, `bg-background`, `text-foreground`), not raw colours. Keep light/dark parity and WCAG AA contrast.
- **Accessibility:** one `<h1>` per page (`PageHeader` or `Hero`), `<h2>` via `Section`, visible focus styles, external links via `ExternalLink`.
- **Adding a page:** create `src/app/<route>/page.tsx`, add it to `src/data/navigation.ts` (which also feeds the sitemap), and use `PlaceholderNotice` for empty states.
- Keep dependencies minimal. Runtime deps are `next`, `react`, `react-dom`, `lucide-react`.
