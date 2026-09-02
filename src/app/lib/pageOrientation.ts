export type PageOrientation = "portrait" | "landscape";

const STYLE_ID = "page-orientation";

// Chrome (and other browsers) read @page { size: ... } as the default
// selection in the print dialog's Layout dropdown — not a lock, but it saves
// the user from having to flip it by hand for every label type.
export function setPageOrientation(orientation: PageOrientation) {
  const el = document.getElementById(STYLE_ID);
  if (el) el.textContent = `@page { size: ${orientation}; }`;
}
