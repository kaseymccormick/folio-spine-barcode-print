import { useState } from "react";
import { Printer, Minus, Plus } from "lucide-react";

const FONT_SIZE_PT = 9;
const LINES = ["Albertsons Library", "Boise State University"];

// Fixed physical size for the property tag stock — 2" wide x 1" tall.
const PX_PER_IN = 96;
const LABEL_WIDTH_IN = 2;
const LABEL_HEIGHT_IN = 1;

export function PropertyTagPanel() {
  const [copies, setCopies] = useState(1);

  const handlePrint = () => {
    let printEl = document.getElementById("property-tag-print-portal");
    if (!printEl) {
      printEl = document.createElement("div");
      printEl.id = "property-tag-print-portal";
      document.body.appendChild(printEl);
    }

    printEl.innerHTML = "";
    for (let i = 0; i < copies; i++) {
      const labelDiv = document.createElement("div");
      labelDiv.style.cssText = `
        width: ${LABEL_WIDTH_IN}in;
        height: ${LABEL_HEIGHT_IN}in;
        background: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2mm;
        box-sizing: border-box;
        overflow: hidden;
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
      printEl.appendChild(labelDiv);
    }
    window.print();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-3">
          Preview — 2" × 1"
        </label>
        <div
          className="bg-secondary border border-border flex items-center justify-center"
          style={{ padding: "24px" }}
        >
          <div
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
              overflow: "hidden",
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
