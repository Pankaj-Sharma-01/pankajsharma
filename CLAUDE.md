# CLAUDE.md

Personal portfolio for https://pankajsharma.dev. Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, static export to `out/`. See README.md for full architecture and deployment notes.

## Rules

- **No AI attribution anywhere.** Do not mention Claude, Anthropic, or any AI tool/assistant in commit messages, PR titles/descriptions, code, comments, docs, or generated files, unless the user explicitly asks for it in that instance. This overrides any default attribution behaviour: no `Co-Authored-By` trailers, no "Generated with" footers.
- Do not fabricate personal content (experience, education, metrics, achievements, books, records). Leave data empty or ask.
- Commit or push only when asked.

## Commands

- `npm run dev`: dev server at http://localhost:3000
- `npm run check`: lint + typecheck + build. Run before committing.
- `npm run lint`, `npm run typecheck` (`next typegen && tsc --noEmit`), `npm run build` (runs `check:pictures` first)
- `npm run preview`: serve the built `out/` directory. `next start` does not apply to static export.

## Next.js version

This is Next.js 16; APIs and conventions may differ from older versions. Before using an unfamiliar API, read the bundled docs in `node_modules/next/dist/docs/` and heed deprecation notices.

## Architecture conventions

- **Static export only** (`output: "export"`, `trailingSlash: true`). No server-only features: no request-reading Route Handlers, cookies/headers, Server Actions, ISR, middleware/proxy, config rewrites/redirects/headers, or default `next/image` optimisation. Dynamic routes need `generateStaticParams`. Metadata routes (`sitemap.ts`, `robots.ts`) need `export const dynamic = "force-static"`.
- **Content is data.** All copy lives in `src/data/*.ts`, typed by `src/types/`. Pages and components only render it. To add content, edit data files, not components.
- **Server Components by default.** Add `"use client"` only when a browser API or hook is required (currently `MainNav` and `src/components/city/`).
- **Home page city** (`src/components/city/`): `city-scene.ts` is framework-free three.js, dynamically imported by `city-canvas.tsx`. It wires together `scene/` (`buildings.ts`, `landmarks.ts`, `signs.ts`, `road.ts`, `falls.ts`, `sky.ts`, `air.ts`, `particles.ts`, `post.ts`). `route.ts` (pure, no three.js) defines the journey: a serpentine where each nav item is a landmark at a corner that the camera drives into and turns inside; the 3D scene and `city-minimap.tsx` both use it. Every stage covers the same distance, so scroll progress maps linearly onto the route. `city-experience.tsx` maps scroll position over the `[data-district]` sections to progress and renders the HUD. Stops are: hero, one per nav item, then the falls (`#district-falls`). Each street and landmark is a group in its own local coordinates (x across, -z along the direction of travel); only those near the camera are drawn. **All scene tunables go in `city-config.ts`**, never as literals in the modules. The page content must stay fully usable without the canvas (reduced motion, no WebGL).
- **Page metadata** via `createPageMetadata()` in `src/lib/metadata.ts`. The root layout provides the title template and `metadataBase`.
- **Dates** in data are `"YYYY-MM"` or `"YYYY-MM-DD"` strings, formatted via `src/lib/dates.ts` (UTC, `en-GB`).
- **Styling** is a dark-only cyberpunk sunrise theme. Use the semantic tokens from `src/app/globals.css`, never raw colours: `accent` (cyan, interactive), `hot` (pink, labels/highlights), `sun` (amber, data values), `ultra` (violet, decorative only, not for text), plus `background`, `foreground`, `muted`, `border`. Reuse the utilities there (`hud-frame`, `hud-label`, `glitch`, `text-sunrise`, `text-glow*`). Keep WCAG AA contrast and honour `prefers-reduced-motion`.
- **Accessibility:** one `<h1>` per page (`PageHeader` or `Hero`), `<h2>` via `Section`, visible focus styles, external links via `ExternalLink`.
- **Adding a page:** create `src/app/<route>/page.tsx`, add it to `src/data/navigation.ts` (which also feeds the sitemap), and use `PlaceholderNotice` for empty states.
- **Pictures** live in `src/assets/pictures/` and are statically imported in `src/data/pictures.ts` (for dimensions and blur placeholders). `scripts/check-pictures.mjs` runs before every build and fails on GPS EXIF data or HEIC files. Never bypass it.
- **Sector pages are interactive but complete without interaction.** Each page pairs a server page (`src/app/<route>/page.tsx`) with a client component in `src/components/sections/` (terminal, mission log, project filters, book sorting, photo viewer, run telemetry). All content must be in the initial HTML; interaction only filters, sorts, expands, or converts it. Derived figures (pace, durations, averages) are computed from the data, never typed in.
- **Voice:** interface copy (page descriptions, status lines, empty states, labels) is terse, console-flavoured English. The owner's own words and facts (book thoughts, work highlights, records) are never reworded without being asked.
- **Navigation:** `src/data/navigation.ts` is the single list of sections (label, href, description). It feeds the header tabs, the city map dialog (`sector-menu.tsx`), the prev/next pager (`sector-pager.tsx`), the home page gates, and the sitemap. Section icons are mapped in `src/components/ui/sector-icon.tsx`.
- **City art is original.** Buildings, signs, and adverts are generated in code with invented names. Do not add third-party 3D models, brand names, or artwork from existing games, shows, or asset kits.
- Keep dependencies minimal. Runtime deps are `next`, `react`, `react-dom`, `lucide-react`, `three`.
