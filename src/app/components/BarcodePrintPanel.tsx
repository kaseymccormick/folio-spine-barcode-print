import { useEffect, useRef, useState } from "react";
import { Printer, Minus, Plus } from "lucide-react";
import JsBarcode from "jsbarcode";

interface BarcodePrintPanelProps {
  value: string;
}

function detectFormat(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 13) return "EAN13";
  if (digits.length === 12) return "UPC";
  if (digits.length === 8) return "EAN8";
  return "CODE128";
}

function BarcodeRenderer({ value, fontSize }: { value: string; fontSize: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    setError(null);
    try {
      const format = detectFormat(value);
      JsBarcode(svgRef.current, value, {
        format,
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize,
        fontOptions: "",
        font: "JetBrains Mono, Courier New, monospace",
        textMargin: 2,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
        valid: () => setError(null),
      });
    } catch {
      setError("Cannot render barcode — value may be invalid for detected format.");
    }
  }, [value, fontSize]);

  if (error) {
    return (
      <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 border border-destructive/30" style={{ borderRadius: 0 }}>
        {error}
      </div>
    );
  }

  return <svg ref={svgRef} className="w-full" />;
}

export function BarcodePrintPanel({ value }: BarcodePrintPanelProps) {
  const [copies, setCopies] = useState(1);
  const [fontSize, setFontSize] = useState(10);
  const [labelWidthMm, setLabelWidthMm] = useState(50);
  const [labelHeightMm, setLabelHeightMm] = useState(25);

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
          displayValue: true,
          fontSize,
          font: "Courier New, monospace",
          textMargin: 2,
          margin: 4,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch {
        // skip invalid
      }
      const svgHTML = svgEl.outerHTML;
      labels.push(`<div style="
        width: ${labelWidthMm}mm;
        height: ${labelHeightMm}mm;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-sizing: border-box;
        padding: 1mm;
      ">${svgHTML}</div>`);
    }

    el.innerHTML = labels.join("");
    window.print();
  };

  if (!value) return null;

  return (
    <div className="space-y-4">
      {/* Barcode preview */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-3">
          Barcode Preview
        </label>
        <div
          className="bg-white border border-border flex items-center justify-center p-4"
          style={{ minHeight: "100px" }}
        >
          <div className="w-full max-w-[220px]">
            <BarcodeRenderer value={value} fontSize={fontSize} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {value} &middot; {detectFormat(value)}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
            Width (mm)
          </label>
          <input
            type="number" min={25} max={100} value={labelWidthMm}
            onChange={(e) => setLabelWidthMm(Number(e.target.value))}
            className="w-full px-2 py-1.5 border border-border bg-input-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
            Height (mm)
          </label>
          <input
            type="number" min={12} max={80} value={labelHeightMm}
            onChange={(e) => setLabelHeightMm(Number(e.target.value))}
            className="w-full px-2 py-1.5 border border-border bg-input-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ borderRadius: 0 }}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
          Text Size — {fontSize}pt
        </label>
        <input
          type="range" min={6} max={16} value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
          <span>6pt</span><span>16pt</span>
        </div>
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
