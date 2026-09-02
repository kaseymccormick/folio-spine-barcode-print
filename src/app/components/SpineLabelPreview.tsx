import { useEffect, useRef, useState } from "react";
import { Printer, Minus, Plus } from "lucide-react";
import type { LabelConfig } from "./SpineLabelEditor";
import { LABEL_SIZE_MM, shouldRotate90, type LabelSize } from "../lib/labelSize";

interface SpineLabelPreviewProps {
  config: LabelConfig;
  onChange: (config: LabelConfig) => void;
  labelSize: LabelSize;
}

const MM_TO_PX = 3.7795275591; // 96 dpi

// The spine label's own layout is always the same narrow, top-to-bottom
// stack of call number lines — that never changes with the size selector.
// At 1 1/8" it prints as-is; at 2" the same content is rotated 90° in place
// (rather than re-flowed) so the printer's own cutter can trim it without
// the user having to trim it by hand afterward.
const NATURAL_WIDTH_MM = LABEL_SIZE_MM["1.125"];

function SpineLabel({ config, innerRef }: { config: LabelConfig; innerRef?: React.Ref<HTMLDivElement> }) {
  const fixedPx = NATURAL_WIDTH_MM * MM_TO_PX;
  const fontFamily = "'Inter', 'Helvetica Neue', Arial, sans-serif";

  return (
    <div
      ref={innerRef}
      style={{
        width: `${fixedPx}px`,
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "4px 4px 4px 5px",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      {config.lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily,
            fontSize: `${config.fontSize}pt`,
            fontWeight: config.bold ? 700 : 400,
            lineHeight: 1.15,
            textAlign: "left",
            whiteSpace: "nowrap",
            color: "#000000",
          }}
        >
          {line || " "}
        </div>
      ))}
    </div>
  );
}

export function SpineLabelPreview({ config, onChange, labelSize }: SpineLabelPreviewProps) {
  const rotate = shouldRotate90(labelSize);
  const setCopies = (copies: number) => onChange({ ...config, copies });
  const contentRef = useRef<HTMLDivElement>(null);
  const [naturalHeightPx, setNaturalHeightPx] = useState(0);

  useEffect(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    const measure = () => setNaturalHeightPx(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [config.lines, config.fontSize, config.bold]);

  const handlePrint = () => {
    let printEl = document.getElementById("spine-print-portal");
    if (!printEl) {
      printEl = document.createElement("div");
      printEl.id = "spine-print-portal";
      document.body.appendChild(printEl);
    }

    const fontFamily = "'Inter', 'Helvetica Neue', Arial, sans-serif";

    // Build via DOM APIs (textContent) rather than HTML string interpolation —
    // config.lines can contain catalog data (including from public, editable
    // sources like Open Library), so it must never be treated as trusted HTML.
    printEl.innerHTML = "";

    // Off-screen (not display:none, so it still lays out) container used to
    // measure each label's natural rendered height before rotating it.
    const measurer = document.createElement("div");
    measurer.style.cssText = "position: absolute; left: -9999px; top: 0; visibility: hidden;";
    document.body.appendChild(measurer);

    for (let i = 0; i < config.copies; i++) {
      const labelDiv = document.createElement("div");
      labelDiv.style.cssText = `
        width: ${NATURAL_WIDTH_MM}mm;
        background: white;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        padding: 2mm 2mm 2mm 3mm;
        box-sizing: border-box;
      `;
      config.lines.forEach((line) => {
        const lineDiv = document.createElement("div");
        lineDiv.style.cssText = `
          font-family: ${fontFamily};
          font-size: ${config.fontSize}pt;
          font-weight: ${config.bold ? 700 : 400};
          line-height: 1.15;
          text-align: left;
          white-space: nowrap;
          color: #000;
        `;
        lineDiv.textContent = line || " ";
        labelDiv.appendChild(lineDiv);
      });

      if (!rotate) {
        printEl.appendChild(labelDiv);
        continue;
      }

      measurer.appendChild(labelDiv);
      const naturalHeightMm = labelDiv.offsetHeight / MM_TO_PX;
      measurer.removeChild(labelDiv);

      const outerDiv = document.createElement("div");
      outerDiv.style.cssText = `
        width: ${naturalHeightMm}mm;
        height: ${NATURAL_WIDTH_MM}mm;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      `;
      labelDiv.style.transform = "rotate(90deg)";
      outerDiv.appendChild(labelDiv);
      printEl.appendChild(outerDiv);
    }

    document.body.removeChild(measurer);
    document.body.setAttribute("data-print-target", "spine");
    window.print();
  };

  const fixedPx = NATURAL_WIDTH_MM * MM_TO_PX;
  const outerWidthPx = rotate ? naturalHeightPx : fixedPx;
  const outerHeightPx = rotate ? fixedPx : naturalHeightPx;
  const previewScale = Math.min(1, 180 / Math.max(outerWidthPx, 1), 280 / Math.max(outerHeightPx, 1));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-3">
          Preview — {rotate ? "portrait (rotated)" : "landscape"}
        </label>
        <div
          className="bg-secondary border border-border flex items-center justify-center"
          style={{ minHeight: "200px", padding: "24px" }}
        >
          <div style={{ transform: `scale(${previewScale})`, transformOrigin: "center center" }}>
            <div
              style={{
                width: `${outerWidthPx}px`,
                height: `${outerHeightPx}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
              }}
            >
              <div style={{ transform: rotate ? "rotate(90deg)" : undefined }}>
                <SpineLabel config={config} innerRef={contentRef} />
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          {config.copies} {config.copies === 1 ? "copy" : "copies"} will print
        </p>
      </div>

      {/* Copies */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
          Copies
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCopies(Math.max(1, config.copies - 1))}
            className="w-8 h-8 border border-border bg-card hover:bg-secondary text-foreground text-sm transition-colors flex items-center justify-center"
            style={{ borderRadius: 0 }}
          >
            <Minus size={12} />
          </button>
          <input
            type="number"
            min={1}
            max={100}
            value={config.copies}
            onChange={(e) => setCopies(Math.max(1, Math.min(100, Number(e.target.value))))}
            className="w-16 px-2 py-1.5 border border-border bg-input-background text-foreground text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ borderRadius: 0 }}
          />
          <button
            onClick={() => setCopies(Math.min(100, config.copies + 1))}
            className="w-8 h-8 border border-border bg-card hover:bg-secondary text-foreground text-sm transition-colors flex items-center justify-center"
            style={{ borderRadius: 0 }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      <button
        onClick={handlePrint}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-accent-foreground hover:opacity-90 transition-opacity text-sm font-medium"
        style={{ borderRadius: 0 }}
      >
        <Printer size={15} />
        Print {config.copies} {config.copies === 1 ? "Label" : "Labels"}
      </button>
    </div>
  );
}
