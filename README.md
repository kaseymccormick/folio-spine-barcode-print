
  # Albertsons Library Spine & Barcode Label Printing Software

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
  view deployed folio-spine-barcode-print.kaseymccormick.workers.dev

  ## For your FOLIO/IT admin

  This app talks to your library's FOLIO OKAPI gateway through a small relay endpoint on the app's own server, not directly from the browser — so **no CORS configuration on OKAPI is required.** Your OKAPI gateway does need to be reachable over HTTPS from the public internet (the same reachability FOLIO's own hosted UI already requires). See `documentation-it.md` for details, including how credentials are handled.


See LICENSE for copyright and usage terms

npm run build
npx wrangler deploy