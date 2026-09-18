import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import type { HelpDoc } from "../lib/helpDocs";

const APP_TITLE = "Albertsons Library Spine & Barcode Label Printing Software";

function storedThemeIsDark(): boolean {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored === "dark";
  } catch {
    // fall through to the system preference
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function HelpDocPage({ doc }: { doc: HelpDoc }) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", storedThemeIsDark());
    document.title = `${doc.title} — ${APP_TITLE}`;
  }, [doc.title]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} />
          Back to label printer
        </a>
        <h1 className="text-xl font-medium">{doc.title}</h1>
        <div className="text-sm leading-relaxed space-y-3">{doc.content}</div>
      </div>
    </div>
  );
}
