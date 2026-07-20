# Spine Label Printer — IT / FOLIO Admin Setup

## What this requires from you
This app runs entirely in each user's browser. It does not have a backend server and stores no data on any third party's servers. To work, it needs your FOLIO OKAPI gateway to accept direct browser (cross-origin) requests from the app's URL.

## 1. Confirm the app's origin
Ask whoever runs the app for its exact URL. Example: `https://folio-spine-barcode-print.kaseymccormick.workers.dev`

The **origin** is the scheme + host, with no trailing path: `https://folio-spine-barcode-print.kaseymccormick.workers.dev`

## 2. Allow CORS on your OKAPI gateway
1. Locate your OKAPI reverse proxy configuration (commonly nginx, or `mod-configuration` in front of OKAPI).
2. Add the app's exact origin to the CORS allowlist for these response headers:
   - `Access-Control-Allow-Origin: https://folio-spine-barcode-print.kaseymccormick.workers.dev`
   - `Access-Control-Allow-Methods: GET, POST`
   - `Access-Control-Allow-Headers: Content-Type, x-okapi-tenant, x-okapi-token`
3. **Do not use a wildcard (`*`)** — allowlist the exact origin only. A wildcard would let any website make authenticated requests to your OKAPI gateway using a logged-in user's browser session.
4. Apply this to at least the following OKAPI endpoints, which the app calls directly from the browser:
   - `/authn/login`
   - `/inventory/items`
   - `/inventory/instances`
   - `/holdings-storage/holdings`
   - `/holdings-storage/holdings/{id}`
   - `/inventory/instances/{id}`

## 3. Confirm user permissions
Each staff member logs in with their own FOLIO username/password (no shared service account). Confirm their FOLIO user role/permissions include:
- `authn.login` — required to authenticate
- Read access to `inventory` (items, instances) and `holdings-storage`

## 4. Verify
1. Have a staff member open the app, go to **Catalog Source → FOLIO Integration**, and enter the OKAPI URL, tenant ID, and their own credentials.
2. Click **Test & Save**.
3. Expected result: green "Connected successfully" message.
4. If they get a network/CORS error instead, re-check step 2 — the browser will block the request silently from the app's side; there's no client-side workaround.

## Notes on how the app handles credentials
- The FOLIO username/password entered in the app is sent only to the OKAPI URL the user typed in, over HTTPS, via the standard `/authn/login` endpoint — same as any other OKAPI client.
- Credentials are cached in the browser tab's `sessionStorage` only (not `localStorage`) — cleared when the tab is closed. Nothing is persisted server-side or shared between users.
- If the app's hosting URL ever changes (e.g. moved to a new domain), your CORS allowlist entry must be updated to match, or the app will stop connecting.

## Scaling & what this means for your firewall/network team
- **The app itself is a static site** (HTML/CSS/JS) served from Cloudflare's edge — no backend server, no database, no per-user compute. Cloudflare's role is limited to serving those static files; it never sees, proxies, or stores FOLIO data or credentials.
- **Traffic to your FOLIO server comes directly from each user's browser**, not from Cloudflare. Scaling the number of app users (e.g. 5 → 2,000) does not change what reaches your network beyond ordinary browser-to-OKAPI API calls — the same kind of traffic any FOLIO client (including FOLIO's own UI) already generates.
- **Nothing needs to be opened on your firewall for Cloudflare** — you're not hosting anything, only allowing browser requests *from* the app's origin *into* your existing OKAPI gateway (the CORS config in step 2 above), which is an application-layer allowlist, not a network/firewall rule.
- **No new inbound connections, ports, or IP allowlisting are required.** OKAPI already accepts HTTPS requests from FOLIO's own UI; this app's requests look identical at the network level — same protocol, same auth flow, just a different origin making the request.
- If your team wants to scope this further, the full request surface (which OKAPI endpoints, which headers) is listed in step 2 and step 4 above — that's the complete list of what this app talks to.
