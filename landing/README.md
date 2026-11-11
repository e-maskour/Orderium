# Marnova — landing page (Next.js)

Next.js 16 (App Router, TypeScript). Both languages are server-rendered to static HTML at build time:

| URL | Content |
|-----|---------|
| `/` | 307 redirect to `/fr` or `/ar` (cookie, then `Accept-Language`) — `src/proxy.ts` |
| `/fr`, `/ar` | Landing page, `lang`/`dir` set server-side, hreflang + canonical |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | Generated from `src/app/*.ts` |
| `/llms.txt`, `/llms-full.txt` | Plain-markdown summary and full content for AI assistants |

Structured data (JSON-LD): Organization, WebSite, WebPage, SoftwareApplication, FAQPage, HowTo — `src/components/JsonLd.tsx`.

## Edit content
- French: `src/i18n/dictionaries/fr.ts` (defines the shape)
- Arabic: `src/i18n/dictionaries/ar.ts` (type-checked against French: a missing key fails the build)
- Contact (WhatsApp, email): `src/i18n/config.ts`

## Commands (from `landing/`)
```bash
pnpm dev          # http://localhost:3100
pnpm build        # set NEXT_PUBLIC_SITE_URL first (see below)
pnpm start
pnpm typecheck
```

## Deploy
**`NEXT_PUBLIC_SITE_URL` must be set at build time** (e.g. `https://marnova.ma`). It is baked into canonical URLs, hreflang, sitemap, robots, Open Graph and JSON-LD. On Vercel it falls back to the production domain automatically.

- **Vercel:** import the repo, Root Directory `landing`, framework Next.js. Add `NEXT_PUBLIC_SITE_URL`.
- **Docker (from repo root):**
  ```bash
  docker build -f landing/Dockerfile --build-arg NEXT_PUBLIC_SITE_URL=https://marnova.ma -t marnova-landing .
  docker run -p 3000:3000 marnova-landing
  ```

After going live: submit `https://<domain>/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Motion & 3D
- **Hero**: centered message over a live product dashboard (`HeroDashboard.tsx`, pure HTML/CSS, straightens on scroll, KPIs count up) and a three.js "connected network" background in the brand blues (`src/three/scene.ts`). Code-split and loaded only after `load` + idle; skipped on software WebGL (SwiftShader/llvmpipe), and Save-Data (static poster instead); under reduced motion it renders one still frame.
- **Choreography** (`src/components/Motion.tsx`): GSAP + ScrollTrigger + Lenis, lazy-loaded after hydration. Sections stay server components and opt in with data attributes (`data-split`, `data-anim`, `data-stage-group`, `data-scrub`, `data-tilt`, `data-magnetic`).
- Hidden-before-reveal styles apply only under `html.motion` (set by a tiny boot script); no-JS and reduced-motion visitors always get the full, static page.

## Lighthouse (local production build, 2026-11-10)
| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Desktop `/fr`, `/ar` | 100 | 100 | 100 | 100 |
| Mobile, real throttling | 91–100 (LCP 1.0–2.7 s, run-to-run variance) | 100 | 100 | 100 |
| Mobile, simulated throttling | 94 | 100 | 100 | 100 |

Do not put a manual `<head>` in the layout: combined with `experimental.inlineCss` it caused intermittent hydration errors on slow connections.
