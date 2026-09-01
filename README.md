
  # Albertsons Library Spine & Barcode Label Printing Software

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
  view deployed folio-spine-barcode-print.kaseymccormick.workers.dev

  ## For your FOLIO/IT admin

  This app runs entirely in your browser and talks directly to your library's FOLIO OKAPI gateway — no data passes through or is stored on any third-party server. To connect, your OKAPI gateway needs to allow cross-origin requests (CORS) from this app's origin.

  **Ask your FOLIO/IT admin to allowlist this exact origin** (not a wildcard `*`) on the OKAPI reverse proxy:

  ```
  https://folio-spine-barcode-print.kaseymccormick.workers.dev
  ```

  Without this, login will fail with a browser network error (not a bug in the app — it means CORS isn't configured yet for this origin).


See LICENSE for copyright and usage terms
