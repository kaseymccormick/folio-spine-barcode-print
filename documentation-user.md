# Spine Label Printer — User Guide

## What this does
Scans or types in a book's barcode/ISBN, looks up the book in your library catalog, and generates printable spine labels (call number) and barcode labels.

## 1. Open the app
1. Go to the app URL provided by your library (e.g. `https://folio-spine-barcode-print.kaseymccormick.workers.dev`).

## 2. Connect to your catalog (one-time, per device)
1. Click **Catalog Source → FOLIO Integration** to expand it.
2. Enter:
   - **OKAPI URL** — your library's FOLIO gateway address (ask your IT department if you don't have this).
   - **Tenant ID** — your library's FOLIO tenant name.
   - **Username** / **Password** — your own FOLIO login.
3. Click **Test & Save**.
   - Green message = connected.
   - Red message = check the values above, or see "Troubleshooting" below.
4. If you skip this step, the app still works — it falls back to Open Library for basic title/author/call-number lookups, but won't have your library's holdings data (volume, item barcode match, etc.).

**Note:** Your password is only kept for this browser tab. Closing the tab clears it — you'll need to log in again next time. **On a shared/public workstation, click Disconnect (or close the tab) when you're done** — if the tab is left open all day, the next person to use that computer stays logged in as you until it's closed.

## 3. Scan or enter a barcode
1. Under **Scan Barcode**, choose:
   - **Manual / USB Scanner** — click into the text box, scan with a USB barcode scanner (it types like a keyboard) or type the ISBN/barcode by hand, then press **Look Up**.
   - **Camera** — click **Camera**, allow camera access when your browser asks, and hold the barcode inside the frame. It scans automatically. If your browser doesn't support camera scanning, it'll tell you to switch to Manual.
2. Wait for **Fetching book data…** to finish.

## 4. Review the book data
- Title, authors, year, publisher, and call number(s) appear on the left.
- Switch classification system (**LC / Dewey / SuDoc / Journal**) using the buttons in the top-right header — the label updates to match. **Journal** uses the LC call number plus volume/issue/date lines.
- If no call number was found, you'll see a note — you can still fill in the label manually (step 5).

## 5. Edit the label
1. Under **Label Format**, edit the call number lines and font size as needed.
2. Click **Reset to suggested** to restore the suggested lines from the catalog lookup.
3. Choose the label size (**1 1/8"** or **2"**) with the buttons in the top-right header, next to the classification buttons. It applies to spine, barcode, and property tag labels.

## 6. Print
1. Under **Spine Label — Preview & Print**, review the spine label, set **Copies**, then click the print button. (You can also use your browser's print function, Ctrl/Cmd+P, but the print button sets the right page size for you.)
2. Under **Barcode Label — Preview & Print**, same process for the barcode label.
3. **Property Tag** prints a fixed "Albertsons Library / Boise State University" tag — set **Copies** and click print.
4. Set your printer to the correct label size before printing (check label stock dimensions against the size chosen in the header, step 5).
5. In the browser print dialog, set **Margins** to **None** and **Scale** to **100%**.

### Printing barcode labels on the Zebra ZD421 (203 dpi)
Barcode labels for 14-digit library barcodes are printed as Codabar. On a 203 dpi thermal printer the bars are only 2 printer dots wide, so heat spread can make them print too thick to scan. These settings are known to work:
- **Printer (Zebra Setup Utilities):** speed **2**, darkness **4**.
- **Driver:** use the `203dpi` driver, with the dithering slider set to **Clipart** (hard black/white instead of halftone).
- **In the app:** **Bar trim (printer dots)**, under the barcode preview, defaults to **0.5**, so you shouldn't need to touch it. It appears only for Codabar barcodes and any change is remembered in that browser. If bars still print too thick, raise it in 0.25 steps; if they break up or won't scan, lower it. The reset button returns it to 0.5.

## Troubleshooting
| Problem | What to do |
|---|---|
| "Auth failed" when testing FOLIO connection | Double-check username/password and tenant ID. If they're correct, ask your IT department to confirm your account has API access. |
| "Rejected before reaching FOLIO — check the OKAPI URL" | Double-check the OKAPI URL — it must start with `https://` and use a hostname, not an IP address. |
| "Network error reaching this app's server" | Rare — try again. If it keeps happening, the app itself may be down; check with whoever runs it. |
| Barcode label prints as thick black bars, or won't scan | See "Printing barcode labels on the Zebra ZD421" above: lower the printer darkness and check that Bar trim is at its default of 0.5 (reset button). |
| Barcode label prints across two pages, or the last digit is cut off | In the print dialog, set Margins to None and Scale to 100%. |
| Camera won't start | Your browser blocked camera access, or your device has no camera. Click **Manual / USB Scanner** instead. |
| No call number found | Try switching classification system (LC/Dewey/SuDoc) — some catalogs only have one. Otherwise, enter it manually in Label Format. |
| Lookup fails entirely | You can still fill in the label by hand under Label Format — the rest of the app works without a catalog match. |
