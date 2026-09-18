# Spine Label Printer — Developer / Maintainer Docs

## Run locally
1. Clone the repo.
2. `npm i`
3. `npm run dev` — starts Vite dev server, prints local URL (usually `http://localhost:5173`). This is plain Vite with no Worker — `/api/folio/relay` doesn't exist here, so FOLIO integration will fail. Use the Open Library fallback (no FOLIO config entered) to test the rest of the flow.
4. To test FOLIO integration locally, run `npx wrangler dev` instead (after `npm run build`) — that runs the actual Worker, including the relay route, against your built `dist/`. No CORS allowlisting needed on the OKAPI side; the relay calls OKAPI server-to-server.
5. `npm run build` — production build to `dist/`. This is the exact command Cloudflare runs.
6. There is no test suite and no lint/typecheck script configured in `package.json` currently — TypeScript errors will surface at build time via `vite build` (esbuild/tsc), but there's no standalone `npm run typecheck`.

## Stack & structure
React + TypeScript, Vite build, Tailwind. See `package.json` for the exact dependency list and `src/app/` for structure (`components/`, `lib/`).

## Deploy
- Cloudflare Workers, git-connected to `main` — pushing to `main` triggers an automatic build + deploy.
- `wrangler.toml` (repo root) is the source of truth for deploy config: worker name, `main` entry (`worker/index.ts`, the relay), static assets directory (`./dist`), SPA fallback routing. Committed so it's reproducible in git and portable to forks — see "wrangler.toml" under Known limitations for the migration caveat.
- Cloudflare dashboard specifics (git remote, build command, public URL) aren't documented anywhere in this repo currently — check the Cloudflare dashboard directly if you need them.

## Security-relevant decisions already made
- **FOLIO credentials in `sessionStorage`, not `localStorage`** (`src/app/components/FolioSettings.tsx`). Deliberate: this app may run on shared/work machines across multiple institutions, so credentials should not outlive the browser tab. Don't revert without re-confirming the deployment's user base is still single-user/trusted.
- **CQL query values are escaped** via `cql()` in `src/app/lib/folioApi.ts` before being interpolated into FOLIO query strings (barcode, ISBN, instance ID are all attacker-/typo-controllable since a human can type into the manual-entry field). Route any new query-string interpolation through `cql()`.
- **CSP set via `public/_headers`**, `script-src 'self'` only. `connect-src` is currently `'self' https:` — that's now broader than it needs to be, since the browser only ever calls same-origin `/api/folio/relay`; per-institution OKAPI hosts are reached server-side by the Worker, not by browser fetch. Worth tightening `connect-src` to `'self'` only next time this file is touched.
- **Worker relay (`worker/index.ts`) is the backend now.** `/api/folio/relay` forwards OKAPI calls server-side so browsers never need CORS-allowlisting on OKAPI. It validates `https://` only, blocks private/link-local IP targets, and restricts to the specific OKAPI paths this app uses (`/authn/login`, `/inventory/*`, `/holdings-storage/*`) — treat any change to that allowlist as a security-relevant change, not a routine one. It does not store or log credentials/tokens; each request is relayed and forgotten. Browser-side state (form state + `sessionStorage`) is unchanged.

## Known limitations / concerns
- **No automated tests.** Changes to `folioApi.ts` (query construction, response parsing) or `App.tsx` (label-line derivation from call numbers) are only verified manually. Regex-based call-number parsing (`buildSuggestedLines` in `App.tsx`) is fragile against unusual LC/Dewey/SuDoc formats — verify against a few real catalog records after touching it.
- **`wrangler.toml`** drives deploy config now (previously the Cloudflare dashboard only), and now also points `main` at `worker/index.ts` (the relay), not just `[assets]`. Confirmed working: post-push, the live site still serves from the same Worker/origin with `public/_headers` CSP intact — it updated the existing Worker rather than creating a new one.
- **`npm audit` isn't automated.** `react-router` and `vite` are pinned to exact versions (no `^`), so security patches require a manual bump + `npm install`, not `npm update`.
- **Camera scanning depends on the `BarcodeDetector` API** (`BarcodeScanner.tsx`), which isn't available in all browsers (notably not Firefox/Safari as of last check). The UI degrades to manual entry, but this isn't something to "fix" — it's a browser support gap outside this repo's control.
- **Dark mode toggle is live** (header button, top right), theme rebuilt from the Boise State brand palette. The color-hierarchy/`text-muted-foreground` vs `text-secondary-foreground` reasoning behind it isn't written down anywhere currently — check the theme CSS variables directly if you need to touch this.

