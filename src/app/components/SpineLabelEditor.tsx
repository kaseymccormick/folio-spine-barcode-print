import { Plus, Minus, RefreshCw } from "lucide-react";

export interface LabelConfig {
  lines: string[];
  fontSize: number;
  copies: number;
  labelWidthMm: number;
  labelHeightMm: number;
  bold: boolean;
  showBorder: boolean;
}

interface SpineLabelEditorProps {
  config: LabelConfig;
  onChange: (config: LabelConfig) => void;
  suggestedLines: string[];
  onReset: () => void;
}

const MIN_LINES = 1;
const MAX_LINES = 8;

export function SpineLabelEditor({ config, onChange, suggestedLines, onReset }: SpineLabelEditorProps) {
  const update = (partial: Partial<LabelConfig>) => onChange({ ...config, ...partial });

  const setLine = (index: number, value: string) => {
    const lines = [...config.lines];
    lines[index] = value;
    update({ lines });
  };

  const addLine = () => {
    if (config.lines.length < MAX_LINES) {
      update({ lines: [...config.lines, ""] });
    }
  };

  const removeLine = (index: number) => {
    if (config.lines.length > MIN_LINES) {
      const lines = config.lines.filter((_, i) => i !== index);
      update({ lines });
    }
  };

  return (
    <div className="space-y-5">
      {/* Call number lines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Call Number Lines
          </label>
          {suggestedLines.length > 0 && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-accent hover:opacity-80 transition-opacity"
            >
              <RefreshCw size={10} />
              Reset to suggested
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {config.lines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4 text-right select-none">{i + 1}</span>
              <input
                type="text"
                value={line}
                onChange={(e) => setLine(i, e.target.value)}
                placeholder={`Line ${i + 1}`}
                className="flex-1 px-2 py-1.5 border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ borderRadius: 0, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
              />
              <button
                onClick={() => removeLine(i)}
                disabled={config.lines.length <= MIN_LINES}
                className="text-muted-foreground hover:text-destructive disabled:opacity-20 transition-colors"
              >
                <Minus size={12} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addLine}
          disabled={config.lines.length >= MAX_LINES}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          <Plus size={12} />
          Add line
        </button>
      </div>

      {/* Style */}
      <div>
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
            Weight
          </label>
          <div className="flex border border-border overflow-hidden">
            <button
              onClick={() => update({ bold: false })}
              className={`flex-1 py-1.5 text-xs transition-colors ${
                !config.bold
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              }`}
              style={{ borderRadius: 0 }}
            >
              Normal
            </button>
            <button
              onClick={() => update({ bold: true })}
              className={`flex-1 py-1.5 text-xs border-l border-border transition-colors ${
                config.bold
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              }`}
              style={{ borderRadius: 0, fontWeight: 700 }}
            >
              Bold
            </button>
          </div>
        </div>
      </div>

      {/* Font size */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
          Font Size — {config.fontSize}pt
        </label>
        <input
          type="range"
          min={6}
          max={18}
          value={config.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
          <span>6pt</span>
          <span>18pt</span>
        </div>
      </div>

      {/* Label dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
            Width (mm)
          </label>
          <input
            type="number"
            min={15}
            max={80}
            value={config.labelWidthMm}
            onChange={(e) => update({ labelWidthMm: Number(e.target.value) })}
            className="w-full px-2 py-1.5 border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5">
            Height (mm)
          </label>
          <input
            type="number"
            min={15}
            max={120}
            value={config.labelHeightMm}
            onChange={(e) => update({ labelHeightMm: Number(e.target.value) })}
            className="w-full px-2 py-1.5 border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ borderRadius: 0 }}
          />
        </div>
      </div>

      {/* Border */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Label Border
        </label>
        <button
          onClick={() => update({ showBorder: !config.showBorder })}
          className={`relative w-10 h-5 transition-colors ${config.showBorder ? "bg-accent" : "bg-muted"}`}
          style={{ borderRadius: 0 }}
          role="switch"
          aria-checked={config.showBorder}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${
              config.showBorder ? "translate-x-5" : "translate-x-0.5"
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
            onClick={() => update({ copies: Math.max(1, config.copies - 1) })}
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
            onChange={(e) => update({ copies: Math.max(1, Math.min(100, Number(e.target.value))) })}
            className="w-16 px-2 py-1.5 border border-border bg-input-background text-foreground text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ borderRadius: 0 }}
          />
          <button
            onClick={() => update({ copies: Math.min(100, config.copies + 1) })}
            className="w-8 h-8 border border-border bg-card hover:bg-secondary text-foreground text-sm transition-colors flex items-center justify-center"
            style={{ borderRadius: 0 }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
