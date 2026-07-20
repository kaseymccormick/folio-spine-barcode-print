# Spine Label Printer — Developer / Maintainer Docs

## Run locally
1. Clone the repo.
2. `npm i`
3. `npm run dev` — starts Vite dev server, prints local URL (usually `http://localhost:5173`).
4. To test FOLIO integration locally, your local origin (`http://localhost:5173`) must be CORS-allowlisted on the target OKAPI gateway — same requirement as production (see `documentation-it.md`). Without that, use the Open Library fallback (no FOLIO config entered) to test the rest of the flow.
5. `npm run build` — production build to `dist/`. This is the exact command Cloudflare runs.
6. There is no test suite and no lint/typecheck script configured in `package.json` currently — TypeScript errors will surface at build time via `vite build` (esbuild/tsc), but there's no standalone `npm run typecheck`.

## Stack & structure
See `CLAUDE.md` for stack, file structure, and Figma Make scaffolding notes — not duplicated here to avoid drift between the two files.

## Deploy
- Cloudflare Workers, git-connected to `main` — pushing to `main` triggers an automatic build + deploy.
- `wrangler.toml` (repo root) is the source of truth for deploy config: worker name, static assets directory (`./dist`), SPA fallback routing. Committed so it's reproducible in git and portable to forks — see "wrangler.toml" under Known limitations for the migration caveat.
- See `CLAUDE.md` → Deploy for Cloudflare dashboard specifics (build command, git remote, public URL).

## Security-relevant decisions already made
- **FOLIO credentials in `sessionStorage`, not `localStorage`** (`src/app/components/FolioSettings.tsx`). Deliberate: this app may run on shared/work machines across multiple institutions, so credentials should not outlive the browser tab. Don't revert without re-confirming the deployment's user base is still single-user/trusted.
- **CQL query values are escaped** via `cql()` in `src/app/lib/folioApi.ts` before being interpolated into FOLIO query strings (barcode, ISBN, instance ID are all attacker-/typo-controllable since a human can type into the manual-entry field). Route any new query-string interpolation through `cql()`.
- **CSP set via `public/_headers`**, `script-src 'self'` only. `connect-src` is `'self' https:` (broad) because each user/institution points at a different OKAPI host and Open Library — there's no way to pin a single allowed API host without breaking multi-tenant use. If you ever add a hardcoded API host, tighten `connect-src` to match instead of leaving it broad.
- **No backend, no server-side data store.** All state lives in the browser (form state + `sessionStorage`). This was a deliberate simplicity choice, not an oversight — see "Open decisions" below for the tradeoff it creates.

## Known limitations / concerns
- **No automated tests.** Changes to `folioApi.ts` (query construction, response parsing) or `App.tsx` (label-line derivation from call numbers) are only verified manually. Regex-based call-number parsing (`buildSuggestedLines` in `App.tsx`) is fragile against unusual LC/Dewey/SuDoc formats — verify against a few real catalog records after touching it.
- **`wrangler.toml` was just added** (previously deploy config lived only in the Cloudflare dashboard). Since this repo is git-connected, Cloudflare's build pipeline may start reading `wrangler.toml` for deploy config going forward instead of (or alongside) the dashboard's Settings → Build tab. **Verify the next push deploys correctly** and that it updates the existing Worker (`folio-spine-barcode-print`) rather than creating a new one — if `name` in `wrangler.toml` doesn't match the existing Worker's name exactly, Cloudflare may treat it as a different Worker. Check the dashboard build log after the next push.
- **`npm audit` isn't automated.** `react-router` and `vite` are pinned to exact versions (no `^`), so security patches require a manual bump + `npm install`, not `npm update`.
- **Camera scanning depends on the `BarcodeDetector` API** (`BarcodeScanner.tsx`), which isn't available in all browsers (notably not Firefox/Safari as of last check). The UI degrades to manual entry, but this isn't something to "fix" — it's a browser support gap outside this repo's control.
- **Dark mode is incomplete and hidden from the UI.** Toggle logic exists (`useTheme()` in `App.tsx`) but the header button is commented out — see `CLAUDE.md` → "Dark mode" for the specific contrast bugs (`--card`/`--card-foreground`, header's literal `bg-white`) blocking it from being re-enabled.

## Scaling & Cloudflare costs
- This is a pure static-assets Worker (`wrangler.toml` `[assets]`, no server-side function/compute). Cloudflare's role is edge caching/serving of `dist/` — cost and latency scale with static-file requests, not with FOLIO API traffic (that goes browser → institution's OKAPI server directly, bypassing Cloudflare entirely).
- Free tier is very likely sufficient even at ~2,000 users given this traffic profile; confirm current limits against Cloudflare's pricing page before committing to that number publicly, since tier limits/pricing structures change.
- No caching invalidation concerns beyond a normal SPA — a new deploy replaces the built assets; users get the new version on next full page load.
- See `documentation-it.md` → "Scaling & what this means for your firewall/network team" for the explanation written for a non-dev IT/network audience.
- Not yet configured: rate limiting on the Worker itself. Not urgent at current scale, but if abuse ever becomes a concern (e.g. someone scripting requests to try FOLIO logins through the app), Cloudflare's rate limiting is a paid add-on to evaluate then, not now.

