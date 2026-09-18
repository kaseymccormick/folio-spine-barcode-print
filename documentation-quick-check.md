# Quick Check After Each Deploy (about 10 minutes)

Run on the scanner computer: **Chrome on Windows**. Print dialog: **Margins: None, Scale: 100%**. Printer: speed 2, darkness 4, 203dpi driver, dithering Clipart. Bar trim should read **0.50**.

Date: ________  Tester: ________  Live bundle (`index-XXXX.js`): ________

Hard-refresh first (Ctrl+Shift+R). Have ready: one real item barcode, one ISBN that is not in FOLIO.

| # | Check | Pass |
|---|---|---|
| 1 | Site loads, logo and header show, no error message on screen | ☐ |
| 2 | FOLIO Integration: enter URL, tenant, username, password, **Test & Save**. Green "Connected successfully" | ☐ |
| 3 | Look up the real item barcode. Title, authors, and call number match FOLIO | ☐ |
| 4 | Suggested spine lines look right for that call number. Switch LC / Dewey / Journal: lines update | ☐ |
| 5 | Look up the ISBN that is not in FOLIO: falls back with a note, or a clear error. App still works after | ☐ |
| 6 | **Spine label, 1 copy**: prints exactly one label, nothing cut off | ☐ |
| 7 | **Spine label, 3 copies**: prints exactly three labels | ☐ |
| 8 | **Barcode label, 1 copy**: one page, bars complete, last digit visible | ☐ |
| 9 | Scan that printed barcode label into the app's manual box: same 14 digits, first try | ☐ |
| 10 | **Barcode label, 3 copies**: three labels, all scan | ☐ |
| 11 | **Property tag**: prints one label, text correct | ☐ |
| 12 | Switch label size 1 1/8" ↔ 2": previews change orientation; print one barcode label at the other size and check it fits | ☐ |
| 13 | Dark mode toggle works and the choice survives a reload | ☐ |
| 14 | Helpful Documentation card expands and the link opens a new tab | ☐ |
| 15 | Click **Disconnect**: badge returns to "using Open Library fallback" | ☐ |

**Result:** all boxes checked = deploy is good. Any unchecked box: write what happened below and tell the developer before using it for real labels.

Notes: ______________________________________________________________

If barcode labels print too thick or won't scan: printer darkness 4, speed 2, Bar trim 0.50 (reset button), dithering Clipart. See `documentation-user.md` → "Printing barcode labels on the Zebra ZD421".
