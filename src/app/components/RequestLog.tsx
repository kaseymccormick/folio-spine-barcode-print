import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import type { RequestLogEntry } from "../lib/folioApi";

interface RequestLogProps {
  entries: RequestLogEntry[];
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export function RequestLog({ entries }: RequestLogProps) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  const latest = entries[0];

  return (
    <div className="border border-border text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-muted transition-colors text-left"
        style={{ borderRadius: 0 }}
      >
        {latest.ok
          ? <CheckCircle size={11} className="text-green-600 shrink-0" />
          : <XCircle size={11} className="text-destructive shrink-0" />}
        <span className="text-secondary-foreground">{latest.note}</span>
        <span className={`${latest.ok ? "text-green-700" : "text-destructive"} shrink-0`}>
          {latest.status ?? "ERR"}
        </span>
        <span className="flex-1 truncate text-secondary-foreground opacity-60">{latest.url}</span>
        <span className="text-secondary-foreground opacity-50 shrink-0">{timeAgo(latest.ts)}</span>
        {open ? <ChevronUp size={11} className="shrink-0" /> : <ChevronDown size={11} className="shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {entries.map((e, i) => (
            <div key={i} className="px-3 py-2 bg-card flex items-start gap-2">
              {e.ok
                ? <CheckCircle size={10} className="text-green-600 shrink-0 mt-0.5" />
                : <XCircle size={10} className="text-destructive shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{e.method}</span>
                  <span className={e.ok ? "text-green-700" : "text-destructive"}>{e.status ?? "ERR"}</span>
                  <span className="text-muted-foreground opacity-60">{e.note}</span>
                  <span className="text-muted-foreground opacity-40 ml-auto shrink-0 flex items-center gap-1">
                    <Clock size={9} />
                    {timeAgo(e.ts)}
                  </span>
                </div>
                <div className="text-muted-foreground opacity-70 break-all">{e.url}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
