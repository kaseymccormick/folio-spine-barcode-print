import { useEffect, useRef, useState } from "react";
import { Printer, Minus, Plus, RotateCcw } from "lucide-react";
import JsBarcode from "jsbarcode";
import { shouldRotate90, type LabelSize } from "../lib/labelSize";
import { setPageSizeIn } from "../lib/pageOrientation";

interface BarcodePrintPanelProps {
  value: string;
  labelSize: LabelSize;
}

// The printed content is always 2" wide x 1" tall — the global label size
// selector only decides whether that content prints landscape/as-is at 1 1/8"
// or portrait/rotated 90° at 2" (so the label stock feeds 1" wide x 2" tall),
// with 3/16" of clear margin on the left and right of the (unrotated) content.
const PX_PER_IN = 96;
const LABEL_WIDTH_IN = 2;
const LABEL_HEIGHT_IN = 1;
const SIDE_MARGIN_IN = 3 / 16;
const USABLE_WIDTH_PX = (LABEL_WIDTH_IN - 2 * SIDE_MARGIN_IN) * PX_PER_IN;

function detectFormat(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 13) return "EAN13";
  if (digits.length === 12) return "UPC";
  if (digits.length === 8) return "EAN8";
  // 14-digit library item barcodes (1/4/8/1 grouping below) use Codabar,
  // mod 10 check digit as the last digit.
  if (digits.length === 14) return "codabar";
  return "CODE128";
}

// Codabar is drawn at an exact 2 dots per module for the 203 dpi Zebra ZD421
// so no bar gets rounded to a different width when rasterized.
const PRINTER_DPI = 203;
const CODABAR_MODULE_PX = (2 * PX_PER_IN) / PRINTER_DPI;

// Thermal heads spread ink, so bars print wider than drawn. Trimming each bar
// (in printer dots, kept centered so spacing is unchanged) offsets that.
const TRIM_STORAGE_KEY = "barcode_bar_trim_dots";
const TRIM_MAX_DOTS = 1.5;
const TRIM_STEP_DOTS = 0.25;
const DEFAULT_TRIM_DOTS = 0.5;

function loadTrimDots(): number {
  try {
    const raw = localStorage.getItem(TRIM_STORAGE_KEY);
    if (raw === null) return DEFAULT_TRIM_DOTS;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(TRIM_MAX_DOTS, Math.max(0, n)) : DEFAULT_TRIM_DOTS;
  } catch {
    return DEFAULT_TRIM_DOTS;
  }
}

function trimBars(svg: SVGSVGElement, trimDots: number) {
  if (trimDots <= 0) return;
  const trimPx = (trimDots * PX_PER_IN) / PRINTER_DPI;
  svg.querySelectorAll("g rect").forEach((rect) => {
    const x = Number(rect.getAttribute("x"));
    const w = Number(rect.getAttribute("width"));
    rect.setAttribute("x", String(x + trimPx / 2));
    rect.setAttribute("width", String(Math.max(0.1, w - trimPx)));
  });
}

function barcodeDrawOptions(format: string) {
  const codabar = format === "codabar";
  return {
    format,
    width: codabar ? CODABAR_MODULE_PX : 1.5,
    height: 40,
    displayValue: false,
    margin: codabar ? 0 : 4,
    background: "#ffffff",
    lineColor: "#000000",
  };
}

// JsBarcode already sets a valid viewBox. Codabar keeps its exact pixel size;
// other formats scale to the usable width.
function sizeSvg(svg: SVGSVGElement, format: string, trimDots = 0) {
  svg.setAttribute("shape-rendering", "crispEdges");
  if (format === "codabar") {
    trimBars(svg, trimDots);
    svg.style.cssText = `width: ${svg.getAttribute("width")}; height: ${svg.getAttribute("height")}; display: block; margin: 0 auto;`;
  } else {
    svg.style.cssText = "width: 100%; height: auto; display: block;";
  }
}

const BARCODE_FONT_SIZE_PT = 12;
const LABEL_TEXT_FONT_SIZE_PT = 9;
const LABEL_TEXT = "Boise State University";

// Library barcodes print 14 digits under the bars split as: 1 / 4 / 8 / 1,
// with the first digit under the far left edge and the last under the far right.
const DIGIT_GROUP_SIZES = [1, 4, 8, 1];

function splitDigitGroups(value: string): string[] {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== DIGIT_GROUP_SIZES.reduce((a, b) => a + b, 0)) return [digits];
  const groups: string[] = [];
  let i = 0;
  for (const size of DIGIT_GROUP_SIZES) {
    groups.push(digits.slice(i, i + size));
    i += size;
  }
  return groups;
}

