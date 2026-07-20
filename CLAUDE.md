# CLAUDE.md

## What this is
Spine label / barcode printing tool for library-style call numbers (LC, Dewey, SuDoc), with FOLIO integration (Open Library fallback) for catalog lookups by ISBN. Originally generated in Figma Make, now iterated on directly in this repo.

## Stack
- Vite 6 + React 18 + TypeScript
- Tailwind v4 (`@tailwindcss/vite` plugin) + shadcn/ui-style components in `src/app/components/ui`
- MUI (`@mui/material`) also present — mixed component library, not fully migrated to one system
- `jsbarcode` for barcode rendering, `react-router` for routing

## Structure
- `src/app/App.tsx` — root component
- `src/app/components/` — feature components (BarcodeScanner, SpineLabelEditor, SpineLabelPreview, BarcodePrintPanel, FolioSettings, RequestLog)
- `src/app/lib/folioApi.ts` — FOLIO catalog API integration
- `src/app/components/figma/` — Figma Make scaffolding, leave as-is
- `src/styles/` — theme.css, tailwind.css, globals.css, fonts.css
- `src/assets/logo.svg` — Boise State University / Albertsons Library header logo (see "Branding" below)
- `public/_headers` — CSP and other security response headers (see Users & security posture)
- `public/favicon.svg`, `favicon.ico`, `favicon-96x96.png`, `apple-touch-icon.png`, `web-app-manifest-{192,512}x192.png`, `site.webmanifest` — favicon/PWA icon set, linked from `index.html`

## Figma Make quirks (don't remove)
- `vite.config.ts` has a custom `figmaAssetResolver` plugin resolving `figma:asset/*` imports to `src/assets/` — currently unused (no components import via that scheme), but harmless to keep in case Figma Make re-exports something that uses it again. Note: `src/assets/` now exists again (holds `logo.svg`), imported via a normal ES import, not the `figma:asset/` scheme.
- React and Tailwind vite plugins are required even where Tailwind isn't actively used — comment in vite.config.ts says not to remove them.
- `assetsInclude` only allows `.svg`/`.csv` raw imports — never add `.css`/`.tsx`/`.ts` here.

## Deploy
- Hosted on **Cloudflare Workers** (not classic Pages — Cloudflare merged Pages into the Workers/Compute product; new projects there use `wrangler deploy` with static assets rather than a Pages "framework preset" wizard).
- Build config lives in the Cloudflare dashboard under the Worker's **Settings → Build** tab: build command `npm run build`, deploy command `npx wrangler deploy`, root dir `/`.
- `wrangler.toml` (repo root) is now committed and is the source of truth for the deploy target: worker name `folio-spine-barcode-print`, assets served from `./dist`. Added 2026-07-20 — verify the first post-add deploy in the Cloudflare dashboard build log to confirm it updated the existing Worker rather than creating a new one.
- Git-connected to `github.com/kaseymccormick/folio-spine-barcode-print` (main branch) — pushes trigger an automatic build + deploy.
- Public URL: `folio-spine-barcode-print.kaseymccormick.workers.dev` (toggle under Domains tab if it ever gets disabled).
- No custom domain attached yet.

## Commands
- `npm i` — install deps
- `npm run dev` — local dev server
- `npm run build` — production build to `dist/` (what Cloudflare runs)

## Branding
- Header now uses Boise State University / Albertsons Library branding: `src/assets/logo.svg` and the title text "Albertsons Library Spine & Barcode Label Printing Software" in `App.tsx`. This is a change from the earlier generic/fork-agnostic design — see `TRADEMARK.md` for the trademark notice and `documentation-developer.md` → "If someone forks this" for the swap instructions.
- `src/assets/logo-placeholder.svg` — neutral bookmark-icon placeholder (MIT/ISC via lucide-react), the documented drop-in replacement for `logo.svg` in forks.
- Full brand color list is at the bottom of this file (`# brand colors`). `theme.css` doesn't use all of them — pull from that list for any future token work rather than inventing new hex values.
- `--ring` in **light mode** matches `--accent` (`#097510`, green). **Dark mode diverges from light mode here** — see below.