## Scaling & Cloudflare costs
- This is now a Worker with both static-assets serving *and* server-side compute (`worker/index.ts` relays every FOLIO API call). Cost and latency scale with static-file requests **and** with FOLIO API traffic — all of it now routes through Cloudflare, it no longer bypasses it.
- Free tier is very likely still sufficient even at ~2,000 users, but confirm current Workers request/CPU-time limits against Cloudflare's pricing page before committing to that number publicly — this traffic profile changed from static-only.
- No caching invalidation concerns beyond a normal SPA — a new deploy replaces the built assets; users get the new version on next full page load.
- See `documentation-it.md` → "What this means for your firewall/network team" for the explanation written for a non-dev IT/network audience.
- **Rate limiting on the relay route is a real, not hypothetical, concern now.** `/api/folio/relay` is a same-origin POST endpoint anyone can script against to try FOLIO logins for a guessed/known OKAPI URL — it's a more attractive target than the old direct-to-OKAPI-CORS setup was, since an attacker no longer needs a CORS-allowlisted origin first. Cloudflare's rate limiting (paid add-on) is worth evaluating before this sees wider use, not after an incident.

## Open decisions (not yet made — flagging for you)
- **Workers.dev subdomain includes your personal Cloudflare account name** (`kaseymccormick.workers.dev`). Options: rename the account's workers.dev subdomain (free, account-wide, limited rename frequency) or attach a custom domain (requires owning a domain, but decouples the app's URL from your personal Cloudflare account and from any future account changes). This matters more now that other institutions will be CORS-allowlisting this specific origin — changing it later breaks their config.
- **Whether FOLIO password should be storable at all**, even session-scoped. Alternative would be prompting for password on every lookup (no storage), which is more annoying but leaves zero credential residue in the browser, even within a tab's lifetime. Current sessionStorage approach is a middle ground — revisit if this ever handles more sensitive institutions/data.

## Decisions made
- **Committed `wrangler.toml`** (2026-07-20): reproducible deploy config in git outweighed the small risk of dashboard/file drift, especially since other people may fork this and need a working deploy config to start from. Config: `name = "folio-spine-barcode-print"`, static assets served from `./dist`, SPA fallback routing enabled (harmless even though the app doesn't currently use client-side routing).

## If someone forks this instead of using your deployment
Files a fork needs to update:
- `wrangler.toml` `name` field (`folio-spine-barcode-print`) — a fork deploying to their own Cloudflare account should rename this to whatever they want their Worker called.
- `package.json` `name` field (`folio-spine-barcode-print`) is just a label, safe to leave or rename.
- **`src/assets/logo.svg` and the header title text in `App.tsx`** (`"Albertsons Library Spine & Barcode Label Printing Software"`) — this is now Boise State University / Albertsons Library specific branding, including their official athletics-style "B" logo mark. A fork for a different institution **must** replace both — see `TRADEMARK.md` for the full notice. This also means the FOLIO/OKAPI backend is the only part that was ever institution-agnostic — the UI itself is now branded for one specific library, which is a change from how this app started (previously generic).
  - **Quick swap**: `src/assets/logo-placeholder.svg` (a neutral bookmark icon, MIT/ISC via lucide-react) is provided as a ready-made drop-in. In `App.tsx`, change `import logo from "../assets/logo.svg"` to `import logo from "../assets/logo-placeholder.svg"` and update the title text on the next line.
- Nothing in the *FOLIO-integration* code is hardcoded to a specific institution — `FolioSettings` collects OKAPI URL/tenant/credentials at runtime from the end user, so that part of the app is still portable without code changes. Only the *visual branding* and *documentation* (README, this file) need updating per-fork.
- `ATTRIBUTIONS.md` (shadcn/ui, MIT) should stay in any fork per license terms — but note it does not cover `logo.svg`, which needs its own attribution/removal per the trademark note above.
