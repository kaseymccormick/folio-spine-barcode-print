import { useRef, useState, useEffect } from "react";
import { Printer, Minus, Plus, RotateCcw, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, RemoveFormatting } from "lucide-react";
import { shouldRotate90, type LabelSize } from "../lib/labelSize";
import { setPageSizeIn } from "../lib/pageOrientation";
import {
  CUSTOM_FONTS, type CustomFontKey, clampFontPt, clampCopies, copySafeContent, isBlank,
  CUSTOM_FONT_MIN_PT, CUSTOM_FONT_MAX_PT,
} from "../lib/customLabel";

// Same physical content box as the property tag: 2" x 1", rotated 90° when
// the global label size selector says the stock feeds portrait.
const PX_PER_IN = 96;
const LABEL_WIDTH_IN = 2;
const LABEL_HEIGHT_IN = 1;
const DEFAULT_TEXT = "Your text here";

interface CustomLabelPanelProps {
  labelSize: LabelSize;
}

const btn = "w-8 h-8 border border-border bg-card hover:bg-secondary flex items-center justify-center transition-colors";

export function CustomLabelPanel({ labelSize }: CustomLabelPanelProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  // True until the user first focuses the box; the starter text is then
  // selected so the first keystroke replaces it.
  const pristine = useRef(true);
  const [copies, setCopies] = useState(1);
  const [fontPt, setFontPt] = useState(12);
  const [font, setFont] = useState<CustomFontKey>("sans");
  const [overflow, setOverflow] = useState(false);
  const [empty, setEmpty] = useState(false);
  const portrait = !shouldRotate90(labelSize);

  const checkContent = () => {
    const el = editorRef.current;
    if (!el) return;
    setOverflow(el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
    setEmpty(isBlank(el));
  };

  useEffect(() => {
    const el = editorRef.current;
    if (el && !el.hasChildNodes()) {
      const d = document.createElement("div");
      d.textContent = DEFAULT_TEXT;
      el.appendChild(d);
    }
    document.execCommand("styleWithCSS", false, "false");
    checkContent();
  }, []);

  useEffect(checkContent, [fontPt, font]);

  const onFocus = () => {
    if (!pristine.current) return;
    pristine.current = false;
    // Defer so the browser's own click-to-place-caret doesn't undo it.
    setTimeout(() => {
      const el = editorRef.current;
      if (el) document.getSelection()?.selectAllChildren(el);
    }, 0);
  };

  const exec = (cmd: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false);
    checkContent();
  };

  // Keep the selection in the editor when a toolbar button is pressed.
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  };

  const handlePrint = () => {
    const editor = editorRef.current;
    if (!editor || isBlank(editor)) return;

    let printEl = document.getElementById("custom-label-print-portal");
    if (!printEl) {
      printEl = document.createElement("div");
      printEl.id = "custom-label-print-portal";
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
        justify-content: center;
        padding: 2mm;
        box-sizing: border-box;
        overflow: hidden;
        transform: ${portrait ? "rotate(90deg)" : "none"};
        font-family: ${CUSTOM_FONTS[font].css};
        font-size: ${fontPt}pt;
        line-height: 1.25;
        text-align: center;
        color: #000;
      `;
      copySafeContent(editor, labelDiv);
      outerDiv.appendChild(labelDiv);
      printEl.appendChild(outerDiv);
    }
    setPageSizeIn(outerWidthIn, outerHeightIn);
    document.body.setAttribute("data-print-target", "custom-label");
    window.print();
  };

  const label = "text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1.5";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Text formatting">
        <button type="button" onMouseDown={keepFocus} onClick={() => exec("bold")} className={btn} style={{ borderRadius: 0 }} aria-label="Bold"><Bold size={13} /></button>
        <button type="button" onMouseDown={keepFocus} onClick={() => exec("italic")} className={btn} style={{ borderRadius: 0 }} aria-label="Italic"><Italic size={13} /></button>
        <button type="button" onMouseDown={keepFocus} onClick={() => exec("underline")} className={btn} style={{ borderRadius: 0 }} aria-label="Underline"><Underline size={13} /></button>
        <span className="w-px h-6 bg-border mx-1" />
        <button type="button" onMouseDown={keepFocus} onClick={() => exec("justifyLeft")} className={btn} style={{ borderRadius: 0 }} aria-label="Align left"><AlignLeft size={13} /></button>
        <button type="button" onMouseDown={keepFocus} onClick={() => exec("justifyCenter")} className={btn} style={{ borderRadius: 0 }} aria-label="Align center"><AlignCenter size={13} /></button>
        <button type="button" onMouseDown={keepFocus} onClick={() => exec("justifyRight")} className={btn} style={{ borderRadius: 0 }} aria-label="Align right"><AlignRight size={13} /></button>
        <span className="w-px h-6 bg-border mx-1" />
        <button type="button" onMouseDown={keepFocus} onClick={() => exec("removeFormat")} className={btn} style={{ borderRadius: 0 }} aria-label="Clear formatting"><RemoveFormatting size={13} /></button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className={label}>Font size (pt)</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setFontPt((s) => clampFontPt(s - 1))} className={btn} style={{ borderRadius: 0 }} aria-label="Smaller"><Minus size={12} /></button>
            <input
              type="number" min={CUSTOM_FONT_MIN_PT} max={CUSTOM_FONT_MAX_PT} value={fontPt}
              onChange={(e) => setFontPt(clampFontPt(Number(e.target.value)))}
              className="w-16 px-2 py-1.5 border border-border bg-input-background text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
              style={{ borderRadius: 0 }}
            />
            <button type="button" onClick={() => setFontPt((s) => clampFontPt(s + 1))} className={btn} style={{ borderRadius: 0 }} aria-label="Larger"><Plus size={12} /></button>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="custom-label-font">Font</label>
          <select
            id="custom-label-font" value={font}
            onChange={(e) => setFont(e.target.value as CustomFontKey)}
            className="px-2 py-1.5 border border-border bg-input-background text-sm focus:outline-none focus:ring-1 focus:ring-ring h-8"
            style={{ borderRadius: 0 }}
          >
            {(Object.keys(CUSTOM_FONTS) as CustomFontKey[]).map((k) => (
              <option key={k} value={k}>{CUSTOM_FONTS[k].title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* WYSIWYG editor — the label itself */}
      <div>
        <label className={label}>
          Label — 2" × 1" (click and type; prints {portrait ? "rotated 90° for portrait stock" : "as shown"})
        </label>
        <div className="bg-secondary border border-border flex items-center justify-center" style={{ padding: "24px" }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Label text"
            onFocus={onFocus}
            onInput={checkContent}
            onPaste={onPaste}
            style={{
              width: `${LABEL_WIDTH_IN * PX_PER_IN}px`,
              height: `${LABEL_HEIGHT_IN * PX_PER_IN}px`,
              backgroundColor: "#ffffff",
              boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "8px",
              boxSizing: "border-box",
              overflow: "hidden",
              fontFamily: CUSTOM_FONTS[font].css,
              fontSize: `${fontPt}pt`,
              lineHeight: 1.25,
              textAlign: "center",
              color: "#000000",
              outlineOffset: 2,
            }}
          />
        </div>
        {overflow && (
          <p className="text-xs mt-1.5 text-center" style={{ color: "var(--destructive, #b91c1c)" }}>
            Text is too big for the label and will be cut off — shrink the font or shorten the text.
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          {copies} {copies === 1 ? "copy" : "copies"} will print
        </p>
      </div>

      {/* Copies */}
      <div>
        <label className={label}>Copies</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setCopies((c) => clampCopies(c - 1))} className={btn} style={{ borderRadius: 0 }} aria-label="Fewer copies"><Minus size={12} /></button>
          <input
            type="number" min={1} max={100} value={copies}
            onChange={(e) => setCopies(clampCopies(Number(e.target.value)))}
            className="w-16 px-2 py-1.5 border border-border bg-input-background text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ borderRadius: 0 }}
          />
          <button type="button" onClick={() => setCopies((c) => clampCopies(c + 1))} className={btn} style={{ borderRadius: 0 }} aria-label="More copies"><Plus size={12} /></button>
          <button
            type="button" onClick={() => setCopies(1)} disabled={copies === 1}
            className={`${btn} text-muted-foreground disabled:opacity-30`} style={{ borderRadius: 0 }}
            aria-label="Reset copies to 1"
          ><RotateCcw size={12} /></button>
        </div>
      </div>

      <button
        type="button" onClick={handlePrint} disabled={empty}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-40"
        style={{ borderRadius: 0 }}
      >
        <Printer size={15} />
        Print {copies} {copies === 1 ? "Custom Label" : "Custom Labels"}
      </button>
    </div>
  );
}
