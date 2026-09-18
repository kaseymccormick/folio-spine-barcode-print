# Spine Label Printer — IT / FOLIO Admin Setup

## What this requires from you
This app is served from Cloudflare (Workers). Browser-side code never talks to your FOLIO OKAPI gateway directly — it goes through a small relay endpoint on the app's own server (`/api/folio/relay`), which forwards the request to your OKAPI gateway server-to-server and returns the response. **No CORS configuration on your OKAPI gateway is required.**

## 1. Confirm your OKAPI URL, tenant ID, and user permissions
Each staff member logs in with their own FOLIO username/password (no shared service account) using the OKAPI URL and tenant ID for your instance. Confirm their FOLIO user role/permissions include:
- `authn.login` — required to authenticate
- Read access to `inventory` (items, instances) and `holdings-storage`

## 2. Verify
1. Have a staff member open the app, go to **Catalog Source → FOLIO Integration**, and enter the OKAPI URL, tenant ID, and their own credentials.
2. Click **Test & Save**.
3. Expected result: green "Connected successfully" message.
4. A failure here means bad credentials/tenant ID, or your OKAPI gateway is unreachable from the public internet (Cloudflare's edge needs a route to it, same as it needs one from FOLIO's own UI) — not a CORS problem.

## Notes on how the app handles credentials
- The FOLIO username/password entered in the app is sent to this app's own Worker first, which immediately forwards it to the OKAPI URL the user typed in, over HTTPS, via the standard `/authn/login` endpoint. The Worker does not store, log, or persist credentials or tokens — each request is relayed and forgotten.
- The relay only forwards to `https://` targets, rejects `localhost` and private/link-local IPv4 addresses, and only allows the specific OKAPI paths this app uses (`/authn/login`, `/inventory/*`, `/holdings-storage/*`). It does forward to whatever public HTTPS host the user enters, since each library has its own OKAPI server — the path allowlist is what limits what it can be used for.
- Credentials are cached in the browser tab's `sessionStorage` only (not `localStorage`) — cleared when the tab is closed.

## What this means for your firewall/network team
- **Requests to your OKAPI gateway now originate from Cloudflare's network** (the app's Worker), not from each user's browser. Your gateway must be reachable from the public internet over HTTPS — the same reachability FOLIO's own hosted UI already requires.
- Cloudflare's Worker sees credentials in transit only (to relay them), never stores or logs them, and has no database.
- If you want to restrict which IPs may call your OKAPI gateway, Cloudflare Workers egress IPs are not fixed/static by default; an IP allowlist on your gateway is not a reliable control here — rely on FOLIO's own authentication instead.
