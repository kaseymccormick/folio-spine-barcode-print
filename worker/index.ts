export interface Env {
  ASSETS: { fetch: typeof fetch };
}

const ALLOWED_PATH_PREFIXES = [
  "/authn/login",
  "/inventory/items",
  "/inventory/instances",
  "/holdings-storage/holdings",
];

const PRIVATE_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function isPrivateIp(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) return false;
  const [a, b] = parts.map(Number);
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function validateTarget(rawUrl: string): URL {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("Invalid target URL.");
  }
  if (target.protocol !== "https:") throw new Error("Target must be https.");
  if (PRIVATE_HOSTNAMES.has(target.hostname) || isPrivateIp(target.hostname)) {
    throw new Error("Target host not allowed.");
  }
  if (!ALLOWED_PATH_PREFIXES.some((p) => target.pathname.startsWith(p))) {
    throw new Error("Target path not allowed.");
  }
  return target;
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
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), { status: 400 });
  }

  let target: URL;
  try {
    target = validateTarget(payload.targetUrl);
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: payload.method,
      headers: payload.headers,
      body: payload.method === "POST" ? payload.body : undefined,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Could not reach OKAPI gateway: ${(err as Error).message}` }),
      { status: 502 }
    );
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
