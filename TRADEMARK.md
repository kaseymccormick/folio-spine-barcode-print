# Trademark Notice

`src/assets/logo.svg` contains the Boise State University "B" mark and the
Albertsons Library name. These are trademarks of Boise State University,
used here because Boise State University / Albertsons Library are the
organization distributing this software.

**This trademark is not covered by any open-source license in this
repository.** `ATTRIBUTIONS.md` (MIT) applies only to the shadcn/ui
components — it does not extend to `logo.svg` or any Boise State /
Albertsons Library branding, including the app title text in `App.tsx`.

## If you fork this repository

Before deploying a fork for any organization other than Boise State
University / Albertsons Library, you must:

1. Replace `src/assets/logo.svg` — a neutral placeholder is provided at
   `src/assets/logo-placeholder.svg` (a plain bookmark icon, MIT/ISC-licensed
   via [lucide-react](https://lucide.dev)) and already wired up as a
   drop-in swap. See `documentation-developer.md` for the exact import to
   change in `App.tsx`.
2. Replace the header title text ("Albertsons Library Spine & Barcode
   Label Printing Software") in `App.tsx`.
3. Not reuse Boise State University's name, mark, or colors to imply
   endorsement by or affiliation with Boise State University.
