export interface Env {
  ASSETS: { fetch: typeof fetch };
}

const ALLOWED_PATH_PREFIXES = [
  "/authn/login",
  "/inventory/items",
  "/inventory/instances",
  "/holdings-storage/holdings",
];

const ALLOWED_METHODS = new Set(["GET", "POST"]);
const ALLOWED_HEADERS = new Set(["content-type", "accept", "x-okapi-tenant", "x-okapi-token"]);

function isBlockedHost(rawHostname: string): boolean {
  const hostname = rawHostname.toLowerCase().replace(/\.$/, "");
  // IPv6 literals keep their brackets in URL.hostname; IPv4 literals (including
  // hex/decimal forms, which URL normalizes to dotted decimal) are never needed
  // since OKAPI servers use DNS names.
  if (hostname.startsWith("[") || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (!hostname.includes(".")) return true;
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  );
}

function validateTarget(rawUrl: unknown): URL {
  let target: URL;
  try {
    target = new URL(String(rawUrl));
  } catch {
    throw new Error("Invalid target URL.");
  }
  if (target.protocol !== "https:") throw new Error("Target must be https.");
  if (target.username || target.password) throw new Error("Target must not contain credentials.");
  if (isBlockedHost(target.hostname)) throw new Error("Target host not allowed.");
  if (!ALLOWED_PATH_PREFIXES.some((p) => target.pathname.startsWith(p))) {
    throw new Error("Target path not allowed.");
  }
  return target;
}

function pickHeaders(raw: unknown): Headers {
  const headers = new Headers();
  if (raw && typeof raw === "object") {
    for (const [name, value] of Object.entries(raw)) {
      if (ALLOWED_HEADERS.has(name.toLowerCase()) && typeof value === "string") {
        headers.set(name, value);
      }
    }
  }
  return headers;
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), { status });
}

interface RelayRequest {
  targetUrl: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

async function handleRelay(request: Request): Promise<Response> {
  let payload: RelayRequest;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }
  if (!payload || typeof payload !== "object") return errorResponse("Invalid JSON body.", 400);

  if (!ALLOWED_METHODS.has(payload.method)) return errorResponse("Method not allowed.", 400);
  if (payload.body !== undefined && typeof payload.body !== "string") {
    return errorResponse("Invalid body.", 400);
  }

  let target: URL;
  try {
    target = validateTarget(payload.targetUrl);
  } catch (err) {
    return errorResponse((err as Error).message, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: payload.method,
      headers: pickHeaders(payload.headers),
      body: payload.method === "POST" ? payload.body : undefined,
      redirect: "manual",
    });
  } catch (err) {
    return errorResponse(`Could not reach OKAPI gateway: ${(err as Error).message}`, 502);
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return errorResponse("OKAPI gateway returned a redirect, which is not followed.", 502);
  }

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "x-okapi-token": upstream.headers.get("x-okapi-token") ?? "",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/folio/relay" && request.method === "POST") {
      return handleRelay(request);
    }
    return env.ASSETS.fetch(request);
  },
};
