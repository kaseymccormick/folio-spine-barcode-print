# Spine Label Printer — Manual Test Plan (DRAFT for discussion)

Scope: **Chrome on Windows** is the supported environment (the scanner/printer computer). Chrome on Mac is not part of sign-off. Only Boise State uses the software today, so the other-institution section is deferred.

Purpose: a checklist that, when fully passed, lets us say "the software works completely" for Boise State's use. Nothing here has been signed off. Items marked **[P]** need the real printer/scanner; **[F]** need a real FOLIO login; **[X]** need a second institution.

## What is already automated
`npm test` (about 135 tests, ~1 second) covers the pure logic: the relay rules (SE-01 and more), suggested label lines (section 5 expected values), FOLIO lookup and token handling with a faked relay (parts of sections 2–3), Codabar sizing and format detection (BC-11 to BC-13), and bar trim math. **Run it before each push.** Those rows in this plan still need a real-world pass once, but they don't need re-running by hand after every change. Everything involving the printer, scanner, real FOLIO, the print dialog, and how things look is manual only. See `documentation-developer.md` → "Automated tests".

## How to use
- Run against the **deployed** site (not localhost) after a hard refresh. Record the live bundle name (`curl -s <site>/ | grep -o '/assets/index-[A-Za-z0-9_-]*\.js'`) and commit hash at the top of each run.
- Mark each row Pass / Fail / N/A and note the date and who ran it. A fail becomes a bug, and the row is re-run after the fix.
- Print tests: use Chrome with **Margins: None, Scale: 100%**. Note the printer settings used.

| Run info | Value |
|---|---|
| Date / tester | |
| Live bundle / commit | |
| Browser + version | |
| Printer, driver, speed, darkness, bar trim | |

## Test data to gather first
Real records from your catalog, so expected results are known:
1. Item barcode (14-digit) with an **LC call number**, no volume.
2. Item barcode with **volume / enumeration / chronology** (a bound journal).
3. Item barcode with a **location prefix** in the call number (e.g. "Archives ...").
4. Item with **no call number**.
5. An **ISBN** that is in FOLIO but scanned as an ISBN, not the item barcode.
6. A barcode that is **not in FOLIO**, and an ISBN that **is in Open Library**.
7. A **Dewey** item and a **SuDoc** item (see finding F-2 below before testing).
8. A value with **quotes or odd characters** (e.g. `12"34`, `<b>x</b>`).

---

## 1. Deploy and smoke
| ID | Test | Expected | Result |
|---|---|---|---|
| SM-01 | Open site, hard refresh | Loads, header/logo show, no error banner | |
| SM-02 | DevTools Console + Network on load | No CSP violations, no blocked or failed requests (fonts, scripts, images) | |
| SM-03 | Load site in a private window | Loads; theme follows system; nothing depends on stored data | |
| SM-04 | Open `/docs/label-printer-settings` directly (typed URL, then refresh) | Docs page loads, not a 404 | |
| SM-05 | Open an unknown path such as `/docs/nope` and `/foo` | Falls back to the normal app, no crash | |

## 2. FOLIO connection [F]
| ID | Test | Expected | Result |
|---|---|---|---|
| FC-01 | Correct URL, tenant, username, password, Test & Save | Green "Connected successfully"; header badge shows Connected | |
| FC-02 | Wrong password | Red "Auth failed (4xx)" message, not connected | |
| FC-03 | Wrong tenant ID | Red auth failed message | |
| FC-04 | OKAPI URL with `http://` | "Rejected before reaching FOLIO" message | |
| FC-05 | OKAPI URL as a bare IP (`https://1.2.3.4`) | Rejected message (by design) | |
| FC-06 | Typo'd but valid-looking host (`https://okapi.typo.example`) | "Could not reach your OKAPI gateway" (502) | |
| FC-07 | URL with a trailing slash, and with a path (`/authn/login` pasted in) | Trailing slash works; note what a pasted path does (expected: fails clearly) | |
| FC-08 | Test & Save button with any field empty | Button disabled | |
| FC-09 | Show/hide password toggle | Works; password hidden by default | |
| FC-10 | Reload the page after connecting | Still connected in the same tab | |
| FC-11 | Close the tab, reopen the site | **Not** connected; fields empty (session-only) | |
| FC-12 | Disconnect | Fields cleared, badge returns to "using Open Library fallback" | |
| FC-13 | DevTools → Application: check localStorage/sessionStorage/cookies | Password only in `sessionStorage` for this tab; nothing in localStorage | |
| FC-14 | Token expiry: stay connected 10+ min, then look up a barcode | Lookup still works (token refreshes) | |
| FC-15 | DevTools Network: watch requests during a lookup | Browser only calls the app's own `/api/folio/relay`, never OKAPI directly; password not in any URL | |
| FC-16 | API Request Log card | Shows each relayed call with method, status, note; **no password/token shown** | |

