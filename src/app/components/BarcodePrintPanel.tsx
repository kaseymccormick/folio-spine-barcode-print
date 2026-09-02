import { useEffect, useRef, useState } from "react";
import { Printer, Minus, Plus } from "lucide-react";
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
  return "CODE128";
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
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
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

function BarcodeRenderer({ value }: { value: string }) {
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
        format,
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
        valid: () => setError(null),
      });
      // No viewBox is set by default, so a CSS-driven resize would just clip
      // or letterbox the bars — add one so the SVG scales proportionally.
      const w = svgRef.current.getAttribute("width");
      const h = svgRef.current.getAttribute("height");
      if (w && h) svgRef.current.setAttribute("viewBox", `0 0 ${w} ${h}`);
      setReady(true);
    } catch {
      setError("Cannot render barcode — value may be invalid for detected format.");
    }
  }, [value]);

  if (error) {
    return (
      <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 border border-destructive/30" style={{ borderRadius: 0 }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ width: `${USABLE_WIDTH_PX}px` }}>
      <svg ref={svgRef} style={{ width: "100%", height: "auto", display: "block" }} />
      {ready && <DigitGroups value={value} widthPx={USABLE_WIDTH_PX} />}
    </div>
  );
}

export function BarcodePrintPanel({ value, labelSize }: BarcodePrintPanelProps) {
  const [copies, setCopies] = useState(1);
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
        JsBarcode(svgEl, value, {
          format,
          width: 1.5,
          height: 40,
          displayValue: false,
          margin: 4,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch {
        // skip invalid
      }
      const w = svgEl.getAttribute("width");
      const h = svgEl.getAttribute("height");
      if (w && h) svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
      svgEl.setAttribute("style", "width: 100%; height: auto; display: block;");
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
        <div style="display: flex; width: ${USABLE_WIDTH_PX}px; justify-content: ${groups.length > 1 ? "space-between" : "center"}; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: ${BARCODE_FONT_SIZE_PT}pt; font-weight: 700; color: #000;">${groupsHTML}</div>
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
              <BarcodeRenderer value={value} />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
        </div>
      </div>

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