function DigitGroups({ value, widthPx }: { value: string; widthPx: number }) {
  const groups = splitDigitGroups(value);
  return (
    <div
      className="flex"
      style={{
        width: `${widthPx}px`,
        justifyContent: groups.length > 1 ? "space-between" : "center",
        fontFamily: "'Courier New', monospace",
        fontSize: `${BARCODE_FONT_SIZE_PT}pt`,
        fontWeight: 700,
        color: "#000000",
      }}
    >
      {groups.map((g, i) => (
        <span key={i}>{g}</span>
      ))}
    </div>
  );
}

function BarcodeRenderer({ value, trimDots }: { value: string; trimDots: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    setError(null);
    setReady(false);
    try {
      const format = detectFormat(value);
      JsBarcode(svgRef.current, value, {
        ...barcodeDrawOptions(format),
        valid: () => setError(null),
      });
      sizeSvg(svgRef.current, format, trimDots);
      setReady(true);
    } catch {
      setError("Cannot render barcode — value may be invalid for detected format.");
    }
  }, [value, trimDots]);

  if (error) {
    return (
      <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 border border-destructive/30" style={{ borderRadius: 0 }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ width: `${USABLE_WIDTH_PX}px` }}>
      <svg ref={svgRef} />
      {ready && <DigitGroups value={value} widthPx={USABLE_WIDTH_PX} />}
    </div>
  );
}

