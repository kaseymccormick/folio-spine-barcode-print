import { useState } from "react";
import { Printer, Minus, Plus } from "lucide-react";
import { shouldRotate90, type LabelSize } from "../lib/labelSize";
import { setPageSizeIn } from "../lib/pageOrientation";

const FONT_SIZE_PT = 9;
const LINES = ["Albertsons Library", "Boise State University"];

// The printed content is always 2" wide x 1" tall — the global label size
// selector only decides whether that content prints landscape/as-is at 1 1/8"
// or portrait/rotated 90° at 2" (so the label stock feeds 1" wide x 2" tall).
const PX_PER_IN = 96;
const LABEL_WIDTH_IN = 2;
const LABEL_HEIGHT_IN = 1;

interface PropertyTagPanelProps {
  labelSize: LabelSize;
}

export function PropertyTagPanel({ labelSize }: PropertyTagPanelProps) {
  const [copies, setCopies] = useState(1);
  // Content is naturally 2" wide x 1" tall (landscape). At 1 1/8" tape width
  // that doesn't fit unrotated, so it's rotated 90° there instead of at 2".
  const portrait = !shouldRotate90(labelSize);

  const handlePrint = () => {
    let printEl = document.getElementById("property-tag-print-portal");
    if (!printEl) {
      printEl = document.createElement("div");
      printEl.id = "property-tag-print-portal";
      document.body.appendChild(printEl);
    }

    printEl.innerHTML = "";
    const outerWidthIn = portrait ? LABEL_HEIGHT_IN : LABEL_WIDTH_IN;
    const outerHeightIn = portrait ? LABEL_WIDTH_IN : LABEL_HEIGHT_IN;
    for (let i = 0; i < copies; i++) {
      const outerDiv = document.createElement("div");
      outerDiv.style.cssText = `
        width: ${outerWidthIn}in;
        height: ${outerHeightIn}in;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        overflow: hidden;
      `;
      const labelDiv = document.createElement("div");
      labelDiv.style.cssText = `
        width: ${LABEL_WIDTH_IN}in;
        height: ${LABEL_HEIGHT_IN}in;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2mm;
        box-sizing: border-box;
        transform: ${portrait ? "rotate(90deg)" : "none"};
      `;
      LINES.forEach((line) => {
        const lineDiv = document.createElement("div");
        lineDiv.style.cssText = `
          font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
          font-size: ${FONT_SIZE_PT}pt;
          line-height: 1.25;
          text-align: center;
          white-space: nowrap;
          color: #000;
        `;
        lineDiv.textContent = line;
        labelDiv.appendChild(lineDiv);
      });
      outerDiv.appendChild(labelDiv);
      printEl.appendChild(outerDiv);
    }
    setPageSizeIn(outerWidthIn, outerHeightIn);
    document.body.setAttribute("data-print-target", "property-tag");
    window.print();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-3">
          Preview — 2" × 1" ({portrait ? "portrait" : "landscape"})
        </label>
        <div
          className="bg-secondary border border-border flex items-center justify-center"
          style={{ padding: "24px" }}
        >
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: `${(portrait ? LABEL_HEIGHT_IN : LABEL_WIDTH_IN) * PX_PER_IN}px`,
              height: `${(portrait ? LABEL_WIDTH_IN : LABEL_HEIGHT_IN) * PX_PER_IN}px`,
            }}
          >
            <div
              className="shrink-0"
              style={{
                width: `${LABEL_WIDTH_IN * PX_PER_IN}px`,
                height: `${LABEL_HEIGHT_IN * PX_PER_IN}px`,
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px",
                boxSizing: "border-box",
                transform: portrait ? "rotate(90deg)" : undefined,
              }}
            >
              {LINES.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: `${FONT_SIZE_PT}pt`,
                    lineHeight: 1.25,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    color: "#000000",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          {copies} {copies === 1 ? "copy" : "copies"} will print
        </p>
      </div>

      {/* Copies */}
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
        Print {copies} {copies === 1 ? "Property Tag" : "Property Tags"}
      </button>
    </div>
  );
}
