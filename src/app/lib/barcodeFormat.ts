export const PX_PER_IN = 96;

export function detectFormat(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 13) return "EAN13";
  if (digits.length === 12) return "UPC";
  if (digits.length === 8) return "EAN8";
  // 14-digit library item barcodes (1/4/8/1 grouping below) use Codabar,
  // mod 10 check digit as the last digit.
  if (digits.length === 14) return "codabar";
  return "CODE128";
}

// Codabar is drawn at an exact 2 dots per module for the 203 dpi Zebra ZD421
// so no bar gets rounded to a different width when rasterized.
export const PRINTER_DPI = 203;
export const CODABAR_MODULE_PX = (2 * PX_PER_IN) / PRINTER_DPI;

// Narrows a bar by trimDots printer dots while keeping it centered, so bar
// spacing is unchanged. Never collapses below a hairline.
export function trimmedBar(x: number, width: number, trimDots: number): { x: number; width: number } {
  const trimPx = (trimDots * PX_PER_IN) / PRINTER_DPI;
  return { x: x + trimPx / 2, width: Math.max(0.1, width - trimPx) };
}

// Library barcodes print 14 digits under the bars split as: 1 / 4 / 8 / 1,
// with the first digit under the far left edge and the last under the far right.
export const DIGIT_GROUP_SIZES = [1, 4, 8, 1];

export function splitDigitGroups(value: string): string[] {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== DIGIT_GROUP_SIZES.reduce((a, b) => a + b, 0)) return [digits];
  const groups: string[] = [];
  let i = 0;
  for (const size of DIGIT_GROUP_SIZES) {
    groups.push(digits.slice(i, i + size));
    i += size;
  }
  return groups;
}