## 3. Looking up a barcode
| ID | Test | Expected | Result |
|---|---|---|---|
| LK-01 | Manual entry, FOLIO item barcode, press Enter | Book data appears; "Matched by: barcode" | [F] |
| LK-02 | Manual entry, ISBN that's only findable by ISBN | Book data appears; "Matched by: isbn"; volume/enumeration blank | [F] |
| LK-03 | Look Up button vs pressing Enter | Both work | |
| LK-04 | Input with spaces/dashes (`978-0 12`) | Stripped before lookup | |
| LK-05 | Empty or whitespace-only input | Look Up disabled / nothing happens | |
| LK-06 | Barcode not in FOLIO and not in Open Library | Clear error, app stays usable | [F] |
| LK-07 | Not connected to FOLIO, valid ISBN | Open Library result; label lines suggested from its LC/Dewey if present | |
| LK-08 | Connected, but FOLIO lookup fails (e.g. wrong barcode) and ISBN is in Open Library | Book shown with a "FOLIO lookup failed: ..." note in red | [F] |
| LK-09 | Two lookups quickly in a row | Final displayed book matches the **last** scan, no mixing | [F] |
| LK-10 | Value with quote/odd characters (`12"34`) | No error crash; query not broken (CQL escaping) | [F] |
| LK-11 | Value containing `<b>x</b>` | Shown as plain text everywhere (book data, labels), never rendered as HTML | |
| LK-12 | USB scanner scanning into the manual box | Digits arrive intact; trailing Enter triggers lookup, no extra characters | [P] |
| LK-13 | Camera mode: allow permission, scan a barcode | Scans automatically once, lookup runs | [P] |
| LK-14 | Camera mode: deny permission | Clear message; can switch to Manual | [P] |
| LK-15 | Camera mode in a browser without BarcodeDetector (only if you ever use one; not a supported browser) | Message "BarcodeDetector not supported", manual entry still works | |
| LK-16 | Switch Manual ↔ Camera back and forth | Camera stops when leaving; no stuck stream | [P] |
| LK-17 | Airplane mode / offline, then look up | Clear network error, no hang | |

## 4. Book data and diagnostics
| ID | Test | Expected | Result |
|---|---|---|---|
| BD-01 | Title, authors, year, publisher, call number | Match what FOLIO staff UI shows | [F] |
| BD-02 | Volume / enumeration / chronology on a journal item | Shown and match FOLIO | [F] |
| BD-03 | "JSON return" card | Expands; valid JSON of the book | |
| BD-04 | "API Request Log" card | Only appears when requests exist; lists calls | [F] |
| BD-05 | "Helpful Documentation" card | Collapsed by default, expands, link opens a new tab | |
| BD-06 | Very long title/author list | Layout doesn't break | |

## 5. Suggested label lines (per classification)
Verify against expected lines you write down from real records first.
| ID | Test | Expected | Result |
|---|---|---|---|
| CL-01 | LC call number `ND1329.T39 P43 2022` | Lines `ND / 1329 / .T39 / P43 / 2022` | |
| CL-02 | LC with location prefix (`Archives ND1329...`) | Prefix on its own first line | |
| CL-03 | LC + volume/enumeration/chronology | Appended after the call number | [F] |
| CL-04 | Journal system with chronology `(2006:Feb./2007:Jan.)` | Lines `2006 / Feb./2007 / Jan.` | [F] |
| CL-05 | Dewey (Open Library or FOLIO) | Split on whitespace; see F-2 | |
| CL-06 | SuDoc `SI 11.2:C 64` | `SI 11.2: / C 64` | |
| CL-07 | No call number | Fallback: 3 letters of author + year | |
| CL-08 | Call number that produces more than 8 lines | Capped at 8 | |
| CL-09 | Odd LC formats (no cutter, decimals, lowercase, spaces) | No crash; lines sensible or manually fixable | |
| CL-10 | Switch LC ↔ Dewey ↔ SuDoc ↔ Journal | Lines regenerate; header button highlights correctly | |

