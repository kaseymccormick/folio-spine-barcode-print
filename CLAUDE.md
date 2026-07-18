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

## Figma Make quirks (don't remove)
- `vite.config.ts` has a custom `figmaAssetResolver` plugin resolving `figma:asset/*` imports to `src/assets/` — required if any component still imports via that scheme.
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
