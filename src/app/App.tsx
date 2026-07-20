import { useState, useCallback, useRef, useEffect } from "react";
import { BookOpen, AlertCircle, Database, Sun, Moon } from "lucide-react";
import logo from "../assets/logo.svg";
import { BarcodeScanner } from "./components/BarcodeScanner";
import { SpineLabelEditor, type LabelConfig } from "./components/SpineLabelEditor";
import { SpineLabelPreview } from "./components/SpineLabelPreview";
import { FolioSettings, loadFolioConfig, type FolioConfig } from "./components/FolioSettings";
import { lookupByBarcode, setRequestLogListener, type RequestLogEntry } from "./lib/folioApi";
import { RequestLog } from "./components/RequestLog";
import { BarcodePrintPanel } from "./components/BarcodePrintPanel";

/* MARKER-MAKE-KIT-INVOKED */

export type ClassificationSystem = "lc" | "dewey" | "sudoc";

interface BookData {
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

const DEFAULT_CONFIG: LabelConfig = {
  lines: ["", "", "", ""],
  fontSize: 9,
  copies: 1,
  labelWidthMm: 32,
  labelHeightMm: 50,

  bold: false,
  showBorder: false,
};

function parseOpenLibraryResponse(isbn: string, data: Record<string, unknown>): BookData {
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

function buildSuggestedLines(book: BookData, system: ClassificationSystem): string[] {
  const raw =
    system === "lc" ? book.lcCallNumber :
    system === "dewey" ? book.deweyCallNumber :
    book.sudocCallNumber;

  let lines: string[] = [];

  if (raw) {
    if (system === "lc") {
      // e.g. "PS3511.I9 G7 2004" → PS / 3511 / .I9 / G7 / 2004
      const m = raw.trim().match(/^([A-Z]+)\s*(\d+(?:\.\d+)?)\s*(\.?\w+)?\s*(\.?\w+)?\s*(\d{4})?/);
      lines = m ? [m[1], m[2], m[3], m[4], m[5]].filter(Boolean) as string[] : [raw.trim()];
    } else {
      // Dewey: "641.5973 HAR 2019" | SuDoc: "A 1.2:F 76/5" — split on whitespace
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
  if (book.chronology)  lines.push(book.chronology);

  return lines.slice(0, MAX_LABEL_LINES);
}

async function fetchFromOpenLibrary(isbn: string): Promise<BookData> {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library error: ${res.status}`);
  const data = await res.json();
  if (!data || Object.keys(data).length === 0) throw new Error("No book found for this ISBN.");
  return parseOpenLibraryResponse(isbn, data);
}

async function fetchBookData(value: string, folioConfig: FolioConfig | null): Promise<BookData> {
  const clean = value.replace(/[-\s]/g, "");

  if (folioConfig) {
    try {
      const result = await lookupByBarcode(clean, folioConfig);
      return {
        isbn: clean,
        title: result.title,
        authors: result.authors,
        year: result.year,
        publisher: result.publisher,
        callNumber: result.lcCallNumber,
        lcCallNumber: result.lcCallNumber,
        deweyCallNumber: null,
        sudocCallNumber: null,
        volume: result.volume,
        enumeration: result.enumeration,
        chronology: result.chronology,
        subjects: [`Matched by: ${result.matchedBy}`],
        source: "folio",
      };
    } catch (folioErr) {
      const olData = await fetchFromOpenLibrary(clean).catch(() => null);
      if (olData) {
        return {
          ...olData,
          subjects: [
            `FOLIO lookup failed: ${folioErr instanceof Error ? folioErr.message : String(folioErr)}`,
            ...olData.subjects,
          ],
        };
      }
      throw folioErr;
    }
  }

  return fetchFromOpenLibrary(clean);
}

const SYSTEM_LABELS: Record<ClassificationSystem, { full: string; short: string }> = {
  lc:    { full: "Library of Congress", short: "LC" },
  dewey: { full: "Dewey Decimal",       short: "Dewey" },
  sudoc: { full: "SuDoc",               short: "SuDoc" },
};

const THEME_STORAGE_KEY = "theme";

function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return { theme, toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<BookData | null>(null);
  const [suggestedLines, setSuggestedLines] = useState<string[]>([]);
  const [labelConfig, setLabelConfig] = useState<LabelConfig>(DEFAULT_CONFIG);
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>([]);
  const [system, setSystem] = useState<ClassificationSystem>("lc");
  const [lastBarcode, setLastBarcode] = useState<string>("");
  const folioConfigRef = useRef<FolioConfig | null>(loadFolioConfig());
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setRequestLogListener(setRequestLog);
    return () => setRequestLogListener(null);
  }, []);

  // Re-derive suggested lines when system changes (if we already have a book)
  useEffect(() => {
    if (!book) return;
    const lines = buildSuggestedLines(book, system);
    setSuggestedLines(lines);
    const padded = [...lines];
    while (padded.length < 4) padded.push("");
    setLabelConfig((prev) => ({ ...prev, lines: padded }));
  }, [system]);

  const handleFolioConfigChange = useCallback((config: FolioConfig | null) => {
    folioConfigRef.current = config;
  }, []);

  const handleScan = useCallback(async (isbn: string) => {
    setIsLoading(true);
    setError(null);
    setLastBarcode(isbn);
    try {
      const data = await fetchBookData(isbn, folioConfigRef.current);
      setBook(data);
      const lines = buildSuggestedLines(data, system);
      setSuggestedLines(lines);
      const padded = [...lines];
      while (padded.length < 4) padded.push("");
      setLabelConfig((prev) => ({ ...prev, lines: padded }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch book data.");
    } finally {
      setIsLoading(false);
    }
  }, [system]);

  const handleReset = () => {
    const padded = [...suggestedLines];
    while (padded.length < 4) padded.push("");
    setLabelConfig((prev) => ({ ...prev, lines: padded }));
  };

  const hasLabel = labelConfig.lines.some((l) => l.trim());

  const displayCallNumber = book
    ? (system === "lc" ? book.lcCallNumber : system === "dewey" ? book.deweyCallNumber : book.sudocCallNumber) ?? book.callNumber
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-white text-foreground border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <img src={logo} alt="" className="h-[50px] w-auto" />
            <div>
              <h1 className="tracking-tight" style={{ fontSize: "1.1rem", fontWeight: 600, lineHeight: 1 }}>
               Albertsons Library Spine & Barcode Label Printing Software
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5" style={{ letterSpacing: "0.08em" }}>
                {SYSTEM_LABELS[system].full.toUpperCase()} CLASSIFICATION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Classification system toggle — in header */}
            <div className="flex border border-border overflow-hidden shrink-0">
              {(["lc", "dewey", "sudoc"] as ClassificationSystem[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSystem(s)}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    system === s
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {SYSTEM_LABELS[s].short}
                </button>
              ))}
            </div>

            {/* Light / dark mode toggle — disabled in UI for now, logic kept in useTheme() above
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 border border-primary-foreground/20 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors"
              style={{ borderRadius: 0 }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            */}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* FOLIO settings */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Database size={13} className="text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Catalog Source
            </span>
          </div>
          <FolioSettings onConfigChange={handleFolioConfigChange} />
          {requestLog.length > 0 && (
            <div className="mt-2">
              <RequestLog entries={requestLog} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT — Scanner + Book Info */}
          <div className="space-y-6">
            <section className="bg-card border border-border p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                Scan Barcode
              </h2>
              <BarcodeScanner onScan={handleScan} isLoading={isLoading} />
            </section>

            {error && (
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 p-4">
                <AlertCircle size={16} className="text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-destructive font-medium">Lookup Failed</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can still manually enter call number lines on the right.
                  </p>
                </div>
              </div>
            )}

            {book && (
              <section className="bg-card border border-border p-5">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                  <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Book Data
                  </h2>
                  <span
                    className={`text-xs px-2 py-0.5 ${
                      book.source === "folio"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    {book.source === "folio" ? "FOLIO" : "Open Library"}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Title</p>
                    <p className="text-sm font-medium leading-snug">{book.title}</p>
                  </div>
                  {book.authors.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                        {book.authors.length === 1 ? "Author" : "Authors"}
                      </p>
                      <p className="text-sm">{book.authors.join("; ")}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {book.year && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Year</p>
                        <p className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {book.year}
                        </p>
                      </div>
                    )}
                    {book.publisher && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Publisher</p>
                        <p className="text-sm">{book.publisher}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">ISBN / Barcode</p>
                      <p className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {book.isbn}
                      </p>
                    </div>
                    {lastBarcode && lastBarcode !== book.isbn && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Scanned Barcode</p>
                        <p className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {lastBarcode}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Volume / enumeration / chronology */}
                  {(book.volume || book.enumeration || book.chronology) && (
                    <div className="grid grid-cols-3 gap-3">
                      {book.volume && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Volume</p>
                          <p className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{book.volume}</p>
                        </div>
                      )}
                      {book.enumeration && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Enumeration</p>
                          <p className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{book.enumeration}</p>
                        </div>
                      )}
                      {book.chronology && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Chronology</p>
                          <p className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{book.chronology}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Call numbers — show all available, highlight active */}
                  <div className="space-y-1.5">
                    {(["lc", "dewey", "sudoc"] as ClassificationSystem[]).map((s) => {
                      const cn = s === "lc" ? book.lcCallNumber : s === "dewey" ? book.deweyCallNumber : book.sudocCallNumber;
                      if (!cn) return null;
                      const active = s === system;
                      return (
                        <div key={s}>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            {SYSTEM_LABELS[s].short} Call Number
                            {active && <span className="ml-1 text-accent font-medium">← active</span>}
                          </p>
                          <p
                            className={`text-sm px-2 py-1 inline-block ${active ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}
                            style={{ fontFamily: "'JetBrains Mono', monospace", borderRadius: 0 }}
                          >
                            {cn}
                          </p>
                        </div>
                      );
                    })}
                    {!book.lcCallNumber && !book.deweyCallNumber && !book.sudocCallNumber && (
                      <div className="text-xs text-muted-foreground bg-secondary px-3 py-2 border-l-2 border-accent">
                        {book.source === "folio"
                          ? "No call number on the holdings record. Edit label lines manually."
                          : `No ${SYSTEM_LABELS[system].full} number found. Try switching classification or edit manually.`}
                      </div>
                    )}
                    {!displayCallNumber && (book.lcCallNumber || book.deweyCallNumber) && (
                      <p className="text-xs text-accent">
                        {book.lcCallNumber && system !== "lc" ? "An LC" : "A Dewey"} number is available — switch above.
                      </p>
                    )}
                  </div>

                  {book.subjects.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Subjects</p>
                      <div className="flex flex-wrap gap-1">
                        {book.subjects.map((s, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-0.5 ${
                              s.startsWith("FOLIO lookup failed")
                                ? "bg-destructive/10 text-destructive"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                            style={{ borderRadius: 0 }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {!book && !error && (
              <div className="border border-dashed border-border p-8 text-center">
                <BookOpen size={28} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Scan or enter an ISBN to fetch book data and generate a spine label.
                </p>
                <p className="text-xs text-muted-foreground mt-1 opacity-60">
                  Example ISBN: 9780743273565
                </p>
              </div>
            )}
          </div>

          {/* RIGHT — Label Editor + Preview */}
          <div className="space-y-6">
            <section className="bg-card border border-border p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                Label Format
              </h2>
              <SpineLabelEditor
                config={labelConfig}
                onChange={setLabelConfig}
                suggestedLines={suggestedLines}
                onReset={handleReset}
              />
            </section>

            <section className="bg-card border border-border p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                Spine Label — Preview &amp; Print
              </h2>
              {hasLabel ? (
                <SpineLabelPreview config={labelConfig} />
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border">
                  Enter call number lines to see the label preview.
                </div>
              )}
            </section>

            <section className="bg-card border border-border p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                Barcode Label — Preview &amp; Print
              </h2>
              {lastBarcode ? (
                <BarcodePrintPanel value={lastBarcode} />
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border">
                  Scan a barcode to generate a printable barcode label.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: auto; margin: 3mm; }
          body > *:not(#spine-print-portal):not(#barcode-print-portal) { display: none !important; }
          #spine-print-portal, #barcode-print-portal {
            display: flex !important;
            flex-wrap: wrap;
            gap: 2mm;
            align-content: flex-start;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
