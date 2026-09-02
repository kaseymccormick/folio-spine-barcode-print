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

// 1 1/8" prints portrait (narrow, fixed width); 2" prints landscape (fixed height).
export function isPortrait(size: LabelSize): boolean {
  return size === "1.125";
}
