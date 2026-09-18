# Changelog

Notable changes, in plain language. For full commit-by-commit history see `git log`.

## Unreleased
- Added automated tests (`npm test`, about 135 tests) for the FOLIO relay rules, suggested label lines, FOLIO lookup logic, barcode format/sizing, plus a GitHub check that runs them on every push. Some logic was moved into `src/app/lib/` to make it testable, with no change to how the app behaves.
- Added a collapsed "Helpful Documentation" card under the API Request Log. Each entry opens its own page in a new tab; the first, "Label Printers Settings", is a placeholder until its content is written.
- FOLIO requests now go through a small relay on the app's own server instead of straight from the browser, so your OKAPI gateway no longer needs CORS configured. Credentials pass through it in transit only and are never stored or logged. Documentation updated to match.
- Hardened the FOLIO relay: it no longer follows redirects, only accepts GET/POST with the headers OKAPI needs, and rejects IP-address and internal hostnames. OKAPI URLs must use a DNS name, not a bare IP.
- Removed the Google Fonts request; the app now uses standard system fonts, which also fixes a blocked-request error from the security headers.
- Fixed barcode labels: 14-digit library barcodes now print as Codabar, the barcode is no longer cut off at the right edge, and labels no longer spill onto a second page or lose the last digit.
- Added a "Bar trim" setting (default 0.5) for barcode labels so thin bars print cleanly on the 203 dpi Zebra thermal printer, plus printer settings guidance in the user guide.
- Added user-facing documentation: `documentation-user.md`, `documentation-it.md`, `documentation-developer.md`.
- Added `CHANGELOG.md` (this file).
- Added `wrangler.toml` so deploy configuration lives in the repo instead of only in the Cloudflare dashboard — confirmed working, no deploy disruption.
- Fixed a potential security issue where label text from the catalog could have been inserted into the page unsafely during printing — now built safely, no user-visible change.
- Documented Cloudflare scaling/cost expectations and what to tell IT/network teams as usage grows.
- Rebranded the app with the Boise State University / Albertsons Library logo and a new title. Header is now white with an updated color scheme (primary blue, green accent color used on the "Test & Save" button and other accent elements).
- Added a favicon and browser tab/home-screen icon set.
- Added `TRADEMARK.md` and a neutral placeholder logo (`src/assets/logo-placeholder.svg`) for anyone forking this for another institution.
- Light/dark mode toggle is now live in the header (top right). Dark mode's colors were rebuilt from the Boise State brand palette (blues, warm grays) instead of generic dark-theme defaults, so labels, inputs, and toggles are readable against the dark background.

## 2026-07-20 — Multi-user hardening
- FOLIO login credentials now clear automatically when you close the browser tab, instead of staying saved indefinitely — safer on shared/work computers.
- Fixed a bug where a barcode or ISBN containing certain characters could interfere with catalog searches.
- Added security headers (CSP) to the deployed site to reduce the impact of any future script-injection bug.
- Updated dependencies to patch known security issues (0 vulnerabilities as of this release).
- Removed leftover template files from the original Figma-generated scaffold; cleaned up project metadata.

## Earlier
- Initial usable version: scan/enter a barcode or ISBN, look up the book via FOLIO (with Open Library fallback), edit and print spine labels and barcode labels.
- Deployed to Cloudflare Workers.
