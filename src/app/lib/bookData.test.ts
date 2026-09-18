import { describe, expect, it } from "vitest";
import { buildSuggestedLines, parseOpenLibraryResponse, type BookData } from "./bookData";

const book = (overrides: Partial<BookData> = {}): BookData => ({
  isbn: "9780000000000",
  title: "Title",
  authors: ["Jane Smith"],
  year: "2020",
  publisher: "Pub",
  callNumber: null,
  deweyCallNumber: null,
  lcCallNumber: null,
  sudocCallNumber: null,
  volume: null,
  enumeration: null,
  chronology: null,
  subjects: [],
  source: "folio",
  ...overrides,
});

describe("buildSuggestedLines — LC", () => {
  it("splits class, number, cutters, and year", () => {
    expect(buildSuggestedLines(book({ lcCallNumber: "ND1329.T39 P43 2022" }), "lc")).toEqual([
      "ND", "1329", ".T39", "P43", "2022",
    ]);
  });

  it("puts a location prefix on its own line", () => {
    expect(buildSuggestedLines(book({ lcCallNumber: "Archives ND1329.T39 P43 2022" }), "lc")).toEqual([
      "Archives", "ND", "1329", ".T39", "P43", "2022",
    ]);
  });

  it("puts several location prefixes on their own lines", () => {
    const lines = buildSuggestedLines(book({ lcCallNumber: "Archives crc QA76.73 .C15 2019" }), "lc");
    expect(lines.slice(0, 2)).toEqual(["Archives", "crc"]);
    expect(lines[2]).toBe("QA");
    expect(lines[3]).toBe("76.73");
  });

  it("handles a decimal class number", () => {
    expect(buildSuggestedLines(book({ lcCallNumber: "QA76.73 .C15" }), "lc").slice(0, 2)).toEqual(["QA", "76.73"]);
  });

  it("falls back to splitting on whitespace when the pattern doesn't match", () => {
    expect(buildSuggestedLines(book({ lcCallNumber: "123 abc def" }), "lc")).toEqual(["123", "abc", "def"]);
  });

  it("uses callNumber when lcCallNumber is missing", () => {
    expect(buildSuggestedLines(book({ callNumber: "PS3545.I345 Z46 2001" }), "lc")[0]).toBe("PS");
  });

  it("appends volume and enumeration after the call number", () => {
    expect(
      buildSuggestedLines(book({ lcCallNumber: "ND1329", volume: "v.3", enumeration: "no.4" }), "lc").slice(-2)
    ).toEqual(["v.3", "no.4"]);
  });

  it("appends a chronology as a single line for a normal book", () => {
    expect(buildSuggestedLines(book({ lcCallNumber: "ND1329", chronology: "2019:Jan.-June" }), "lc").at(-1)).toBe(
      "2019:Jan.-June"
    );
  });

  it("appends volume, enumeration, and chronology in that order", () => {
    const lines = buildSuggestedLines(
      book({ lcCallNumber: "ND1329", volume: "v.1", enumeration: "no.2", chronology: "2020" }),
      "lc"
    );
    expect(lines.slice(-3)).toEqual(["v.1", "no.2", "2020"]);
  });
});

describe("buildSuggestedLines — bound journal", () => {
  it("splits a parenthesised chronology range into lines", () => {
    const lines = buildSuggestedLines(
      book({ lcCallNumber: "ND1329", chronology: "(2006:Feb./2007:Jan.)" }),
      "boundJournal"
    );
    expect(lines.slice(-3)).toEqual(["2006", "Feb./2007", "Jan."]);
  });

  it("uses the LC call number like the LC system", () => {
    expect(buildSuggestedLines(book({ lcCallNumber: "ND1329.T39 P43 2022" }), "boundJournal").slice(0, 3)).toEqual([
      "ND", "1329", ".T39",
    ]);
  });
});

describe("buildSuggestedLines — Dewey", () => {
  it("splits on whitespace", () => {
    expect(buildSuggestedLines(book({ deweyCallNumber: "641.5973 HAR 2019" }), "dewey")).toEqual([
      "641.5973", "HAR", "2019",
    ]);
  });

  it("falls back to callNumber when there is no Dewey number", () => {
    expect(buildSuggestedLines(book({ callNumber: "813.54 BRO" }), "dewey")).toEqual(["813.54", "BRO"]);
  });
});

