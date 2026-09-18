import { describe, expect, it } from "vitest";
import { LABEL_SIZES, LABEL_SIZE_MM, LABEL_SIZE_TITLES, shouldRotate90 } from "./labelSize";

describe("labelSize", () => {
  it("rotates content only for the 2 inch stock", () => {
    expect(shouldRotate90("2")).toBe(true);
    expect(shouldRotate90("1.125")).toBe(false);
  });

  it("offers exactly the two supported sizes", () => {
    expect(LABEL_SIZES).toEqual(["1.125", "2"]);
  });

  it("has millimetre and title values for every size", () => {
    for (const size of LABEL_SIZES) {
      expect(LABEL_SIZE_MM[size]).toBeGreaterThan(0);
      expect(LABEL_SIZE_TITLES[size]).toBeTruthy();
    }
    expect(LABEL_SIZE_MM["1.125"]).toBeCloseTo(1.125 * 25.4, 3);
    expect(LABEL_SIZE_MM["2"]).toBeCloseTo(2 * 25.4, 3);
  });
});
