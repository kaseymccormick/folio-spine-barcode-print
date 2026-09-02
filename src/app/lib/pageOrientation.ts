const STYLE_ID = "page-orientation";

// Chrome (and other browsers) read @page { size: <w> <h> } as the paper size
// AND default Layout orientation for the print dialog — set to the exact
// printed content size (in inches) so the browser asks the printer driver
// for that custom size directly, instead of falling back to a default page
// (e.g. Letter) that the label content then only fills a corner of, leaving
// the rest to spill onto a second, blank page. This also lets the page
// override whatever default stock size is configured in the printer driver
// (e.g. Zebra's utility) — the driver just needs to accept custom sizes.
export function setPageSizeIn(widthIn: number, heightIn: number) {
  const el = document.getElementById(STYLE_ID);
  if (el) el.textContent = `@page { size: ${widthIn}in ${heightIn}in; }`;
}
