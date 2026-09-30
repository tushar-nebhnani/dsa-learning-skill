# Website

The DSA Tutor homepage, built with Next.js (App Router) and React, and exported as a static site. `npm run build` writes plain HTML, CSS and JS to `out/`, so any static host can serve it.

## Commands

From `website/`:

| Command | What it does |
|---|---|
| `npm install` | Install dependencies. |
| `npm run dev` | Run the dev server at http://localhost:3000. |
| `npm run build` | Build the static site into `out/`. |
| `npm start` | Serve `out/` locally to check a build. |
| `npm run typecheck` | Type-check without building. |
| `npm run og-image` | Re-render the social preview image (needs Google Chrome). |

## Environment

| Variable | When | What it does |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Every production build | The site's public URL, such as `https://dsa-tutor.example.com`. Used for the canonical link, Open Graph and Twitter image URLs, `sitemap.xml` and `robots.txt`. Defaults to `http://localhost:3000`, which is wrong for production. |
| `BASE_PATH` | Only when served under a sub-path | For example `/dsa-learning-skill` on a GitHub Pages project site. |

## Layout

| Path | What it holds |
|---|---|
| `app/layout.tsx` | Page metadata (title, description, canonical, Open Graph, Twitter), fonts, and the script that applies a saved theme before first paint. |
| `app/page.tsx` | The page, as a server component, plus JSON-LD structured data. |
| `app/tokens.css` | Every colour, font, size, space and motion value, for the light and dark themes. Change the look here. |
| `app/globals.css` | Layout and components. It uses the tokens by name and never sets a colour or font directly. |
| `app/sitemap.ts`, `app/robots.ts` | Generate `sitemap.xml` and `robots.txt`. |
| `app/icon.svg`, `app/opengraph-image.png` | The tab icon and the 1200×630 social preview. Next.js adds the tags for both. |
| `components/` | Client components for the parts that respond to the visitor: theme toggle, ⌘K menu, hero replay, the stage pane that follows the scroll, roadmap bar, install tabs and copy buttons. `SessionCards.tsx` is a server component. |
| `lib/site.ts` | Every URL and install command on the page. |
| `lib/content.ts` | The stages and the roadmap counts. |
| `scripts/` | The source and script for the social preview image. |

Everything a visitor reads is in the server-rendered HTML, including all 12 session cards and all three install panels, so search engines and readers without JavaScript get the full page.

## Themes

Light is the default. Dark applies when the visitor's system is set to dark, or when they pick it with the toggle in the nav. The choice is saved in `localStorage` under `dsa-tutor-theme`. In `app/tokens.css`, the bare `:root` block is light, and the dark values are repeated under `prefers-color-scheme: dark` and `:root[data-theme="dark"]` so the toggle wins either way.

## Motion

Animations use [Motion](https://motion.dev). Everything is visible without them, and they are skipped when the visitor has reduced motion turned on.

## Keeping it in sync with the repo

The page repeats facts from the skill and the server. When one of these changes, update the page in the same commit:

- The stages, loops and rules of engagement, from [SKILL.md](../dsa-learning-skill/SKILL.md): `lib/content.ts` and `app/page.tsx`.
- The roadmap section counts, from [roadmap.md](../dsa-learning-skill/references/roadmap.md): `lib/content.ts`.
- The example session, from [documentation-example.md](../dsa-learning-skill/references/documentation-example.md): `components/SessionCards.tsx`.
- The five tool names, the server URL and the install commands, from the root [README](../README.md): `lib/site.ts` and the footer in `app/page.tsx`.

## Download link

The **Download the skill** buttons point to `https://github.com/tushar-nebhnani/dsa-learning-skill/releases/latest/download/dsa-learning-skill.zip`. That link works once a GitHub release has a `dsa-learning-skill.zip` asset; see [Deployment](../README.md#website) for the zip command.
