import type { FolioConfig } from "../components/FolioSettings";

export interface RequestLogEntry {
  method: string;
  url: string;
  status: number | null;
  ok: boolean;
  note: string;
  ts: number;
}

let _log: RequestLogEntry[] = [];
let _onLog: ((entries: RequestLogEntry[]) => void) | null = null;

export function setRequestLogListener(fn: ((entries: RequestLogEntry[]) => void) | null) {
  _onLog = fn;
}

async function logged(url: string, init: RequestInit, note: string): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  let status: number | null = null;
  let ok = false;
  try {
    const res = await fetch(url, init);
    status = res.status;
    ok = res.ok || res.status === 201;
    return res;
  } finally {
    _log = [{ method, url, status, ok, note, ts: Date.now() }, ..._log].slice(0, 20);
    _onLog?.([..._log]);
  }
}

interface FolioToken { token: string; expiresAt: number; }
let cachedToken: FolioToken | null = null;
let cachedTenant: string | null = null;

async function getToken(config: FolioConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedTenant === config.tenant && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }
  const base = config.url.replace(/\/$/, "");
  const res = await logged(
    `${base}/authn/login`,
    { method: "POST", headers: { "Content-Type": "application/json", "x-okapi-tenant": config.tenant }, body: JSON.stringify({ username: config.username, password: config.password }) },
    "Authenticate"
  );
  if (!res.ok && res.status !== 201) throw new Error(`FOLIO auth failed (${res.status}). Check credentials.`);

  const headerToken = res.headers.get("x-okapi-token");
  let token: string | null = headerToken;
  if (!token) {
    const body = await res.json().catch(() => ({})) as { okapiToken?: string };
    token = body.okapiToken ?? null;
  }
  if (!token) throw new Error("FOLIO returned no auth token.");
  cachedToken = { token, expiresAt: now + 9 * 60 * 1000 };
  cachedTenant = config.tenant;
  return token;
}