describe("buildSuggestedLines — SuDoc", () => {
  it("splits the stem at the colon", () => {
    expect(buildSuggestedLines(book({ sudocCallNumber: "SI 11.2:C 64" }), "sudoc")).toEqual(["SI 11.2:", "C 64"]);
  });

  it("puts a leading agency label on its own line", () => {
    expect(buildSuggestedLines(book({ sudocCallNumber: "Doc. Y 4.AG 8/1: EN 2/2" }), "sudoc")).toEqual([
      "Doc.", "Y 4.AG 8/1:", "EN 2/2",
    ]);
  });

  it("splits on whitespace when there is no colon", () => {
    expect(buildSuggestedLines(book({ sudocCallNumber: "SI 11.2" }), "sudoc")).toEqual(["SI", "11.2"]);
  });
});

describe("buildSuggestedLines — no call number", () => {
  it("falls back to three letters of the author's last name plus the year", () => {
    expect(buildSuggestedLines(book(), "lc")).toEqual(["SMI", "2020"]);
  });

  it("omits the year when unknown", () => {
    expect(buildSuggestedLines(book({ year: "" }), "lc")).toEqual(["SMI"]);
  });

  it("uses ??? when there is no author", () => {
    expect(buildSuggestedLines(book({ authors: [], year: "" }), "lc")).toEqual(["???"]);
  });
});

describe("buildSuggestedLines — limits", () => {
  it("caps the result at 8 lines", () => {
    const lines = buildSuggestedLines(
      book({
        deweyCallNumber: "A B C D E F G H I J K L",
        volume: "v.1",
        enumeration: "no.2",
        chronology: "2020",
      }),
      "dewey"
    );
    expect(lines).toHaveLength(8);
  });
});

describe("parseOpenLibraryResponse", () => {
  const data = {
    "ISBN:9780140328721": {
      title: "Fantastic Mr Fox",
      authors: [{ name: "Roald Dahl" }, { name: "Quentin Blake" }],
      publishers: [{ name: "Puffin" }],
      publish_date: "March 1, 2007",
      classifications: { lc_classifications: ["PZ7.D2115 Fan"], dewey_decimal_class: ["[Fic]"] },
      subjects: [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "d" }, { name: "e" }, { name: "f" }],
    },
  };

  it("extracts the main fields", () => {
    const b = parseOpenLibraryResponse("9780140328721", data);
    expect(b.title).toBe("Fantastic Mr Fox");
    expect(b.authors).toEqual(["Roald Dahl", "Quentin Blake"]);
    expect(b.publisher).toBe("Puffin");
    expect(b.year).toBe("2007");
    expect(b.source).toBe("openlibrary");
    expect(b.isbn).toBe("9780140328721");
  });

  it("takes LC and Dewey from classifications and never invents SuDoc", () => {
    const b = parseOpenLibraryResponse("9780140328721", data);
    expect(b.lcCallNumber).toBe("PZ7.D2115 Fan");
    expect(b.deweyCallNumber).toBe("[Fic]");
    expect(b.sudocCallNumber).toBeNull();
    expect(b.callNumber).toBe("PZ7.D2115 Fan");
  });

  it("keeps at most 5 subjects", () => {
    expect(parseOpenLibraryResponse("9780140328721", data).subjects).toHaveLength(5);
  });

  it("uses the first record when the ISBN key differs", () => {
    expect(parseOpenLibraryResponse("0000", data).title).toBe("Fantastic Mr Fox");
  });

  it("defaults missing fields", () => {
    const b = parseOpenLibraryResponse("1", { "ISBN:1": {} });
    expect(b.title).toBe("Unknown Title");
    expect(b.authors).toEqual([]);
    expect(b.publisher).toBe("");
    expect(b.year).toBe("");
    expect(b.callNumber).toBeNull();
  });

  it("falls back to Dewey as the call number when there is no LC", () => {
    const b = parseOpenLibraryResponse("1", {
      "ISBN:1": { classifications: { dewey_decimal_class: ["641.5"] } },
    });
    expect(b.callNumber).toBe("641.5");
  });
});