## Dark mode — toggle is live, all-brand-blue palette
- `useTheme()`/`getInitialTheme()` in `App.tsx` implement light/dark toggle logic (persists to `localStorage`, defaults to OS `prefers-color-scheme`). The header toggle button is rendered and live.
- Dark mode was deliberately rebuilt from scratch (superseding an earlier green-accent version) to use **only** the 12-color brand palette listed at the bottom of this file — all 12 are used purposefully:
  - Neutral elevation scale, darkest to lightest: `--background: #3f4444` → `--card: #53565a` → `--secondary: #97999b` → `--muted: #c8c9c7`, each with a contrast-checked foreground (`--muted-foreground: #d9d9d6`, tuned for its dominant context on `--card`).
  - `--primary: #0033a0` (deep navy), `--accent: #0072ce` (bright blue, "Test & Save"/"Look Up" buttons), `--ring: #006ba6` (teal-blue, distinct from accent), `--popover: #001f60` (darkest navy, gives floating layers their own depth instead of matching `--card`). Unlike light mode, dark mode's accent/ring are **not** green — this was an explicit choice to keep dark mode within the given palette rather than carry over the light-mode green.
  - `--border`/`--input: #406098` (brand blue-gray, not a generic gray).
  - `--warning: #d64309` matches light mode exactly.
  - **Known tension, not fully resolved**: no red exists in this palette, so `--destructive` also reuses `#d64309` — same color as `--warning`, collapsing two semantically different severities (error vs. caution) into one. Acceptable given the constraint; revisit if it reads as ambiguous in practice.
- **Structural fix behind this**: `text-muted-foreground` was used both on `bg-card` (needs light text against a dark card) and `bg-secondary` (needs dark text against a mid-gray secondary) — no single color satisfies both. Fixed by routing the `bg-secondary` instances (`App.tsx:439`, `FolioSettings.tsx` testState box, `RequestLog.tsx` collapsed bar) to `text-secondary-foreground` instead, so `--muted-foreground` only has to work for its dominant context (card).
- The header stays a literal `bg-white` regardless of theme (always shows the logo on a light background); its `<h1>` is pinned to `text-[#1a1a1a]` for the same reason — don't use theme-driven text/bg classes in the header, pin colors instead.

## Users & security posture
- Multi-user, no shared backend/data store — each user enters their own FOLIO OKAPI URL + credentials in `FolioSettings`. At least 4 coworkers use this; may be opened up to any FOLIO user, including on shared/work machines.
- FOLIO credentials are stored in `sessionStorage` (not `localStorage`) — cleared when the tab closes, deliberately, so credentials don't linger on shared machines. Don't revert this to `localStorage` without re-checking who's using the tool.
- CQL query params (barcode, ISBN, instance ID) are escaped via `cql()` in `src/app/lib/folioApi.ts` before interpolation into FOLIO query strings — required since these can be user-typed, not just scanned. Keep any new query-string interpolation routed through `cql()`.
- **Documentation flag:** each user's FOLIO/OKAPI gateway must allow CORS from this app's origin, or the login request fails with a network error (surfaced in the UI, but easy to mistake for a bug report). This is a per-institution IT config issue, not something fixable in this repo — flag it in any user-facing docs/README so people don't file it as a bug.
  - The CORS fix belongs on the OKAPI side (reverse proxy in front of OKAPI, e.g. nginx/mod-configuration), not in this repo — nothing to change in code.
  - Tell institutions to allowlist the **exact app origin**, not `*` — see README.md "For your FOLIO/IT admin" section for the ready-to-send note.
  - This is why a stable custom domain (see Deploy section) matters: renaming the workers.dev subdomain later breaks every institution's allowlist entry.
- **CSP:** `public/_headers` sets `Content-Security-Policy` + `X-Content-Type-Options` + `Referrer-Policy` on all responses (Vite copies `public/` into `dist/` root as-is; confirmed live on the production deploy via `curl -I`). `connect-src` allows `https:` broadly (not a pinned host) since each user points at their own OKAPI URL. `style-src` allows `'unsafe-inline'` because of the inline `<style>` reset in `index.html` and MUI/emotion's runtime style injection — `script-src` stays locked to `'self'` only, which is the part that actually blocks XSS payloads from executing. If a future change needs a new external host (fonts, CDN script, etc.), it must be added explicitly here, not opened wide.
- Run `npm audit` periodically — `react-router` and `vite` versions are pinned exact (no `^`), so security patches don't apply automatically via `npm install`.

# brand colors
#0033A0, #001F60, #F6F7F9, #D64309, #D9D9D6, #406098, #0072CE, #006BA6, #C8C9C7, #97999B, #53565A, #3F4444