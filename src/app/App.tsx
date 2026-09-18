import { useState, useCallback, useRef, useEffect } from "react";
import { AlertCircle, Database, Sun, Moon, ExternalLink } from "lucide-react";
import logo from "../assets/logo.svg";
import { BarcodeScanner } from "./components/BarcodeScanner";
import { SpineLabelEditor, type LabelConfig } from "./components/SpineLabelEditor";
import { SpineLabelPreview } from "./components/SpineLabelPreview";
import { FolioSettings, loadFolioConfig, type FolioConfig } from "./components/FolioSettings";
import { lookupByBarcode, setRequestLogListener, type RequestLogEntry } from "./lib/folioApi";
import { RequestLog } from "./components/RequestLog";
import { BarcodePrintPanel } from "./components/BarcodePrintPanel";
import { PropertyTagPanel } from "./components/PropertyTagPanel";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./components/ui/accordion";
import { LABEL_SIZES, LABEL_SIZE_TITLES, type LabelSize } from "./lib/labelSize";
import { HELP_DOCS, helpDocPath } from "./lib/helpDocs";
import { buildSuggestedLines, parseOpenLibraryResponse, type BookData, type ClassificationSystem } from "./lib/bookData";

/* MARKER-MAKE-KIT-INVOKED */

const DEFAULT_CONFIG: LabelConfig = {
  lines: ["", "", "", ""],
  fontSize: 9,
  copies: 1,
  bold: true,
};

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
  lc:           { full: "Library of Congress", short: "LC" },
  dewey:        { full: "Dewey Decimal",       short: "Dewey" },
  sudoc:        { full: "SuDoc",               short: "SuDoc" },
  boundJournal: { full: "Journal",             short: "Journal" },
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
  const [labelSize, setLabelSize] = useState<LabelSize>("1.125");
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
    ? (system === "lc" || system === "boundJournal" ? book.lcCallNumber : system === "dewey" ? book.deweyCallNumber : book.sudocCallNumber) ?? book.callNumber
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-white text-foreground border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <img src={logo} alt="" className="h-[50px] w-auto" />
            <div>
              <h1 className="tracking-tight text-[#1a1a1a]" style={{ fontSize: "1.1rem", fontWeight: 600, lineHeight: 1 }}>
               Albertsons Library Spine & Barcode Label Printing Software
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5" style={{ letterSpacing: "0.08em" }}>
                Selected: {SYSTEM_LABELS[system].full.toUpperCase()} CLASSIFICATION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Classification system toggle — in header */}
            <div className="flex border border-border overflow-hidden shrink-0">
              {(["lc", "dewey", "sudoc", "boundJournal"] as ClassificationSystem[]).map((s) => (
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

            {/* Label size toggle — in header */}
            <div className="flex border border-border overflow-hidden shrink-0">
              {LABEL_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setLabelSize(s)}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    labelSize === s
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {LABEL_SIZE_TITLES[s]}
                </button>
              ))}
            </div>

            {/* Light / dark mode toggle */}
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              style={{ borderRadius: 0 }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
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

            <section className="bg-card border border-border p-5">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Book Data
                </h2>
                {book && (
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
                )}
              </div>
              {!book ? (
                <p className="text-sm text-muted-foreground/50">No data retrieved yet.</p>
              ) : (
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
                        <p className="text-sm" style={{ fontFamily: "monospace" }}>
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
                      <p className="text-sm" style={{ fontFamily: "monospace" }}>
                        {book.isbn}
                      </p>
                    </div>
                    {lastBarcode && lastBarcode !== book.isbn && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Scanned Barcode</p>
                        <p className="text-sm" style={{ fontFamily: "monospace" }}>
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
                          <p className="text-sm" style={{ fontFamily: "monospace" }}>{book.volume}</p>
                        </div>
                      )}
                      {book.enumeration && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Enumeration</p>
                          <p className="text-sm" style={{ fontFamily: "monospace" }}>{book.enumeration}</p>
                        </div>
                      )}
                      {book.chronology && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Chronology</p>
                          <p className="text-sm" style={{ fontFamily: "monospace" }}>{book.chronology}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Call numbers — show all available, highlight active */}
                  <div className="space-y-1.5">
                    {(["lc", "dewey", "sudoc"] as ClassificationSystem[]).map((s) => {
                      const cn = s === "lc" ? book.lcCallNumber : s === "dewey" ? book.deweyCallNumber : book.sudocCallNumber;
                      if (!cn) return null;
                      const active = s === system || (s === "lc" && system === "boundJournal");
                      return (
                        <div key={s}>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            {SYSTEM_LABELS[s].short} Call Number
                            {active && <span className="ml-1 text-accent font-medium">← active</span>}
                          </p>
                          <p
                            className={`text-sm px-2 py-1 inline-block ${active ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}
                            style={{ fontFamily: "monospace", borderRadius: 0 }}
                          >
                            {cn}
                          </p>
                        </div>
                      );
                    })}
                    {!book.lcCallNumber && !book.deweyCallNumber && !book.sudocCallNumber && (
                      <div className="text-xs text-secondary-foreground bg-secondary px-3 py-2 border-l-2 border-accent">
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
              )}
            </section>

            {book && (
              <section className="bg-card border border-border px-5">
                <Accordion type="single" collapsible>
                  <AccordionItem value="json-return" className="border-b-0">
                    <AccordionTrigger className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      JSON return 
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre
                        className="text-xs bg-secondary text-secondary-foreground p-3 overflow-x-auto whitespace-pre-wrap break-all"
                        style={{ fontFamily: "monospace" }}
                      >
                        {JSON.stringify(book, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>
            )}

            {requestLog.length > 0 && (
              <section className="bg-card border border-border px-5">
                <Accordion type="single" collapsible>
                  <AccordionItem value="request-log" className="border-b-0">
                    <AccordionTrigger className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      API Request Log
                    </AccordionTrigger>
                    <AccordionContent>
                      <RequestLog entries={requestLog} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </section>
            )}

            <section className="bg-card border border-border px-5">
              <Accordion type="single" collapsible>
                <AccordionItem value="helpful-documentation" className="border-b-0">
                  <AccordionTrigger className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Helpful Documentation
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {HELP_DOCS.map((doc) => (
                        <li key={doc.id}>
                          <a
                            href={helpDocPath(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            {doc.title}
                            <ExternalLink size={12} />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          </div>

          {/* RIGHT — Label Editor + Preview */}
          <div className="space-y-6">
            <section className="bg-card border border-border px-5">
              <Accordion type="single" collapsible>
                <AccordionItem value="label-format" className="border-b-0">
                  <AccordionTrigger className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Label Format
                  </AccordionTrigger>
                  <AccordionContent>
                    <SpineLabelEditor
                      config={labelConfig}
                      onChange={setLabelConfig}
                      suggestedLines={suggestedLines}
                      onReset={handleReset}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            <section className="bg-card border border-border px-5">
              <Accordion type="single" collapsible defaultValue="spine-label">
                <AccordionItem value="spine-label" className="border-b-0">
                  <AccordionTrigger className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Spine Label — Preview &amp; Print
                  </AccordionTrigger>
                  <AccordionContent>
                    {hasLabel ? (
                      <SpineLabelPreview config={labelConfig} onChange={setLabelConfig} labelSize={labelSize} />
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border">
                        Enter call number lines to see the label preview.
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            <section className="bg-card border border-border px-5">
              <Accordion type="single" collapsible defaultValue="barcode-label">
                <AccordionItem value="barcode-label" className="border-b-0">
                  <AccordionTrigger className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Barcode Label — Preview &amp; Print
                  </AccordionTrigger>
                  <AccordionContent>
                    {lastBarcode ? (
                      <BarcodePrintPanel value={lastBarcode} labelSize={labelSize} />
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border">
                        Scan a barcode to generate a printable barcode label.
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            <section className="bg-card border border-border px-5">
              <Accordion type="single" collapsible defaultValue="property-tag">
                <AccordionItem value="property-tag" className="border-b-0">
                  <AccordionTrigger className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Property Tag
                  </AccordionTrigger>
                  <AccordionContent>
                    <PropertyTagPanel labelSize={labelSize} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        #spine-print-portal, #barcode-print-portal, #property-tag-print-portal {
          display: none;
        }
        @media print {
          @page { margin: 0; }
          body > *:not(#spine-print-portal):not(#barcode-print-portal):not(#property-tag-print-portal) { display: none !important; }
          /* Only the portal matching body[data-print-target] should render —
             the other two may still hold stale content from a prior print. */
          #spine-print-portal, #barcode-print-portal, #property-tag-print-portal { display: none !important; }
          body[data-print-target="spine"] #spine-print-portal,
          body[data-print-target="barcode"] #barcode-print-portal,
          body[data-print-target="property-tag"] #property-tag-print-portal {
            display: flex !important;
            flex-wrap: wrap;
            gap: 2mm;
            align-content: flex-start;
            padding: 0;
            margin: 0;
          }
        }
      `}</style>
      {/* Updated per print job via setPageOrientation() — must come after the
          block above in document order so its @page size wins the cascade. */}
      <style id="page-orientation">{`@page { size: portrait; }`}</style>
    </div>
  );
}
