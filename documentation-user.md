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
- Switch classification system (**LC / Dewey / SuDoc**) using the buttons in the top-right header — the label updates to match.
- If no call number was found, you'll see a note — you can still fill in the label manually (step 5).

## 5. Edit the label
1. Under **Label Format**, edit the call number lines, font size, number of copies, and label size as needed.
2. Click **Reset** to restore the suggested lines from the catalog lookup.

## 6. Print
1. Under **Spine Label — Preview & Print**, review the spine label, then use your browser's print function (Ctrl/Cmd+P) to print.
2. Under **Barcode Label — Preview & Print**, same process for the barcode label.
3. Set your printer to the correct label size before printing (check label stock dimensions against the size set in step 5).

## Troubleshooting
| Problem | What to do |
|---|---|
| "Auth failed" when testing FOLIO connection | Double-check username/password and tenant ID. If they're correct, ask your IT department to confirm your account has API access. |
| "Network error — check the URL and that CORS is enabled" | This is not something you can fix yourself — send your IT department the note in this app's README under "For your FOLIO/IT admin," or see `documentation-it.md`. |
| Camera won't start | Your browser blocked camera access, or your device has no camera. Click **Manual / USB Scanner** instead. |
| No call number found | Try switching classification system (LC/Dewey/SuDoc) — some catalogs only have one. Otherwise, enter it manually in Label Format. |
| Lookup fails entirely | You can still fill in the label by hand under Label Format — the rest of the app works without a catalog match. |
