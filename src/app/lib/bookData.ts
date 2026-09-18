export type ClassificationSystem = "lc" | "dewey" | "sudoc" | "boundJournal";

export interface BookData {
  isbn: string;
  title: string;
  authors: string[];
  year: string;
  publisher: string;
  callNumber: string | null;
  deweyCallNumber: string | null;
  lcCallNumber: string | null;
  sudocCallNumber: string | null;
  volume: string | null;       // e.g. "v.3"
  enumeration: string | null;  // e.g. "no.4"
  chronology: string | null;   // e.g. "2019:Jan.-June"
  subjects: string[];
  source: "folio" | "openlibrary";
}

export function parseOpenLibraryResponse(isbn: string, data: Record<string, unknown>): BookData {
  const key = `ISBN:${isbn}`;
  const book = (data[key] ?? Object.values(data)[0] ?? {}) as Record<string, unknown>;

  const title = (book.title as string) ?? "Unknown Title";
  const authorsRaw = (book.authors as Array<{ name: string }>) ?? [];
  const authors = authorsRaw.map((a) => a.name);
  const publishersRaw = (book.publishers as Array<{ name: string }>) ?? [];
  const publisher = publishersRaw[0]?.name ?? "";
  const year = ((book.publish_date as string) ?? "").replace(/.*(\d{4}).*/, "$1");
  const classifications = (book.classifications as Record<string, string[]>) ?? {};
  const lcCallNumber = classifications.lc_classifications?.[0] ?? null;
  const deweyCallNumber = classifications.dewey_decimal_class?.[0] ?? null;
  // SuDoc numbers aren't in Open Library — leave null; user fills manually
  const sudocCallNumber: string | null = null;
  const subjectsRaw = (book.subjects as Array<{ name: string }>) ?? [];
  const subjects = subjectsRaw.slice(0, 5).map((s) => s.name);

  return {
    isbn, title, authors, year, publisher,
    callNumber: lcCallNumber ?? deweyCallNumber,
    lcCallNumber, deweyCallNumber, sudocCallNumber,
    volume: null, enumeration: null, chronology: null,
    subjects,
    source: "openlibrary",
  };
}

const MAX_LABEL_LINES = 8;

export function buildSuggestedLines(book: BookData, system: ClassificationSystem): string[] {
  const boundJournal = system === "boundJournal";
  const raw =
    system === "lc" || system === "boundJournal" ? (book.lcCallNumber ?? book.callNumber) :
    system === "dewey" ? (book.deweyCallNumber ?? book.callNumber) :
    (book.sudocCallNumber ?? book.callNumber);

  let lines: string[] = [];

  if (raw) {
    if (system === "lc" || system === "boundJournal") {
      // Peel off leading location prefixes (tokens with no digit, e.g. "Archives", "crc")
      // as their own lines before parsing the LC class/cutter/year portion.
      const tokens = raw.trim().split(/\s+/).filter(Boolean);
      let i = 0;
      while (i < tokens.length - 1 && !/\d/.test(tokens[i])) i++;
      const prefixLines = tokens.slice(0, i);
      const rest = tokens.slice(i).join(" ");

      // e.g. "ND1329.T39 P43 2022" → ND / 1329 / .T39 / P43 / 2022
      const m = rest.match(/^([A-Z]+)\s*(\d+(?:\.\d+)?)\s*(\.?\w+)?\s*(\.?\w+)?\s*(\d{4})?/);
      const classLines = m ? [m[1], m[2], m[3], m[4], m[5]].filter(Boolean) as string[] : rest.split(/\s+/).filter(Boolean);
      lines = [...prefixLines, ...classLines];
    } else if (system === "sudoc") {
      // Peel off leading agency/location labels (tokens ending in ".", e.g. "Doc.", "Dept.")
      // as their own lines before splitting the SuDoc stem at the colon.
      const tokens = raw.trim().split(/\s+/).filter(Boolean);
      let i = 0;
      while (i < tokens.length - 1 && tokens[i].endsWith(".")) i++;
      const prefixLines = tokens.slice(0, i);
      const rest = tokens.slice(i).join(" ");

      // e.g. "SI 11.2:C 64" → SI 11.2: / C 64
      const colonIdx = rest.indexOf(":");
      const classLines = colonIdx >= 0
        ? [rest.slice(0, colonIdx + 1).trim(), rest.slice(colonIdx + 1).trim()].filter(Boolean)
        : rest.split(/\s+/).filter(Boolean);
      lines = [...prefixLines, ...classLines];
    } else {
      // Dewey: "641.5973 HAR 2019" — split on whitespace
      lines = raw.trim().split(/\s+/).filter(Boolean);
    }
  } else {
    // Fallback: author cutter + year
    const authorLastName = book.authors[0]?.split(" ").pop()?.substring(0, 3).toUpperCase() ?? "???";
    lines = book.year ? [authorLastName, book.year] : [authorLastName];
  }

  // Append volume / enumeration / chronology after the call number
  if (book.volume)      lines.push(book.volume);
  if (book.enumeration) lines.push(book.enumeration);
  if (book.chronology) {
    if (boundJournal) {
      // Bound journal: "(2006:Feb./2007:Jan.)" → 2006 / Feb./2007 / Jan.
      const stripped = book.chronology.trim().replace(/^\(|\)$/g, "");
      lines.push(...stripped.split(":").map((s) => s.trim()).filter(Boolean));
    } else {
      lines.push(book.chronology);
    }
  }

  return lines.slice(0, MAX_LABEL_LINES);
}
