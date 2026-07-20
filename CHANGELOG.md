# Changelog

Notable changes, in plain language. For full commit-by-commit history see `git log`.

## Unreleased
- Added user-facing documentation: `documentation-user.md`, `documentation-it.md`, `documentation-developer.md`.
- Added `CHANGELOG.md` (this file).

## 2026-07-20 — Multi-user hardening
- FOLIO login credentials now clear automatically when you close the browser tab, instead of staying saved indefinitely — safer on shared/work computers.
- Fixed a bug where a barcode or ISBN containing certain characters could interfere with catalog searches.
- Added security headers (CSP) to the deployed site to reduce the impact of any future script-injection bug.
- Updated dependencies to patch known security issues (0 vulnerabilities as of this release).
- Removed leftover template files from the original Figma-generated scaffold; cleaned up project metadata.

## Earlier
- Initial usable version: scan/enter a barcode or ISBN, look up the book via FOLIO (with Open Library fallback), edit and print spine labels and barcode labels.
- Deployed to Cloudflare Workers.
