import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const config = { url: "https://okapi.example.org/", tenant: "tenant1", username: "u", password: "p" };

interface RelayCall {
  targetUrl: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

type Handler = (call: RelayCall) => Response | undefined;

let calls: RelayCall[];
let handlers: Handler[];

const json = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), { status: 200, ...init });

const loginOk = (call: RelayCall) =>
  call.targetUrl.endsWith("/authn/login")
    ? new Response("{}", { status: 201, headers: { "x-okapi-token": "TOKEN" } })
    : undefined;

async function freshApi() {
  vi.resetModules();
  return import("./folioApi");
}

beforeEach(() => {
  calls = [];
  handlers = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    expect(url).toBe("/api/folio/relay");
    const call = JSON.parse(String(init.body)) as RelayCall;
    calls.push(call);
    for (const h of handlers) {
      const res = h(call);
      if (res) return res;
    }
    return new Response("unhandled", { status: 404 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cql", () => {
  it("escapes double quotes and backslashes", async () => {
    const { cql } = await freshApi();
    expect(cql('12"34')).toBe('12\\"34');
    expect(cql("a\\b")).toBe("a\\\\b");
    expect(cql('x" OR barcode=="y')).toBe('x\\" OR barcode==\\"y');
  });

  it("leaves ordinary values alone", async () => {
    const { cql } = await freshApi();
    expect(cql("39372012073860")).toBe("39372012073860");
  });
});

describe("normalizeVol", () => {
  it.each([
    ["3", "v.3"],
    [" 12 ", "v.12"],
    ["v.3", "v.3"],
    ["no.4", "no.4"],
    ["pt.2", "pt.2"],
    ["Jan", "Jan"],
    ["", ""],
  ])("%j -> %j", async (input, expected) => {
    const { normalizeVol } = await freshApi();
    expect(normalizeVol(input)).toBe(expected);
  });
});

describe("lookupByBarcode — item barcode path", () => {
  const item = {
    items: [
      {
        id: "i1",
        holdingsRecordId: "h1",
        volume: "3",
        enumeration: "no.4",
        chronology: "2019:Jan.",
      },
    ],
    totalRecords: 1,
  };

  beforeEach(() => {
    handlers.push(loginOk, (call) => {
      if (call.targetUrl.includes("/inventory/items?")) return json(item);
      if (call.targetUrl.includes("/holdings-storage/holdings/h1"))
        return json({ instanceId: "inst1", callNumberPrefix: "Archives", callNumber: "ND1329", callNumberSuffix: "2022" });
      if (call.targetUrl.endsWith("/inventory/instances/inst1"))
        return json({
          title: "A Title",
          contributors: [{ name: "Ann" }, { name: "Bob" }],
          publication: [{ publisher: "Pub", dateOfPublication: "c2019" }],
        });
      return undefined;
    });
  });

  it("returns the assembled book", async () => {
    const { lookupByBarcode } = await freshApi();
    const r = await lookupByBarcode("39372012073860", config);
    expect(r).toMatchObject({
      title: "A Title",
      authors: ["Ann", "Bob"],
      year: "2019",
      publisher: "Pub",
      lcCallNumber: "Archives ND1329 2022",
      instanceId: "inst1",
      matchedBy: "barcode",
      volume: "v.3",
      enumeration: "no.4",
      chronology: "2019:Jan.",
    });
  });

  it("sends tenant and token headers and strips the trailing slash from the URL", async () => {
    const { lookupByBarcode } = await freshApi();
    await lookupByBarcode("39372012073860", config);
    const itemCall = calls.find((c) => c.targetUrl.includes("/inventory/items?"))!;
    expect(itemCall.targetUrl.startsWith("https://okapi.example.org/inventory/items?")).toBe(true);
    expect(itemCall.method).toBe("GET");
    expect(itemCall.headers).toMatchObject({ "x-okapi-tenant": "tenant1", "x-okapi-token": "TOKEN" });
  });

  it("escapes quotes in the barcode inside the query", async () => {
    const { lookupByBarcode } = await freshApi();
    await lookupByBarcode('12"34', config);
    const itemCall = calls.find((c) => c.targetUrl.includes("/inventory/items?"))!;
    expect(itemCall.targetUrl).toContain('barcode=="12\\"34"');
  });

  it("uses yearCaption when there is no chronology", async () => {
    handlers.unshift((call) =>
      call.targetUrl.includes("/inventory/items?")
        ? json({ items: [{ id: "i1", holdingsRecordId: "h1", yearCaption: ["2001"] }], totalRecords: 1 })
        : undefined
    );
    const { lookupByBarcode } = await freshApi();
    const r = await lookupByBarcode("1", config);
    expect(r.chronology).toBe("2001");
    expect(r.volume).toBeNull();
    expect(r.enumeration).toBeNull();
  });

  it("errors when holdings can't be fetched", async () => {
    handlers.unshift((call) =>
      call.targetUrl.includes("/holdings-storage/holdings/h1") ? new Response("", { status: 500 }) : undefined
    );
    const { lookupByBarcode } = await freshApi();
    await expect(lookupByBarcode("1", config)).rejects.toThrow("Could not fetch holdings (500).");
  });

  it("errors when the instance can't be fetched", async () => {
    handlers.unshift((call) =>
      call.targetUrl.endsWith("/inventory/instances/inst1") ? new Response("", { status: 404 }) : undefined
    );
    const { lookupByBarcode } = await freshApi();
    await expect(lookupByBarcode("1", config)).rejects.toThrow("Could not fetch instance (404).");
  });
});

describe("lookupByBarcode — ISBN fallback", () => {
  beforeEach(() => {
    handlers.push(loginOk, (call) => {
      if (call.targetUrl.includes("/inventory/items?")) return json({ items: [], totalRecords: 0 });
      if (call.targetUrl.includes("/inventory/instances?"))
        return json({
          instances: [
            {
              id: "inst9",
              title: "By ISBN",
              contributors: [{ name: "Cy" }],
              publication: [{ publisher: "P", dateOfPublication: "2010" }],
            },
          ],
          totalRecords: 1,
        });
      if (call.targetUrl.includes("/holdings-storage/holdings?"))
        return json({
          holdingsRecords: [{}, { callNumberPrefix: "Ref", callNumber: "QA76.73 .C15", callNumberSuffix: "2010" }],
        });
      return undefined;
    });
  });

  it("falls back to an ISBN search when no item matches", async () => {
    const { lookupByBarcode } = await freshApi();
    const r = await lookupByBarcode("9780140328721", config);
    expect(r).toMatchObject({
      title: "By ISBN",
      matchedBy: "isbn",
      instanceId: "inst9",
      lcCallNumber: "Ref QA76.73 .C15 2010",
      volume: null,
      enumeration: null,
      chronology: null,
    });
  });

  it("uses the first holdings record that has a call number", async () => {
    const { lookupByBarcode } = await freshApi();
    expect((await lookupByBarcode("1", config)).lcCallNumber).toBe("Ref QA76.73 .C15 2010");
  });

  it("returns a null call number when holdings can't be fetched", async () => {
    handlers.unshift((call) =>
      call.targetUrl.includes("/holdings-storage/holdings?") ? new Response("", { status: 500 }) : undefined
    );
    const { lookupByBarcode } = await freshApi();
    expect((await lookupByBarcode("1", config)).lcCallNumber).toBeNull();
  });

  it("falls back to ISBN search if the item search itself fails", async () => {
    handlers.unshift((call) =>
      call.targetUrl.includes("/inventory/items?") ? new Response("", { status: 500 }) : undefined
    );
    const { lookupByBarcode } = await freshApi();
    expect((await lookupByBarcode("1", config)).matchedBy).toBe("isbn");
  });

  it("errors clearly when nothing is found", async () => {
    handlers.unshift((call) =>
      call.targetUrl.includes("/inventory/instances?") ? json({ instances: [], totalRecords: 0 }) : undefined
    );
    const { lookupByBarcode } = await freshApi();
    await expect(lookupByBarcode("nope", config)).rejects.toThrow(/Not found by item barcode or ISBN/);
  });

  it("errors when the ISBN search fails", async () => {
    handlers.unshift((call) =>
      call.targetUrl.includes("/inventory/instances?") ? new Response("", { status: 503 }) : undefined
    );
    const { lookupByBarcode } = await freshApi();
    await expect(lookupByBarcode("1", config)).rejects.toThrow("FOLIO search failed (503).");
  });
});

describe("authentication", () => {
  const found = (call: RelayCall) =>
    call.targetUrl.includes("/inventory/items?") ? json({ items: [], totalRecords: 0 }) : undefined;
  const isbnEmpty = (call: RelayCall) =>
    call.targetUrl.includes("/inventory/instances?") ? json({ instances: [{ id: "x", title: "T" }] }) : undefined;
  const holdingsEmpty = (call: RelayCall) =>
    call.targetUrl.includes("/holdings-storage/holdings?") ? json({ holdingsRecords: [] }) : undefined;

  it("logs in once and reuses the token for later lookups", async () => {
    handlers.push(loginOk, found, isbnEmpty, holdingsEmpty);
    const { lookupByBarcode } = await freshApi();
    await lookupByBarcode("1", config);
    await lookupByBarcode("2", config);
    expect(calls.filter((c) => c.targetUrl.endsWith("/authn/login"))).toHaveLength(1);
  });

  it("logs in again when the tenant changes", async () => {
    handlers.push(loginOk, found, isbnEmpty, holdingsEmpty);
    const { lookupByBarcode } = await freshApi();
    await lookupByBarcode("1", config);
    await lookupByBarcode("1", { ...config, tenant: "other" });
    expect(calls.filter((c) => c.targetUrl.endsWith("/authn/login"))).toHaveLength(2);
  });

  it("sends credentials only in the login body", async () => {
    handlers.push(loginOk, found, isbnEmpty, holdingsEmpty);
    const { lookupByBarcode } = await freshApi();
    await lookupByBarcode("1", config);
    const login = calls.find((c) => c.targetUrl.endsWith("/authn/login"))!;
    expect(JSON.parse(login.body!)).toEqual({ username: "u", password: "p" });
    expect(login.method).toBe("POST");
    for (const c of calls.filter((x) => !x.targetUrl.endsWith("/authn/login"))) {
      expect(JSON.stringify(c)).not.toContain('"p"');
    }
  });

  it("fails with a clear message on bad credentials", async () => {
    handlers.push((call) => (call.targetUrl.endsWith("/authn/login") ? new Response("no", { status: 401 }) : undefined));
    const { lookupByBarcode } = await freshApi();
    await expect(lookupByBarcode("1", config)).rejects.toThrow("FOLIO auth failed (401). Check credentials.");
  });

  it("accepts a token returned in the response body", async () => {
    handlers.push(
      (call) => (call.targetUrl.endsWith("/authn/login") ? json({ okapiToken: "BODYTOKEN" }, { status: 201 }) : undefined),
      found,
      isbnEmpty,
      holdingsEmpty
    );
    const { lookupByBarcode } = await freshApi();
    await lookupByBarcode("1", config);
    const later = calls.find((c) => c.targetUrl.includes("/inventory/items?"))!;
    expect(later.headers["x-okapi-token"]).toBe("BODYTOKEN");
  });

  it("errors when no token is returned at all", async () => {
    handlers.push((call) => (call.targetUrl.endsWith("/authn/login") ? json({}, { status: 201 }) : undefined));
    const { lookupByBarcode } = await freshApi();
    await expect(lookupByBarcode("1", config)).rejects.toThrow("FOLIO returned no auth token.");
  });
});

describe("request log", () => {
  it("notifies the listener with each call and never includes the password", async () => {
    handlers.push(
      loginOk,
      (call) => (call.targetUrl.includes("/inventory/items?") ? json({ items: [], totalRecords: 0 }) : undefined),
      (call) => (call.targetUrl.includes("/inventory/instances?") ? json({ instances: [{ id: "x", title: "T" }] }) : undefined),
      (call) => (call.targetUrl.includes("/holdings-storage/holdings?") ? json({ holdingsRecords: [] }) : undefined)
    );
    const { lookupByBarcode, setRequestLogListener } = await freshApi();
    let latest: Array<{ note: string; ok: boolean; status: number | null }> = [];
    setRequestLogListener((entries) => {
      latest = entries;
    });
    await lookupByBarcode("1", config);
    expect(latest.map((e) => e.note)).toEqual([
      "Fetch holdings for instance",
      "ISBN fallback lookup",
      "Item barcode lookup",
      "Authenticate",
    ]);
    expect(latest.every((e) => e.ok)).toBe(true);
    expect(JSON.stringify(latest)).not.toContain("password");
  });
});