export function BarcodePrintPanel({ value, labelSize }: BarcodePrintPanelProps) {
  const [copies, setCopies] = useState(1);
  const [trimDots, setTrimDots] = useState(loadTrimDots);
  const updateTrim = (n: number) => {
    const clamped = Math.min(TRIM_MAX_DOTS, Math.max(0, n));
    setTrimDots(clamped);
    try {
      localStorage.setItem(TRIM_STORAGE_KEY, String(clamped));
    } catch {
      // storage unavailable — setting just won't persist
    }
  };
  // Content is naturally 2" wide x 1" tall (landscape). At 1 1/8" tape width
  // that doesn't fit unrotated, so it's rotated 90° there instead of at 2".
  const portrait = !shouldRotate90(labelSize);

  const handlePrint = () => {
    let el = document.getElementById("barcode-print-portal");
    if (!el) {
      el = document.createElement("div");
      el.id = "barcode-print-portal";
      document.body.appendChild(el);
    }

    // Render a fresh SVG for each copy via JsBarcode
    const format = detectFormat(value);
    const labels: string[] = [];

    for (let i = 0; i < copies; i++) {
      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      try {
        JsBarcode(svgEl, value, barcodeDrawOptions(format));
      } catch {
        // skip invalid
      }
      sizeSvg(svgEl, format, trimDots);
      const svgHTML = svgEl.outerHTML;
      const groups = splitDigitGroups(value);
      const groupsHTML = groups.map((g) => `<span>${g}</span>`).join("");
      const outerWidthIn = portrait ? LABEL_HEIGHT_IN : LABEL_WIDTH_IN;
      const outerHeightIn = portrait ? LABEL_WIDTH_IN : LABEL_HEIGHT_IN;
      labels.push(`<div style="
        width: ${outerWidthIn}in;
        height: ${outerHeightIn}in;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        overflow: hidden;
      "><div style="
        width: ${LABEL_WIDTH_IN}in;
        height: ${LABEL_HEIGHT_IN}in;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        padding: 0 ${SIDE_MARGIN_IN}in;
        transform: ${portrait ? "rotate(90deg)" : "none"};
      ">
        <div style="font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-size: ${LABEL_TEXT_FONT_SIZE_PT}pt; text-align: center; white-space: nowrap;">${LABEL_TEXT}</div>
        <div style="width: ${USABLE_WIDTH_PX}px;">${svgHTML}</div>
        <div style="display: flex; width: ${USABLE_WIDTH_PX}px; justify-content: ${groups.length > 1 ? "space-between" : "center"}; font-family: 'Courier New', monospace; font-size: ${BARCODE_FONT_SIZE_PT}pt; font-weight: 700; color: #000;">${groupsHTML}</div>
      </div></div>`);
    }

    el.innerHTML = labels.join("");
    setPageSizeIn(portrait ? LABEL_HEIGHT_IN : LABEL_WIDTH_IN, portrait ? LABEL_WIDTH_IN : LABEL_HEIGHT_IN);
    document.body.setAttribute("data-print-target", "barcode");
    window.print();
  };

  if (!value) return null;

  return (
    <div className="space-y-4">
      {/* Barcode preview */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-3">
          Barcode Preview — 2" × 1" ({portrait ? "portrait" : "landscape"})
        </label>
        <div className="bg-secondary border border-border flex items-center justify-center" style={{ padding: "24px" }}>
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: `${(portrait ? LABEL_HEIGHT_IN : LABEL_WIDTH_IN) * PX_PER_IN}px`,
              height: `${(portrait ? LABEL_WIDTH_IN : LABEL_HEIGHT_IN) * PX_PER_IN}px`,
            }}
          >
            <div
              className="bg-white flex flex-col items-center justify-center shrink-0"
              style={{
                width: `${LABEL_WIDTH_IN * PX_PER_IN}px`,
                height: `${LABEL_HEIGHT_IN * PX_PER_IN}px`,
                paddingLeft: `${SIDE_MARGIN_IN * PX_PER_IN}px`,
                paddingRight: `${SIDE_MARGIN_IN * PX_PER_IN}px`,
                boxSizing: "border-box",
                boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
                transform: portrait ? "rotate(90deg)" : undefined,
              }}
            >
              <div
                style={{
                  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                  fontSize: `${LABEL_TEXT_FONT_SIZE_PT}pt`,
                  color: "#000000",
                  whiteSpace: "nowrap",
                }}
              >
                {LABEL_TEXT}
              </div>
              <BarcodeRenderer value={value} trimDots={trimDots} />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center" style={{ fontFamily: "monospace" }}>
          {value} &middot; {detectFormat(value)}
        </p>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
          Copies
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCopies((c) => Math.max(1, c - 1))}
            className="w-8 h-8 border border-border bg-card hover:bg-secondary flex items-center justify-center transition-colors"
            style={{ borderRadius: 0 }}
          >
            <Minus size={12} />
          </button>
          <input
            type="number" min={1} max={100} value={copies}
            onChange={(e) => setCopies(Math.max(1, Math.min(100, Number(e.target.value))))}
            className="w-16 px-2 py-1.5 border border-border bg-input-background text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ borderRadius: 0 }}
          />
          <button
            onClick={() => setCopies((c) => Math.min(100, c + 1))}
            className="w-8 h-8 border border-border bg-card hover:bg-secondary flex items-center justify-center transition-colors"
            style={{ borderRadius: 0 }}
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => setCopies(1)}
            disabled={copies === 1}
            className="w-8 h-8 border border-border bg-card hover:bg-secondary text-muted-foreground disabled:opacity-30 flex items-center justify-center transition-colors"
            style={{ borderRadius: 0 }}
            aria-label="Reset copies to 1"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {detectFormat(value) === "codabar" && (
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
            Bar trim (printer dots)
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateTrim(trimDots - TRIM_STEP_DOTS)}
              disabled={trimDots <= 0}
              className="w-8 h-8 border border-border bg-card hover:bg-secondary disabled:opacity-30 flex items-center justify-center transition-colors"
              style={{ borderRadius: 0 }}
              aria-label="Decrease bar trim"
            >
              <Minus size={12} />
            </button>
            <span className="w-12 text-sm text-center" style={{ fontFamily: "monospace" }}>{trimDots.toFixed(2)}</span>
            <button
              onClick={() => updateTrim(trimDots + TRIM_STEP_DOTS)}
              disabled={trimDots >= TRIM_MAX_DOTS}
              className="w-8 h-8 border border-border bg-card hover:bg-secondary disabled:opacity-30 flex items-center justify-center transition-colors"
              style={{ borderRadius: 0 }}
              aria-label="Increase bar trim"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={() => updateTrim(DEFAULT_TRIM_DOTS)}
              disabled={trimDots === DEFAULT_TRIM_DOTS}
              className="w-8 h-8 border border-border bg-card hover:bg-secondary text-muted-foreground disabled:opacity-30 flex items-center justify-center transition-colors"
              style={{ borderRadius: 0 }}
              aria-label="Reset bar trim to default"
            >
              <RotateCcw size={12} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Thins each bar to offset thermal ink spread. Raise it if bars print too thick; saved in this browser.
          </p>
        </div>
      )}

      <button
        onClick={handlePrint}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
        style={{ borderRadius: 0 }}
      >
        <Printer size={15} />
        Print {copies} {copies === 1 ? "Barcode Label" : "Barcode Labels"}
      </button>
    </div>
  );
}
