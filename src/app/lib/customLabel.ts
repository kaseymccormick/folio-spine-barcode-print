export const CUSTOM_FONTS = {
  sans: { title: "Sans-serif", css: "'Helvetica Neue', Arial, sans-serif" },
  serif: { title: "Serif", css: "Georgia, 'Times New Roman', serif" },
  mono: { title: "Monospace", css: "'Courier New', Courier, monospace" },
} as const;

export type CustomFontKey = keyof typeof CUSTOM_FONTS;

export const CUSTOM_FONT_MIN_PT = 4;
export const CUSTOM_FONT_MAX_PT = 36;

export function clampFontPt(n: number): number {
  if (!Number.isFinite(n)) return 9;
  return Math.max(CUSTOM_FONT_MIN_PT, Math.min(CUSTOM_FONT_MAX_PT, Math.round(n)));
}

export function clampCopies(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(100, Math.floor(n)));
}

const ALIGNS = new Set(["left", "center", "right"]);

/**
 * Copies user-edited rich text from `src` into `dest`, keeping only bold,
 * italic, underline, line breaks and per-block alignment. Everything else
 * (scripts, attributes, images, pasted styles, ...) is dropped — nodes are
 * built with createElement/textContent, never by assigning HTML.
 */
export function copySafeContent(src: Node, dest: Node, doc: Document = document): void {
  src.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      dest.appendChild(doc.createTextNode(node.textContent ?? ""));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style") return;
    if (tag === "br") {
      dest.appendChild(doc.createElement("br"));
      return;
    }

    let target: Node = dest;
    const wrap = (name: string, style?: string) => {
      const w = doc.createElement(name);
      if (style) w.style.cssText = style;
      target.appendChild(w);
      target = w;
    };

    if (tag === "div" || tag === "p") {
      const align = el.style.textAlign || el.getAttribute("align") || "";
      wrap("div", ALIGNS.has(align) ? `text-align:${align}` : undefined);
    }
    const weight = el.style.fontWeight;
    if (tag === "b" || tag === "strong" || weight === "bold" || Number(weight) >= 600) wrap("b");
    if (tag === "i" || tag === "em" || el.style.fontStyle === "italic") wrap("i");
    if (tag === "u" || el.style.textDecoration.includes("underline")) wrap("u");

    copySafeContent(el, target, doc);
  });
}

/** True when the sanitized content has no visible text. */
export function isBlank(root: Node): boolean {
  return (root.textContent ?? "").trim() === "";
}
