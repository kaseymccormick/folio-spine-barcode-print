import { describe, expect, it } from "vitest";
import { HELP_DOCS, getHelpDocFromPath, helpDocPath } from "./helpDocs";

describe("helpDocs", () => {
  it("finds a doc by its path", () => {
    expect(getHelpDocFromPath("/docs/label-printer-settings")?.title).toBe("Label Printers Settings");
  });

  it("accepts a trailing slash", () => {
    expect(getHelpDocFromPath("/docs/label-printer-settings/")).not.toBeNull();
  });

  it.each(["/", "/docs", "/docs/", "/docs/nope", "/docs/label-printer-settings/extra", "/other/label-printer-settings"])(
    "returns null for %s",
    (path) => {
      expect(getHelpDocFromPath(path)).toBeNull();
    }
  );

  it("builds a path that round-trips for every doc", () => {
    for (const doc of HELP_DOCS) {
      expect(getHelpDocFromPath(helpDocPath(doc.id))).toBe(doc);
    }
  });

  it("has unique ids", () => {
    const ids = HELP_DOCS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
