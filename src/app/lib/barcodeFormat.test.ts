import JsBarcode from "jsbarcode";
import { describe, expect, it } from "vitest";
import {
  CODABAR_MODULE_PX,
  DIGIT_GROUP_SIZES,
  PRINTER_DPI,
  PX_PER_IN,
  detectFormat,
  splitDigitGroups,
  trimmedBar,
} from "./barcodeFormat";

describe("detectFormat", () => {
  it.each([
    ["9780140328721", "EAN13"],
    ["036000291452", "UPC"],
    ["96385074", "EAN8"],
    ["39372012073860", "codabar"],
    ["1234567890", "CODE128"],
    ["123456789012345", "CODE128"],
    ["", "CODE128"],
  ])("%s -> %s", (value, format) => {
    expect(detectFormat(value)).toBe(format);
  });

  it("ignores dashes and spaces when counting digits", () => {
    expect(detectFormat("978-0-14-032872-1")).toBe("EAN13");
    expect(detectFormat("3937 2012 0738 60")).toBe("codabar");
  });
});

describe("Codabar sizing", () => {
  it("is exactly 2 printer dots per module at 203 dpi", () => {
    expect((CODABAR_MODULE_PX * PRINTER_DPI) / PX_PER_IN).toBeCloseTo(2, 10);
  });

  it("encodes a 14-digit barcode as 161 modules", () => {
    const out: { encodings?: Array<{ data: string }> } = {};
    JsBarcode(out, "39372012073860", { format: "codabar" });
    expect(out.encodings?.[0].data).toHaveLength(161);
  });

  it("fits the 1.625 inch usable label width at 2 dots per module", () => {
    const usablePx = (2 - 2 * (3 / 16)) * PX_PER_IN;
    expect(161 * CODABAR_MODULE_PX).toBeLessThanOrEqual(usablePx);
  });

  it("would not fit at 3 dots per module (why bars can't be wider)", () => {
    const usablePx = (2 - 2 * (3 / 16)) * PX_PER_IN;
    expect(161 * CODABAR_MODULE_PX * 1.5).toBeGreaterThan(usablePx);
  });
});

describe("trimmedBar", () => {
  it("changes nothing at 0 trim", () => {
    expect(trimmedBar(10, 2, 0)).toEqual({ x: 10, width: 2 });
  });

  it("narrows the bar by the trim amount in pixels", () => {
    const trimPx = (0.5 * PX_PER_IN) / PRINTER_DPI;
    const bar = trimmedBar(10, 2, 0.5);
    expect(bar.width).toBeCloseTo(2 - trimPx, 10);
  });

  it("keeps the bar centered so spacing is unchanged", () => {
    const before = 10 + 2 / 2;
    const bar = trimmedBar(10, 2, 0.75);
    expect(bar.x + bar.width / 2).toBeCloseTo(before, 10);
  });

  it("never collapses a bar below a hairline", () => {
    expect(trimmedBar(10, 0.3, 1.5).width).toBe(0.1);
  });
});

describe("splitDigitGroups", () => {
  it("splits a 14-digit value into 1/4/8/1", () => {
    expect(splitDigitGroups("39372012073860")).toEqual(["3", "9372", "01207386", "0"]);
    expect(DIGIT_GROUP_SIZES).toEqual([1, 4, 8, 1]);
  });

  it("returns a single group for other lengths", () => {
    expect(splitDigitGroups("9780140328721")).toEqual(["9780140328721"]);
  });

  it("strips non-digits first", () => {
    expect(splitDigitGroups("3-9372-01207386-0")).toEqual(["3", "9372", "01207386", "0"]);
  });
});
