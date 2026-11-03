# Printer Compatibility Check

Use this to confirm a **specific printer, driver, and computer** works correctly with the app. Run it:
- when setting up a new printer or computer,
- after a driver, firmware, or browser update,
- after changing label stock (new roll type or size),
- whenever labels start printing wrong and you need to find out why.

It is about the printer, not the catalog lookup. For the full test plan see `documentation-testing.md`; for a quick post-deploy check see `documentation-quick-check.md`. Settings guidance is in `documentation-user.md` ("Printing barcode labels on the Zebra ZD421").

Supported environment: **Chrome on Windows**. Other browsers are untested.

## Before you start

| Record | Value |
|---|---|
| Date / tester | |
| Printer model and firmware | |
| Driver name and version | |
| Computer / Windows user | |
| Chrome version | |
| Label stock (size, type, roll) | |
| Printer speed / darkness | |
| App Bar trim value | |

**Setup:**
1. Open the deployed app and hard refresh (Ctrl+Shift+R).
2. Look up one real 14-digit item barcode that has a call number, so every label type has real content. (A lookup is only needed for the spine and barcode labels. Property Tag and Custom Label need none.)
3. In the browser print dialog for every test below, set **Margins: None** and **Scale: 100%**. Choose the label printer, not a regular printer.
4. Have a ruler, and a barcode scanner (the library's real one if possible).
5. Work in order. Each section assumes the earlier ones passed. **If a section fails, stop and fix it before continuing** (see "If a test fails" at the end).

Mark each row **Pass / Fail / N/A**.

## 1. Printer is reachable and takes the right size

| ID | Test | Expected | Result |
|---|---|---|---|
| PR-01 | Printer is on, has labels loaded, and shows ready (no error light) | Ready | |
| PR-02 | Print a driver test page from Windows | Prints on the label stock, not cut off | |
| PR-03 | In the app, click the print button on **Property Tag** (1 copy). In the Chrome dialog, check the paper size shown | Dialog offers the label printer; paper size is a custom size matching the label (not Letter/A4) | |
| PR-04 | Print it | One label comes out, no blank labels before or after | |
| PR-05 | Cancel the dialog instead of printing, then print again | Prints normally; no leftover or duplicate label | |

If PR-03 shows Letter or A4, the driver is not accepting custom sizes. Fix that before anything else.

## 2. Property Tag, both label sizes

Switch the label size with the **1 1/8"** / **2"** buttons in the top-right header, then print one tag at each.

| ID | Test | Expected | Result |
|---|---|---|---|
| PR-10 | 1 1/8", 1 copy | Both lines fully visible, nothing cut off, correct orientation for the stock feed | |
| PR-11 | 2", 1 copy | Same text, rotated 90°, fully visible | |
| PR-12 | Measure the printed label edge to edge with a ruler | Content fits the stock; no clipping at any edge | |
| PR-13 | Print 5 copies | Exactly 5 labels, all identical, no extras or blanks | |

## 3. Custom Label

| ID | Test | Expected | Result |
|---|---|---|---|
| PR-20 | Click the box, type a line of text, print 1 at each size | Text matches the on-screen box; fits; correct orientation | |
| PR-21 | Make one word **bold**, one *italic*, one underlined; center, left, and right align a line each; print | Printed formatting matches the screen | |
| PR-22 | Font size 6, 12, and 18 pt (print each) | Sizes visibly differ; none cut off except 18 pt with long text (which should show the red warning on screen) | |
| PR-23 | Switch font to Serif, then Monospace; print one | Printed font matches the choice | |
| PR-24 | Two or three lines of text | Vertically centered; no line cut off | |
| PR-25 | Print 3 copies | Exactly 3 labels | |

## 4. Spine labels

Use the looked-up item. Print at each size.

| ID | Test | Expected | Result |
|---|---|---|---|
| PR-30 | 1 copy at 1 1/8" | One label; every line complete; nothing cut off | |
| PR-31 | 1 copy at 2" | One label; correct rotation; every line complete | |
| PR-32 | 3 copies | Exactly 3 labels, identical | |
| PR-33 | Longest realistic call number you have (4+ lines) | All lines fit on the label | |
| PR-34 | Compare the printed text to the on-screen preview | Same lines, same order | |

## 5. Barcode labels

| ID | Test | Expected | Result |
|---|---|---|---|
| PR-40 | 14-digit item barcode, 1 copy, each size | One label; bars run edge to edge; **last digit fully visible**; one page | |
| PR-41 | Look closely at the bars (magnifier if needed) | Distinct white gaps between bars; no bars bleeding together | |
| PR-42 | **Scan the printed label** into the app's manual box | The same 14 digits, first try | |
| PR-43 | Scan 10 printed labels | All read on the first try. Record any that fail: ____ of 10 | |
| PR-44 | Scan the printed label with the library's real scanner / ILS | Reads and matches the item | |
| PR-45 | Print 5 copies | Exactly 5 labels, all complete and scannable | |
| PR-46 | Bars too thick or merging? Raise **Bar trim** in 0.25 steps and reprint. Bars breaking up or unreadable? Lower it. Record the final value that scans reliably | Final Bar trim: ____ | |
| PR-47 | Reload the page | Bar trim value is remembered; reset button returns it to 0.5 | |

Known good Zebra ZD421 (203 dpi) settings are in `documentation-user.md`: speed 2, darkness 4, the `203dpi` driver with dithering set to Clipart, Bar trim 0.5.

## 6. Mixing label types

Labels from one type must not leak into the next print.

| ID | Test | Expected | Result |
|---|---|---|---|
| PR-50 | Print a barcode label, then a spine label | Only the spine label prints | |
| PR-51 | Print Property Tag, then Custom Label, then spine label | Each prints only its own content | |
| PR-52 | Print a Custom Label with 3 copies, then Property Tag with 1 | Exactly 1 label from the second print | |

## 7. Repeatability

| ID | Test | Expected | Result |
|---|---|---|---|
| PR-60 | Print 20 barcode labels in one go | Same bar thickness and darkness first to last; scan 3 spread across the batch | |
| PR-61 | Print 20 spine labels in one go | No drift or clipping; none missing | |
| PR-62 | Power-cycle the printer, print one barcode label | Still scans | |
| PR-63 | Change to a new roll, recalibrate if the printer needs it, print one of each label type | Still fits and scans | |
| PR-64 | Print from a different Windows user or computer using the same settings | Same result | |

## 8. Recovering from problems

| ID | Test | Expected | Result |
|---|---|---|---|
| PR-70 | Leave the printer out of labels, try to print, then reload labels | Job prints after reloading, or can be cleared in the Windows queue; app still works | |
| PR-71 | Print dialog: change Scale to something other than 100% on purpose, print a barcode | Note the result (documents why 100% is required) | |
| PR-72 | Print dialog: leave Margins at Default on purpose | Note what breaks (documents why None is required) | |

## Sign-off

| | |
|---|---|
| Sections 1–7 all Pass | ☐ |
| Final Bar trim value for this printer | |
| Failures and how they were resolved | |
| Tester / date | |

**All of sections 1–7 passing means this printer and computer are good for real labels.** Any Fail: note it above and tell the developer before using the printer for real work.

## If a test fails

| Symptom | Likely cause and fix |
|---|---|
| Dialog shows Letter or A4 size (PR-03) | Driver doesn't accept custom paper sizes. Reinstall or reconfigure the driver. |
| Label prints across two pages, or the last digit is cut off | Margins not None, or Scale not 100%. |
| Blank label before or after each print | Stock size set in the driver doesn't match the actual label; recalibrate the printer. |
| Barcode bars too thick or won't scan | Lower darkness, check speed, use the Clipart dithering setting, and adjust Bar trim (PR-46). |
| Text rotated the wrong way for the stock | Check the 1 1/8" / 2" size button matches the roll in the printer. |
| Labels print a different type than expected | Hard refresh the app and retry; if it repeats, report it (PR-50 to PR-52). |
