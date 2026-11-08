# pankajsharma.dev

Source for **[pankajsharma.dev](https://pankajsharma.dev)**, the personal engineering portfolio of Pankaj Sharma, an AI Engineer.

Repository: [github.com/Pankaj-Sharma-01/pankajsharma](https://github.com/Pankaj-Sharma-01/pankajsharma)

## What this site is for

The site is meant to go beyond a resume and show how I think and work as an engineer:

- **About**: background, focus areas, and engineering interests.
- **Work Experience**: roles, ownership, and the systems I've been responsible for.
- **Education**: formal education and qualifications.
- **Projects**: case studies in backend engineering, LLM applications, RAG, agentic AI, OCR pipelines, and production AI systems.
- **Books**: what I'm reading and what stayed with me.
- **Thoughts**: short notes on system design, architecture, AI engineering, and technical leadership.
- **Health**: personal records and training.

## Tech stack

| Concern    | Choice                                        |
| ---------- | --------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org) (App Router) |
| UI         | React 19                                      |
| Language   | TypeScript (`strict: true`)                   |
| Styling    | Tailwind CSS v4                               |
| Icons      | [Lucide React](https://lucide.dev)            |
| Linting    | ESLint 9 with `eslint-config-next`            |
| Fonts      | Geist, self-hosted at build time by `next/font` |
| Output     | Static HTML export (`out/`)                   |
| Hosting    | Cloudflare (planned, see [Deployment](#deployment)) |

Runtime dependencies are kept to `next`, `react`, `react-dom`, and `lucide-react`.

## Project structure

```text
.
├── public/                  # Served as-is from the site root
│   ├── icons/
│   ├── images/
│   └── resume/
├── src/
│   ├── app/                 # Routes (App Router). Thin: compose components and data.
│   │   ├── layout.tsx       # Root layout: fonts, global metadata, header/footer, skip link
│   │   ├── page.tsx         # Home
│   │   ├── about/  experience/  education/  projects/
│   │   ├── books/  thoughts/  health/
│   │   ├── not-found.tsx    # Exported as 404.html
│   │   ├── sitemap.ts       # → sitemap.xml (generated at build time)
│   │   ├── robots.ts        # → robots.txt  (generated at build time)
│   │   └── globals.css      # Tailwind entry + design tokens (light/dark)
│   ├── components/
│   │   ├── layout/          # Site chrome: header, nav, footer, container
│   │   ├── sections/        # Page-level sections (Hero, TimelineEntry)
│   │   └── ui/              # Small reusable primitives (Section, TagList, links, …)
│   ├── data/                # Site content and config: the only place to edit copy
│   ├── lib/                 # Framework-agnostic helpers (metadata, dates, paths)
│   └── types/               # Shared TypeScript types
├── next.config.ts
├── eslint.config.mjs
└── tsconfig.json
```

### Architectural decisions

- **Content is separate from presentation.** All copy (profile, experience, education, books, thoughts, records) lives in `src/data/`, typed by `src/types/`. Components only render that data, so content changes never touch component code. See [Editing content](#editing-content).
- **Server Components by default.** The only client component is `MainNav`, which needs `usePathname()` to mark the active link. Everything else renders at build time and ships no component JavaScript.
- **Fully static output.** `next.config.ts` sets `output: "export"`. Every route is pre-rendered to HTML in `out/`, so the site needs no server runtime and can be hosted on any CDN. This was chosen deliberately; see [Deployment](#deployment) for what it rules out.
- **Trailing-slash URLs.** `trailingSlash: true` emits `/about/index.html`, which gives clean URLs on any static host without rewrite rules. Canonical URLs and the sitemap use the same form.
- **Centralised metadata.** The root layout sets `metadataBase` and a title template, and pages call `createPageMetadata()` from `src/lib/metadata.ts` for consistent titles, descriptions, canonical URLs, and Open Graph tags.
- **Design tokens in CSS.** Colours are CSS variables in `globals.css` (with a dark-mode set), exposed to Tailwind via `@theme`, so components use semantic classes like `text-muted` and `border-border` rather than raw colours.
- **Accessibility baseline.** Semantic landmarks, one `<h1>` per page, a skip link, visible focus styles, `aria-current` on the active nav item, screen-reader text for links that open a new tab, AA colour contrast, and `prefers-reduced-motion` support.

## Editing content

All content lives in typed files in `src/data/`. Each list starts empty, and its page shows a "coming soon" notice until you add an entry. Every file has a commented example entry, and the shapes are defined in `src/types/content.ts`, so `npm run typecheck` catches mistakes such as a malformed date.

| Page            | File                      | Notes                                                    |
| --------------- | ------------------------- | -------------------------------------------------------- |
| Home, footer    | `src/data/site.ts`        | Name, role, intro, GitHub/LinkedIn links                 |
| About           | `src/data/about.ts`       | Bio paragraphs, focus areas, interests                   |
| Work Experience | `src/data/experience.ts`  | Most recent first; omit `end` for a current role         |
| Education       | `src/data/education.ts`   | Most recent first                                        |
| Books           | `src/data/books.ts`       | `status`: `reading`, `read`, or `to-read`                |
| Thoughts        | `src/data/thoughts.ts`    | Sorted newest first automatically; `slug` makes `#anchor` links |
| Health          | `src/data/health.ts`      | Personal records, shown in the order listed              |
| Navigation      | `src/data/navigation.ts`  | Header links (the sitemap uses this list too)            |

Dates are written as `"YYYY-MM"` (CV entries, books) or `"YYYY-MM-DD"` (thoughts, records), and are formatted in UTC so they never shift by a day.

## Local development

**Prerequisites:** Node.js ≥ 20.9 (the version in `.nvmrc` is recommended) and npm.

```bash
git clone https://github.com/Pankaj-Sharma-01/pankajsharma.git
cd pankajsharma
nvm use            # optional; uses the version in .nvmrc
npm install
npm run dev        # http://localhost:3000
```

### npm scripts

| Script              | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `npm run dev`       | Start the dev server with hot reload.                                 |
| `npm run build`     | Production build; writes the static site to `out/`.                   |
| `npm run preview`   | Serve `out/` locally (via `serve`) to check the production build.     |
| `npm run lint`      | Run ESLint.                                                           |
| `npm run typecheck` | Generate Next.js route types, then run `tsc --noEmit`.                |
| `npm run check`     | Lint, typecheck, and build. Run this before pushing.                  |

`next start` is intentionally absent: it serves a Node.js server build, which a static export doesn't produce.

### Environment variables

None are required right now, so there is no `.env.example` yet. When one is needed:

1. Add the variable name with a placeholder value to a new `.env.example` (already allow-listed in `.gitignore`).
2. Put real values in `.env.local`, which is git-ignored.
3. Remember that in a static export only `NEXT_PUBLIC_*` variables exist, and they are **inlined into the client bundle at build time**. Never put secrets in them. Set build-time values in the Cloudflare dashboard as build environment variables.

## Build and production

```bash
npm run build      # outputs static files to ./out
npm run preview    # serves ./out at http://localhost:3000
```

The `out/` directory is the entire deployable artefact: HTML, CSS, JS, fonts, `404.html`, `sitemap.xml`, and `robots.txt`.

## Deployment

The site will be hosted on **Cloudflare** at `https://pankajsharma.dev`. No deployment is configured in this repository yet; this section records the recommended approach.

### Can it be statically exported?

**Yes, and it currently is.** Nothing in the app needs a server at request time. The trade-off is that static export does **not** support:

- Route Handlers that read the request, `cookies()`, `headers()`, or Server Actions
- `rewrites`, `redirects`, and `headers` in `next.config.ts`
- Incremental Static Regeneration, Draft Mode, and middleware/proxy
- `next/image` optimisation with the default loader (`images.unoptimized` is set)

Redirects and custom headers can still be handled at the Cloudflare layer (a `_redirects` / `_headers` file in `public/`, or Cloudflare rules).

### Recommended: Cloudflare Workers with static assets

Cloudflare recommends Workers (with static assets) for new projects; Pages also works for a static site. Either way the build contract is the same:

| Setting           | Value           |
| ----------------- | --------------- |
| Build command     | `npm run build` |
| Output directory  | `out`           |
| Node version      | from `.nvmrc`   |

**Workers (Git-connected "Workers Builds")**: add a `wrangler.jsonc` at the repo root:

```jsonc
{
  "name": "pankajsharma",
  "compatibility_date": "<today's date, YYYY-MM-DD>",
  "assets": {
    "directory": "./out",
    "not_found_handling": "404-page"
  }
}
```

Then, in the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository**, select this repo, set the build command to `npm run build` and the deploy command to `npx wrangler deploy`. Attach `pankajsharma.dev` under **Settings → Domains & Routes** (the domain's DNS must be on Cloudflare).

**Pages (alternative)**: go to **Workers & Pages → Create → Pages → Connect to Git**, choose the *None* framework preset, set the build command to `npm run build`, and set the output directory to `out`. Pages serves `404.html` automatically. Add the custom domain under **Custom domains**.

Both options give preview deployments for pull requests.

### If server features are needed later

If the site needs server-side behaviour, such as a contact form handler, on-demand rendering, or an AI-powered feature with server-held API keys, remove `output: "export"` and deploy with the **[OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare)** (`@opennextjs/cloudflare`), which runs Next.js on Cloudflare Workers. Check the Next.js version it supports before upgrading. A lighter alternative for a single endpoint is a separate Cloudflare Worker alongside the static site.

## Roadmap

1. **Real content**: fill in `src/data/` (About, Experience, Education, Books, Thoughts, Health); resume PDF in `public/resume/`.
2. **Projects and long-form writing**: typed project data with case-study detail pages, and MDX if Thoughts grows into long-form posts (detail pages generated via `generateStaticParams`).
3. **Health activities**: show recent activities on the Health page, for example from Strava, fetched at build time.
4. **Deployment**: Cloudflare setup as described above, custom domain, and analytics (Cloudflare Web Analytics needs no cookies or dependency).
5. **SEO and sharing**: Open Graph images, structured data (`Person` JSON-LD), and an RSS feed for Thoughts.
6. **Quality gates**: GitHub Actions running `npm run check` on PRs; a Lighthouse/axe accessibility check.
7. **Design pass**: typography, a light/dark toggle, and project and thought card components once real content exists.

## License

[MIT](./LICENSE)
