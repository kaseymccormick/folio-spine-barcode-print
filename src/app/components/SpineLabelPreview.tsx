import { Printer } from "lucide-react";
import type { LabelConfig } from "./SpineLabelEditor";

interface SpineLabelPreviewProps {
  config: LabelConfig;
}

const MM_TO_PX = 3.7795275591; // 96 dpi

function SpineLabel({ config }: { config: LabelConfig }) {
  const widthPx = config.labelWidthMm * MM_TO_PX;
  const heightPx = config.labelHeightMm * MM_TO_PX;
  const fontFamily = "'Inter', 'Helvetica Neue', Arial, sans-serif";

  return (
    <div
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        backgroundColor: "#ffffff",
        border: config.showBorder ? "1px solid #1a1a1a" : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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
            overflow: "hidden",
            textOverflow: "clip",
            color: "#000000",
            width: "100%",
          }}
        >
          {line || " "}
        </div>
      ))}
    </div>
  );
}

export function SpineLabelPreview({ config }: SpineLabelPreviewProps) {
  const handlePrint = () => {
    let printEl = document.getElementById("spine-print-portal");
    if (!printEl) {
      printEl = document.createElement("div");
      printEl.id = "spine-print-portal";
      document.body.appendChild(printEl);
    }

    const fontFamily = "'Inter', 'Helvetica Neue', Arial, sans-serif";

    const labelHTML = `<div style="
      width: ${config.labelWidthMm}mm;
      height: ${config.labelHeightMm}mm;
      background: white;
      border: ${config.showBorder ? "1px solid #1a1a1a" : "none"};
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      padding: 2mm 2mm 2mm 3mm;
      box-sizing: border-box;
      overflow: hidden;
    ">${config.lines
      .map(
        (line) => `<div style="
        font-family: ${fontFamily};
        font-size: ${config.fontSize}pt;
        font-weight: ${config.bold ? 700 : 400};
        line-height: 1.15;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        color: #000;
        width: 100%;
      ">${line || "&nbsp;"}</div>`
      )
      .join("")}</div>`;

    printEl.innerHTML = Array.from({ length: config.copies }).map(() => labelHTML).join("");
    window.print();
  };

  const widthPx = config.labelWidthMm * MM_TO_PX;
  const heightPx = config.labelHeightMm * MM_TO_PX;

  const previewScale = Math.min(
    1,
    180 / Math.max(widthPx, 1),
    280 / Math.max(heightPx, 1)
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-3">
          Preview — {config.labelWidthMm}mm × {config.labelHeightMm}mm
        </label>
        <div
          className="bg-secondary border border-border flex items-center justify-center"
          style={{ minHeight: "200px", padding: "24px" }}
        >
          <div
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: "center center",
              boxShadow: config.showBorder ? "none" : "0 1px 6px rgba(0,0,0,0.12)",
            }}
          >
            <SpineLabel config={config} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          {config.copies} {config.copies === 1 ? "copy" : "copies"} will print
        </p>
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
