import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const env = { ASSETS: { fetch: async () => new Response("asset") } };

let upstream: () => Response | Promise<Response>;
let lastInit: RequestInit | undefined;
let lastUrl: string | undefined;

beforeEach(() => {
  lastInit = undefined;
  lastUrl = undefined;
  upstream = () => new Response(JSON.stringify({ ok: 1 }), { status: 200 });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    lastUrl = url;
    lastInit = init;
    return upstream();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const relay = async (body: unknown) => {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const res = await worker.fetch(new Request("https://app.test/api/folio/relay", { method: "POST", body: raw }), env);
  return { status: res.status, text: await res.text() };
};

const good = {
  targetUrl: "https://okapi.example.org/authn/login",
  method: "POST",
  headers: { "Content-Type": "application/json", "x-okapi-tenant": "t" },
  body: "{}",
};

describe("routing", () => {
  it("serves static assets for non-relay paths", async () => {
    const res = await worker.fetch(new Request("https://app.test/"), env);
    expect(await res.text()).toBe("asset");
  });

  it("does not treat GET on the relay path as a relay call", async () => {
    const res = await worker.fetch(new Request("https://app.test/api/folio/relay"), env);
    expect(await res.text()).toBe("asset");
  });
});

describe("valid requests", () => {
  it("forwards a valid request and returns upstream body and status", async () => {
    upstream = () => new Response(JSON.stringify({ hello: "world" }), { status: 201 });
    const res = await relay(good);
    expect(res.status).toBe(201);
    expect(JSON.parse(res.text)).toEqual({ hello: "world" });
    expect(lastUrl).toBe("https://okapi.example.org/authn/login");
  });

  it("passes the x-okapi-token response header back", async () => {
    upstream = () => new Response("{}", { status: 201, headers: { "x-okapi-token": "abc" } });
    const res = await worker.fetch(
      new Request("https://app.test/api/folio/relay", { method: "POST", body: JSON.stringify(good) }),
      env
    );
    expect(res.headers.get("x-okapi-token")).toBe("abc");
  });

  it("allows the inventory and holdings paths including query strings and ids", async () => {
    for (const path of [
      "/inventory/items?query=barcode==%22x%22&limit=1",
      "/inventory/instances/123",
      "/inventory/instances?query=(isbn==%22x%22)",
      "/holdings-storage/holdings/abc",
      "/holdings-storage/holdings?query=instanceId==%22x%22",
    ]) {
      const res = await relay({ ...good, method: "GET", targetUrl: `https://okapi.example.org${path}` });
      expect(res.status, path).toBe(200);
    }
  });

  it("sends the body only on POST", async () => {
    await relay({ ...good, method: "GET" });
    expect(lastInit?.body).toBeUndefined();
    await relay(good);
    expect(lastInit?.body).toBe("{}");
  });
});

describe("headers", () => {
  it("only forwards the allowlisted headers", async () => {
    await relay({
      ...good,
      headers: {
        "Content-Type": "application/json",
        "x-okapi-tenant": "t",
        "x-okapi-token": "tok",
        Accept: "application/json",
        Host: "evil.example",
        Cookie: "a=b",
        "X-Forwarded-For": "1.2.3.4",
        Authorization: "Bearer nope",
      },
    });
    const names = [...(lastInit?.headers as Headers).keys()].sort();
    expect(names).toEqual(["accept", "content-type", "x-okapi-tenant", "x-okapi-token"]);
  });

  it("ignores non-string header values and a non-object headers field", async () => {
    await relay({ ...good, headers: { "x-okapi-tenant": 5 } });
    expect([...(lastInit?.headers as Headers).keys()]).toEqual([]);
    await relay({ ...good, headers: "nope" });
    expect([...(lastInit?.headers as Headers).keys()]).toEqual([]);
  });
});

describe("redirects", () => {
  it("asks fetch not to follow redirects", async () => {
    await relay(good);
    expect(lastInit?.redirect).toBe("manual");
  });

  it("turns an upstream redirect into a 502", async () => {
    upstream = () => new Response(null, { status: 302, headers: { Location: "https://evil.example/" } });
    const res = await relay(good);
    expect(res.status).toBe(502);
    expect(res.text).toMatch(/redirect/);
  });
});

describe("methods", () => {
  it.each(["DELETE", "PUT", "PATCH", "get", "post", "", null, 5])("rejects method %s", async (method) => {
    const res = await relay({ ...good, method });
    expect(res.status).toBe(400);
  });

  it("rejects a missing method", async () => {
    const { method: _m, ...noMethod } = good;
    expect((await relay(noMethod)).status).toBe(400);
  });
});

describe("target validation", () => {
  it.each([
    ["http scheme", "http://okapi.example.org/authn/login"],
    ["ipv4 loopback", "https://127.0.0.1/authn/login"],
    ["ipv4 private 10.x", "https://10.0.0.5/authn/login"],
    ["ipv4 private 192.168", "https://192.168.1.1/authn/login"],
    ["ipv4 link-local", "https://169.254.169.254/authn/login"],
    ["public ipv4", "https://8.8.8.8/authn/login"],
    ["ipv6 loopback", "https://[::1]/authn/login"],
    ["ipv4-mapped ipv6", "https://[::ffff:7f00:1]/authn/login"],
    ["decimal ip", "https://2130706433/authn/login"],
    ["hex ip", "https://0x7f.1/authn/login"],
    ["localhost", "https://localhost/authn/login"],
    ["localhost with dot", "https://localhost./authn/login"],
    ["subdomain of localhost", "https://foo.localhost/authn/login"],
    ["single-label host", "https://okapi/authn/login"],
    ["gcp metadata", "https://metadata.google.internal/authn/login"],
    [".local name", "https://printer.local/authn/login"],
    ["embedded credentials", "https://user:pw@okapi.example.org/authn/login"],
    ["disallowed path", "https://okapi.example.org/admin"],
    ["path traversal attempt", "https://okapi.example.org/inventory/../admin"],
    ["not a url", "not a url"],
    ["empty", ""],
  ])("rejects %s", async (_name, targetUrl) => {
    const res = await relay({ ...good, targetUrl });
    expect(res.status).toBe(400);
    expect(lastUrl).toBeUndefined();
  });

  it("rejects a missing targetUrl", async () => {
    const { targetUrl: _t, ...rest } = good;
    expect((await relay(rest)).status).toBe(400);
  });
});

describe("payload validation", () => {
  it.each(["null", "123", "[]", "not json", '"string"'])("rejects body %s", async (body) => {
    expect((await relay(body)).status).toBe(400);
  });

  it("rejects a non-string request body", async () => {
    expect((await relay({ ...good, body: { a: 1 } })).status).toBe(400);
  });
});

describe("upstream failures", () => {
  it("returns 502 when the upstream is unreachable", async () => {
    upstream = () => {
      throw new Error("boom");
    };
    const res = await relay(good);
    expect(res.status).toBe(502);
    expect(res.text).toMatch(/Could not reach OKAPI gateway/);
  });

  it("passes upstream error statuses through", async () => {
    upstream = () => new Response("nope", { status: 401 });
    expect((await relay(good)).status).toBe(401);
    upstream = () => new Response("bad", { status: 500 });
    expect((await relay(good)).status).toBe(500);
  });
});
