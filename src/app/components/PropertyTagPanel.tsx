import { useState } from "react";
import { Printer, Minus, Plus } from "lucide-react";

const LABEL_WIDTH_MM = 50;
const LABEL_HEIGHT_MM = 20;
const FONT_SIZE_PT = 9;
const LINES = ["Albertsons Library", "Boise State University"];

export function PropertyTagPanel() {
  const [copies, setCopies] = useState(1);
  const [showBorder, setShowBorder] = useState(false);

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
        width: ${LABEL_WIDTH_MM}mm;
        height: ${LABEL_HEIGHT_MM}mm;
        background: white;
        border: ${showBorder ? "1px solid #1a1a1a" : "none"};
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
          overflow: hidden;
          color: #000;
          width: 100%;
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
          Preview — {LABEL_WIDTH_MM}mm × {LABEL_HEIGHT_MM}mm
        </label>
        <div
          className="bg-secondary border border-border flex items-center justify-center"
          style={{ minHeight: "140px", padding: "24px" }}
        >
          <div
            style={{
              width: `${LABEL_WIDTH_MM * 3.7795275591}px`,
              height: `${LABEL_HEIGHT_MM * 3.7795275591}px`,
              backgroundColor: "#ffffff",
              border: showBorder ? "1px solid #1a1a1a" : "none",
              boxShadow: showBorder ? "none" : "0 1px 6px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px",
              boxSizing: "border-box",
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
                  width: "100%",
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

      {/* Border */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Label Border
        </label>
        <button
          onClick={() => setShowBorder((b) => !b)}
          className={`relative w-10 h-5 transition-colors ${showBorder ? "bg-accent" : "bg-muted"}`}
          style={{ borderRadius: 0 }}
          role="switch"
          aria-checked={showBorder}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${
              showBorder ? "translate-x-5" : "translate-x-0.5"
            }`}
            style={{ borderRadius: 0 }}
          />
        </button>
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