## 6. Label Format editor
| ID | Test | Expected | Result |
|---|---|---|---|
| ED-01 | Edit a line | Preview updates live | |
| ED-02 | Add line until the max, remove down to the min | Buttons disable at limits | |
| ED-03 | Font size 9 → 18 | Preview scales; label still fits | |
| ED-04 | "Reset to suggested" | Restores lines from lookup | |
| ED-05 | Edit lines, then scan a **new** barcode | Lines replaced with new suggestions (confirm this is what you want) | |
| ED-06 | Blank line in the middle | Prints as a blank row, spacing kept | |

## 7. Label size toggle (1 1/8" vs 2")
| ID | Test | Expected | Result |
|---|---|---|---|
| SZ-01 | Toggle sizes with each panel showing | Spine, barcode, and property tag previews all change orientation together | |
| SZ-02 | Toggle after adjusting other settings | Nothing else resets unexpectedly | |

## 8. Printing spine labels [P]
Test at **both** sizes.
| ID | Test | Expected | Result |
|---|---|---|---|
| SP-01 | 1 copy | Exactly 1 label, 1 page, nothing cut off | |
| SP-02 | 2, 5, 10 copies | Exactly N labels, N pages/labels, each identical | |
| SP-03 | 100 copies (max) | Prints 100; no browser hang | |
| SP-04 | Copies box: type 0, -1, 101, blank, letters | Clamped to 1–100, no crash | |
| SP-05 | +/- and reset-to-1 buttons | Work | |
| SP-06 | Label with 8 lines at 18pt | Fits or fails obviously (note which); text not silently cut | |
| SP-07 | Long single line | Not cut off on the label edge | |
| SP-08 | Printed size measured with a ruler | Matches 1 1/8" or 2" stock; text orientation right for stock feed | |
| SP-09 | Cancel the print dialog, then print again | Works, no duplicate/leftover pages | |
| SP-10 | Print barcode label, then spine label | Only the spine label prints (no stale barcode pages) | |
| SP-11 | Print with margins left at browser "Default" | Note what breaks (documents the need for None) | |
| SP-12 | Text with `<` `&` `"` | Printed literally | |

## 9. Printing barcode labels [P]
| ID | Test | Expected | Result |
|---|---|---|---|
| BC-01 | 14-digit item barcode preview | Caption says `codabar`; bars edge to edge; digits `1/4/8/1` grouping under bars | |
| BC-02 | Print **1 copy** | Exactly 1 label, 1 page, last digit fully visible | |
| BC-03 | Print **several copies** (2, 5, 10) | Exactly N labels, each complete | |
| BC-04 | Print 100 copies | Prints; no hang; consistent quality first to last | |
| BC-05 | Scan the **printed** label back into the app | Same 14 digits, first try; repeat on 10 labels for a read rate | |
| BC-06 | Scan the printed label with the **library's real scanner/ILS** (circulation) | Reads and matches the item | |
| BC-07 | Bar trim default on a fresh browser profile | Starts at 0.50 | |
| BC-08 | Change trim, reload | Value remembered; Reset returns to 0.50 | |
| BC-09 | Trim at 0, 0.25, 0.5, 0.75, 1.0 | Note the scan-success range so we know the safe window | |
| BC-10 | Both label sizes | Complete, readable, correct orientation | |
| BC-11 | 13-digit ISBN | Caption `EAN13`, prints | |
| BC-12 | 12-digit, 8-digit values | `UPC`, `EAN8` | |
| BC-13 | Other lengths (10, 15, 20 digits) | `CODE128`; prints; note the scanner reads it | |
| BC-14 | Letters / symbols in the value | Clear "Cannot render" message or sensible output, no crash | |
| BC-15 | 14-digit value with a **wrong** check digit | Prints anyway (no validation today); decide if a warning is wanted | |
| BC-16 | Print on regular paper at 100% | Scannable | |
| BC-17 | Print on label stock after printer power-cycle and after changing rolls | Still scans; recalibrate if not | |
| BC-18 | Consistency: print 20 in a row | No drift in bar thickness or darkness | |
| BC-19 | Different Windows user/profile and different PC | Works with the documented settings | |

## 10. Property tag [P]
| ID | Test | Expected | Result |
|---|---|---|---|
| PT-01 | Preview both sizes | Text correct, orientation matches | |
| PT-02 | Print 1 and several copies | N labels, complete | |
| PT-03 | Print sequence spine → barcode → tag | Each prints only its own content | |

