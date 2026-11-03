import { describe, it, expect } from "vitest";
import { clampFontPt, clampCopies } from "./customLabel";

describe("clampFontPt", () => {
  it("rounds and clamps", () => {
    expect(clampFontPt(9.4)).toBe(9);
    expect(clampFontPt(1)).toBe(4);
    expect(clampFontPt(200)).toBe(36);
    expect(clampFontPt(NaN)).toBe(9);
  });
});

describe("clampCopies", () => {
  it("clamps to 1..100", () => {
    expect(clampCopies(0)).toBe(1);
    expect(clampCopies(500)).toBe(100);
    expect(clampCopies(3.7)).toBe(3);
    expect(clampCopies(NaN)).toBe(1);
  });
});