## Open decisions (not yet made — flagging for you)
- **Workers.dev subdomain includes your personal Cloudflare account name** (`kaseymccormick.workers.dev`). Options: rename the account's workers.dev subdomain (free, account-wide, limited rename frequency) or attach a custom domain (requires owning a domain, but decouples the app's URL from your personal Cloudflare account and from any future account changes). This matters more now that other institutions will be CORS-allowlisting this specific origin — changing it later breaks their config.
- **Whether FOLIO password should be storable at all**, even session-scoped. Alternative would be prompting for password on every lookup (no storage), which is more annoying but leaves zero credential residue in the browser, even within a tab's lifetime. Current sessionStorage approach is a middle ground — revisit if this ever handles more sensitive institutions/data.

## Decisions made
- **Committed `wrangler.toml`** (2026-07-20): reproducible deploy config in git outweighed the small risk of dashboard/file drift, especially since other people may fork this and need a working deploy config to start from. Config: `name = "folio-spine-barcode-print"`, static assets served from `./dist`, SPA fallback routing enabled (harmless even though the app doesn't currently use client-side routing).

## If someone forks this instead of using your deployment
Files a fork needs to update:
- `README.md` "For your FOLIO/IT admin" section hardcodes your deployed origin (`folio-spine-barcode-print.kaseymccormick.workers.dev`) — a fork must replace this with their own deployed URL, or the CORS instructions they hand to their IT department will be wrong.
- `CLAUDE.md` Deploy section documents *your* Cloudflare account/domain specifics (git remote, public URL) — not portable, a fork should overwrite this section for their own hosting.
- `wrangler.toml` `name` field (`folio-spine-barcode-print`) — a fork deploying to their own Cloudflare account should rename this to whatever they want their Worker called.
- `package.json` `name` field (`folio-spine-barcode-print`) is just a label, safe to leave or rename.
- **`src/assets/logo.svg` and the header title text in `App.tsx`** (`"Albertsons Library Spine & Barcode Label Printing Software"`) — this is now Boise State University / Albertsons Library specific branding, including their official athletics-style "B" logo mark. A fork for a different institution **must** replace both. This also means the FOLIO/OKAPI backend is the only part that was ever institution-agnostic — the UI itself is now branded for one specific library, which is a change from how this app started (previously generic).
  - **Trademark note**: the Boise State logo is presumably used here with implicit/actual permission since this was built for that library, but if this repo is ever made public or forked outside Boise State's control, that logo file shouldn't travel with it — it's someone else's trademark, not licensed under `ATTRIBUTIONS.md`'s MIT terms (which only covers the shadcn/ui components).
- Nothing in the *FOLIO-integration* code is hardcoded to a specific institution — `FolioSettings` collects OKAPI URL/tenant/credentials at runtime from the end user, so that part of the app is still portable without code changes. Only the *visual branding* and *documentation* (README, CLAUDE.md, this file) need updating per-fork.
- `ATTRIBUTIONS.md` (shadcn/ui, MIT) should stay in any fork per license terms — but note it does not cover `logo.svg`, which needs its own attribution/removal per the trademark note above.