## 11. UI, theme, and browsers
| ID | Test | Expected | Result |
|---|---|---|---|
| UI-01 | Dark mode toggle; reload | Persists; text readable everywhere; labels themselves stay white | |
| UI-02 | First visit with OS in dark mode | Starts dark | |
| UI-03 | Narrow window / tablet width | No overlap; usable | |
| UI-04 | Keyboard only: tab through, open accordions | Reachable and operable | |
| UI-05 | Same core flow on Chrome for Windows (required). Other browsers/OSes are unsupported and untested | Lookup + print works; print CSS `@page` size honored | |
| UI-06 | Browser zoom 80% / 125% | Print output size unchanged | |

## 12. Security and relay checks (run from a terminal)
Replace `SITE` with the live URL.
```
# should each return 400, not 200/500
curl -s -o /dev/null -w "%{http_code}\n" -X POST SITE/api/folio/relay -d '{"targetUrl":"http://okapi.example.org/authn/login","method":"POST"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST SITE/api/folio/relay -d '{"targetUrl":"https://127.0.0.1/authn/login","method":"POST"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST SITE/api/folio/relay -d '{"targetUrl":"https://okapi.example.org/admin","method":"POST"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST SITE/api/folio/relay -d '{"targetUrl":"https://okapi.example.org/authn/login","method":"DELETE"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST SITE/api/folio/relay -d 'null'
```
| ID | Test | Expected | Result |
|---|---|---|---|
| SE-01 | The five commands above | All `400` | |
| SE-02 | `GET SITE/api/folio/relay` | Not a working endpoint (returns the app page, not data) | |
| SE-03 | Response headers on the site | CSP, `X-Content-Type-Options`, Referrer-Policy present | |
| SE-04 | No credentials anywhere in browser history/URLs | Confirmed | |
| SE-05 | Send 100 rapid requests to the relay | Note behavior; **no rate limiting is configured** (known gap) | |
| SE-06 | `npm audit` | Record current advisories; none in shipped code | |

## 13. Other institutions [X] — DEFERRED (no other institution uses this yet)
| ID | Test | Expected | Result |
|---|---|---|---|
| OI-01 | A different library with its own FOLIO logs in and looks up an item | Works with no change to their OKAPI | |
| OI-02 | Their OKAPI uses a DNS name, tenant differs | Works | |
| OI-03 | Their catalog lacks holdings call numbers or uses Dewey | Behavior understood (see F-2) | |
| OI-04 | Their printer/label stock differs | Documented what must change (`PRINTER_DPI`, label sizes) | |

## 14. Documentation walk-through
| ID | Test | Expected | Result |
|---|---|---|---|
| DC-01 | Follow `documentation-user.md` start to finish as a new user | Every step and button name matches the app | |
| DC-02 | Follow `documentation-it.md` on a colleague's IT view | Nothing misleading; "no CORS" is true for them | |
| DC-03 | Label Printers Settings help page | Written (currently a placeholder) | |

---

## Findings from reading the code (to discuss, not tested yet)
- **F-1: No check-digit validation.** A mistyped 14-digit barcode prints without any warning (BC-15). A mod-10 warning would be easy to add.
- **F-2: Dewey/SuDoc from FOLIO.** For FOLIO results, `deweyCallNumber` and `sudocCallNumber` are always empty, so those systems use the same call number FOLIO returned (`callNumber`), just split differently. Confirm that's acceptable for your catalog.
- **F-3: New scan overwrites edited lines** (ED-05). Intended?
- **F-4: No rate limiting** on the relay (SE-05).
- **F-5: Barcode sizing is tuned to one printer** (203 dpi, 2-dot bars). Another library's printer may need different constants.
- **F-6: Automated tests now cover the pure logic** (see "What is already automated"); printing, scanning, and real-FOLIO behavior remain manual.

## Decisions so far
- Supported environment: Chrome on Windows only.
- Other institutions: deferred until one actually wants to use it.
- A one-page post-deploy check now exists: `documentation-quick-check.md`.

## Still open
1. Acceptance bar: does "works completely" mean every row in sections 1–12 passes, or a smaller core set?
2. Do you want tests to gate Cloudflare deploys (build command `npm test && npm run build`), or just report on GitHub?
3. Check-digit warning (F-1) and relay rate limiting (F-4): before sign-off, or after?
