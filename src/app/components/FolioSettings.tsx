import { useState, useEffect } from "react";
import { Settings, CheckCircle, XCircle, Loader, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";

export interface FolioConfig {
  url: string;
  tenant: string;
  username: string;
  password: string;
}

export const FOLIO_STORAGE_KEY = "folio_config";

export function loadFolioConfig(): FolioConfig | null {
  try {
    const raw = sessionStorage.getItem(FOLIO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveFolioConfig(config: FolioConfig) {
  sessionStorage.setItem(FOLIO_STORAGE_KEY, JSON.stringify(config));
}

interface FolioSettingsProps {
  onConfigChange: (config: FolioConfig | null) => void;
}

type TestState = "idle" | "loading" | "ok" | "error";

export function FolioSettings({ onConfigChange }: FolioSettingsProps) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testState, setTestState] = useState<TestState>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [form, setForm] = useState<FolioConfig>(() => {
    return loadFolioConfig() ?? { url: "", tenant: "", username: "", password: "" };
  });

  const isConfigured = !!(form.url && form.tenant && form.username && form.password);

  const set = (key: keyof FolioConfig, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const saved = loadFolioConfig();
    if (saved) {
      setForm(saved);
      onConfigChange(saved);
    }
  }, []);

  const handleClear = () => {
    setForm({ url: "", tenant: "", username: "", password: "" });
    sessionStorage.removeItem(FOLIO_STORAGE_KEY);
    onConfigChange(null);
    setTestState("idle");
    setTestMessage("");
  };

  const handleTest = async () => {
    setTestState("loading");
    setTestMessage("");
    try {
      const base = form.url.replace(/\/$/, "");
      const res = await fetch(`${base}/authn/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-okapi-tenant": form.tenant,
        },
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      if (res.ok || res.status === 201) {
        setTestState("ok");
        setTestMessage("Connected successfully.");
        saveFolioConfig(form);
        onConfigChange(form);
      } else {
        const text = await res.text().catch(() => "");
        setTestState("error");
        setTestMessage(
          `Auth failed (${res.status}). Check credentials or tenant ID.${text ? " " + text.slice(0, 120) : ""}`
        );
      }
    } catch (err) {
      setTestState("error");
      setTestMessage(
        err instanceof TypeError && err.message.includes("fetch")
          ? "Network error — check the URL and that CORS is enabled on your FOLIO OKAPI gateway."
          : String(err)
      );
    }
  };

  const isSaved = !!(loadFolioConfig()?.url);

  return (
    <div className="border border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-secondary transition-colors text-left"
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium">FOLIO Integration</span>
          {isSaved ? (
            <span className="text-xs px-1.5 py-0.5 bg-accent text-accent-foreground" style={{ borderRadius: 0 }}>
              Connected
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">— using Open Library fallback</span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 border-t border-border space-y-4 bg-card">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter your FOLIO OKAPI gateway details. The app queries your catalog by ISBN and pulls the
            call number from your holdings records.{" "}
            <strong>Note:</strong> OKAPI must allow CORS from this origin, or run this app on the same
            network/domain as your FOLIO instance.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1">
                OKAPI URL
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://okapi.your-library.org"
                className="w-full px-3 py-2 border border-border bg-input-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ borderRadius: 0 }}
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1">
                Tenant ID
              </label>
              <input
                type="text"
                value={form.tenant}
                onChange={(e) => set("tenant", e.target.value)}
                placeholder="your_tenant"
                className="w-full px-3 py-2 border border-border bg-input-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                style={{ borderRadius: 0, fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  placeholder="catalog_admin"
                  className="w-full px-3 py-2 border border-border bg-input-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground block mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-8 border border-border bg-input-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    style={{ borderRadius: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {testState !== "idle" && (
            <div
              className={`flex items-start gap-2 px-3 py-2 text-xs border ${
                testState === "ok"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : testState === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-secondary border-border text-secondary-foreground"
              }`}
              style={{ borderRadius: 0 }}
            >
              {testState === "loading" && <Loader size={12} className="animate-spin mt-0.5 shrink-0" />}
              {testState === "ok" && <CheckCircle size={12} className="mt-0.5 shrink-0" />}
              {testState === "error" && <XCircle size={12} className="mt-0.5 shrink-0" />}
              <span>{testState === "loading" ? "Testing connection…" : testMessage}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={!isConfigured || testState === "loading"}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground text-xs hover:opacity-90 disabled:opacity-40 transition-opacity"
              style={{ borderRadius: 0 }}
            >
              {testState === "loading" ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Test &amp; Save
            </button>
            {isSaved && (
              <button
                onClick={handleClear}
                className="px-4 py-2 border border-border bg-card text-muted-foreground text-xs hover:bg-secondary transition-colors"
                style={{ borderRadius: 0 }}
              >
                Disconnect
              </button>
            )}
          </div>

          <p className="text-xs text-warning">
            Credentials are stored only in this browser tab&apos;s session (cleared when the tab closes) — never sent anywhere except your FOLIO server.
          </p>
        </div>
      )}
    </div>
  );
}