// Escape CQL special chars so scanned/typed input can't break out of the query string
function cql(value: string): string {
  return value.replace(/[\\"]/g, "\\$&");
}

function h(config: FolioConfig, token: string): Record<string, string> {
  return { "x-okapi-tenant": config.tenant, "x-okapi-token": token, "Accept": "application/json" };
}

export interface FolioBookResult {
  title: string;
  authors: string[];
  year: string;
  publisher: string;
  lcCallNumber: string | null;
  instanceId: string;
  matchedBy: "barcode" | "isbn";
  volume: string | null;
  enumeration: string | null;
  chronology: string | null;
}

export async function lookupByBarcode(barcode: string, config: FolioConfig): Promise<FolioBookResult> {
  const base = config.url.replace(/\/$/, "");
  const token = await getToken(config);

  // 1. Try item barcode (library-attached sticker)
  const itemRes = await logged(
    `${base}/inventory/items?query=barcode=="${cql(barcode)}"&limit=1`,
    { headers: h(config, token) },
    "Item barcode lookup"
  );

  if (itemRes.ok) {
    const itemData = await itemRes.json() as {
      items: Array<{
        id: string;
        holdingsRecordId: string;
        title?: string;
        volume?: string;
        enumeration?: string;
        chronology?: string;
        yearCaption?: string[];
      }>;
      totalRecords: number;
    };

    if (itemData.items?.length) {
      const item = itemData.items[0];

      // Resolve volume / enumeration / chronology from the item record
      const volume      = item.volume      ? normalizeVol(item.volume)      : null;
      const enumeration = item.enumeration ? normalizeVol(item.enumeration) : null;
      // Prefer item chronology; fall back to yearCaption[0]
      const chronology  = item.chronology  ? item.chronology
                        : item.yearCaption?.[0] ?? null;

      // Get holdings for call number
      const holdingRes = await logged(
        `${base}/holdings-storage/holdings/${item.holdingsRecordId}`,
        { headers: h(config, token) },
        "Fetch holdings by ID"
      );
      if (!holdingRes.ok) throw new Error(`Could not fetch holdings (${holdingRes.status}).`);

      const holding = await holdingRes.json() as {
        instanceId: string;
        callNumber?: string;
        callNumberPrefix?: string;
        callNumberSuffix?: string;
      };

      const lcCallNumber = [holding.callNumberPrefix, holding.callNumber, holding.callNumberSuffix]
        .filter(Boolean).join(" ").trim() || null;

      const instanceRes = await logged(
        `${base}/inventory/instances/${holding.instanceId}`,
        { headers: h(config, token) },
        "Fetch instance by ID"
      );
      if (!instanceRes.ok) throw new Error(`Could not fetch instance (${instanceRes.status}).`);

      const instance = await instanceRes.json() as {
        title: string;
        contributors?: Array<{ name: string }>;
        publication?: Array<{ publisher: string; dateOfPublication: string }>;
      };

      const pub = instance.publication?.[0];
      return {
        title: instance.title ?? item.title ?? "Unknown Title",
        authors: (instance.contributors ?? []).map((c) => c.name),
        year: pub?.dateOfPublication?.replace(/.*(\d{4}).*/, "$1") ?? "",
        publisher: pub?.publisher ?? "",
        lcCallNumber,
        instanceId: holding.instanceId,
        matchedBy: "barcode",
        volume,
        enumeration,
        chronology,
      };
    }
  }

  // 2. Fall back to ISBN search
  const isbnRes = await logged(
    `${base}/inventory/instances?query=(isbn=="${cql(barcode)}")&limit=1`,
    { headers: h(config, token) },
    "ISBN fallback lookup"
  );
  if (!isbnRes.ok) throw new Error(`FOLIO search failed (${isbnRes.status}).`);

  const isbnData = await isbnRes.json() as {
    instances: Array<{
      id: string;
      title: string;
      contributors?: Array<{ name: string }>;
      publication?: Array<{ publisher: string; dateOfPublication: string }>;
    }>;
    totalRecords: number;
  };

  if (!isbnData.instances?.length) {
    throw new Error("Not found by item barcode or ISBN. The barcode may not be in FOLIO, or the item record may lack a barcode field.");
  }

  const instance = isbnData.instances[0];
  const pub = instance.publication?.[0];

  const holdingsListRes = await logged(
    `${base}/holdings-storage/holdings?query=instanceId=="${cql(instance.id)}"&limit=10`,
    { headers: h(config, token) },
    "Fetch holdings for instance"
  );

  let lcCallNumber: string | null = null;
  if (holdingsListRes.ok) {
    const hData = await holdingsListRes.json() as {
      holdingsRecords: Array<{ callNumber?: string; callNumberPrefix?: string; callNumberSuffix?: string }>;
    };
    const withCN = (hData.holdingsRecords ?? []).find((r) => r.callNumber);
    if (withCN) {
      lcCallNumber = [withCN.callNumberPrefix, withCN.callNumber, withCN.callNumberSuffix]
        .filter(Boolean).join(" ").trim() || null;
    }
  }

  return {
    title: instance.title ?? "Unknown Title",
    authors: (instance.contributors ?? []).map((c) => c.name),
    year: pub?.dateOfPublication?.replace(/.*(\d{4}).*/, "$1") ?? "",
    publisher: pub?.publisher ?? "",
    lcCallNumber,
    instanceId: instance.id,
    matchedBy: "isbn",
    volume: null,
    enumeration: null,
    chronology: null,
  };
}

// Normalize volume strings: ensure standard prefix if bare number
function normalizeVol(v: string): string {
  const trimmed = v.trim();
  // If it's already prefixed (v., no., pt., etc.) leave it alone
  if (/^(v|no|pt|vol|bd|t)\./i.test(trimmed)) return trimmed;
  // Bare number → prefix with "v."
  if (/^\d+$/.test(trimmed)) return `v.${trimmed}`;
  return trimmed;
}
