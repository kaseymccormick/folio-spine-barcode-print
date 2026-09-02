export type LabelSize = "1.125" | "2";

export const LABEL_SIZES: LabelSize[] = ["1.125", "2"];

export const LABEL_SIZE_MM: Record<LabelSize, number> = {
  "1.125": 28.575, // 1 1/8"
  "2": 50.8,        // 2"
};

export const LABEL_SIZE_TITLES: Record<LabelSize, string> = {
  "1.125": '1 1/8"',
  "2": '2"',
};

// Every label type has a natural, unrotated layout at 1 1/8". At 2" the same
// content is rotated 90° in place — the physical tape is wider, so rotating
// (rather than re-flowing the layout) lets the printer's own cutter trim
// each label without the user having to trim it by hand afterward.
export function shouldRotate90(size: LabelSize): boolean {
  return size === "2";
}
