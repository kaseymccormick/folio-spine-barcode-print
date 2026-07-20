# Changelog

Notable changes, in plain language. For full commit-by-commit history see `git log`.

## Unreleased
- Added user-facing documentation: `documentation-user.md`, `documentation-it.md`, `documentation-developer.md`.
- Added `CHANGELOG.md` (this file).
- Added `wrangler.toml` so deploy configuration lives in the repo instead of only in the Cloudflare dashboard — no behavior change expected, but worth confirming the next deploy still works as intended.
- Fixed a potential security issue where label text from the catalog could have been inserted into the page unsafely during printing — now built safely, no user-visible change.
- Documented Cloudflare scaling/cost expectations and what to tell IT/network teams as usage grows.
- Rebranded the app with the Boise State University / Albertsons Library logo and a new title. Header is now white with an updated color scheme (primary blue, green accent color used on the "Test & Save" button and other accent elements).
- Added a favicon and browser tab/home-screen icon set.
- Added light/dark mode switching logic, but the toggle is not currently shown in the app — dark mode has known display bugs and isn't ready for use yet.

## 2026-07-20 — Multi-user hardening
- FOLIO login credentials now clear automatically when you close the browser tab, instead of staying saved indefinitely — safer on shared/work computers.
- Fixed a bug where a barcode or ISBN containing certain characters could interfere with catalog searches.
- Added security headers (CSP) to the deployed site to reduce the impact of any future script-injection bug.
- Updated dependencies to patch known security issues (0 vulnerabilities as of this release).
- Removed leftover template files from the original Figma-generated scaffold; cleaned up project metadata.

## Earlier
- Initial usable version: scan/enter a barcode or ISBN, look up the book via FOLIO (with Open Library fallback), edit and print spine labels and barcode labels.
- Deployed to Cloudflare Workers.
