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
- Color tokens (`src/styles/theme.css`, light mode): `--primary: #0033a0` (Boise State blue), `--accent: #097510` (used on the "Test & Save" button, active toggles, sliders, and other accent elements), `--warning: #d64309`, `--background: rgb(246,247,249)`. Dark-mode equivalents were only partially updated — see "Dark mode" below.
- `--ring` (focus outline color) matches `--accent` (`#097510`).

## Dark mode — toggle is live, two known gaps remain
- `useTheme()`/`getInitialTheme()` in `App.tsx` implement light/dark toggle logic (persists to `localStorage`, defaults to OS `prefers-color-scheme`). The header toggle button is re-enabled and rendered.
- Fixed: `--card-foreground` (dark) was near-white against `--card: #97999b`, close to unreadable — now `#1a1a1a`. The header uses a literal `bg-white` (not a theme token) since it's meant to always show the logo on a light background; its `<h1>` is pinned to a fixed `text-[#1a1a1a]` for the same reason (theme-driven `text-foreground` went near-invisible against the always-white header once dark mode activated).
- **Still open**: `--input-background` and `--switch-background` have no `.dark` override at all — they silently fall back to their light-mode values (`#ffffff`, `#c8c3ba`), which will look wrong (light form inputs/switches on a dark page). Set dark values for both before considering dark mode fully done.
- If you add new header content, remember the header never changes with theme — don't use theme-driven text/bg classes there; pin colors like the `<h1>` fix above.

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
