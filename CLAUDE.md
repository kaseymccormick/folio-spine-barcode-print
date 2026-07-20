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
- `public/_headers` — CSP and other security response headers (see Users & security posture)

## Figma Make quirks (don't remove)
- `vite.config.ts` has a custom `figmaAssetResolver` plugin resolving `figma:asset/*` imports to `src/assets/` — currently unused (no components import via that scheme, `src/assets/` doesn't exist), but harmless to keep in case Figma Make re-exports something that uses it again.
- React and Tailwind vite plugins are required even where Tailwind isn't actively used — comment in vite.config.ts says not to remove them.
- `assetsInclude` only allows `.svg`/`.csv` raw imports — never add `.css`/`.tsx`/`.ts` here.

## Deploy
- Hosted on **Cloudflare Workers** (not classic Pages — Cloudflare merged Pages into the Workers/Compute product; new projects there use `wrangler deploy` with static assets rather than a Pages "framework preset" wizard).
- Build config lives in the Cloudflare dashboard under the Worker's **Settings → Build** tab: build command `npm run build`, deploy command `npx wrangler deploy`, root dir `/`.
- Git-connected to `github.com/kaseymccormick/folio-spine-barcode-print` (main branch) — pushes trigger an automatic build + deploy.
- Public URL: `folio-spine-barcode-print.kaseymccormick.workers.dev` (toggle under Domains tab if it ever gets disabled).
- No custom domain attached yet.

## Commands
- `npm i` — install deps
- `npm run dev` — local dev server
- `npm run build` — production build to `dist/` (what Cloudflare runs)

## Users & security posture
- Multi-user, no shared backend/data store — each user enters their own FOLIO OKAPI URL + credentials in `FolioSettings`. At least 4 coworkers use this; may be opened up to any FOLIO user, including on shared/work machines.
- FOLIO credentials are stored in `sessionStorage` (not `localStorage`) — cleared when the tab closes, deliberately, so credentials don't linger on shared machines. Don't revert this to `localStorage` without re-checking who's using the tool.
- CQL query params (barcode, ISBN, instance ID) are escaped via `cql()` in `src/app/lib/folioApi.ts` before interpolation into FOLIO query strings — required since these can be user-typed, not just scanned. Keep any new query-string interpolation routed through `cql()`.
- **Documentation flag:** each user's FOLIO/OKAPI gateway must allow CORS from this app's origin, or the login request fails with a network error (surfaced in the UI, but easy to mistake for a bug report). This is a per-institution IT config issue, not something fixable in this repo — flag it in any user-facing docs/README so people don't file it as a bug.
  - The CORS fix belongs on the OKAPI side (reverse proxy in front of OKAPI, e.g. nginx/mod-configuration), not in this repo — nothing to change in code.
  - Tell institutions to allowlist the **exact app origin**, not `*` — see README.md "For your FOLIO/IT admin" section for the ready-to-send note.
  - This is why a stable custom domain (see Deploy section) matters: renaming the workers.dev subdomain later breaks every institution's allowlist entry.
- **CSP:** `public/_headers` sets `Content-Security-Policy` + `X-Content-Type-Options` + `Referrer-Policy` on all responses (Vite copies `public/` into `dist/` root as-is; Cloudflare Workers static assets honor `_headers` the same way Pages did). `connect-src` allows `https:` broadly (not a pinned host) since each user points at their own OKAPI URL. `style-src` allows `'unsafe-inline'` because of the inline `<style>` reset in `index.html` and MUI/emotion's runtime style injection — `script-src` stays locked to `'self'` only, which is the part that actually blocks XSS payloads from executing. If a future change needs a new external host (fonts, CDN script, etc.), it must be added explicitly here, not opened wide.
- Run `npm audit` periodically — `react-router` and `vite` versions are pinned exact (no `^`), so security patches don't apply automatically via `npm install`.
