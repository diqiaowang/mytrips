# Architecture

## Inspection summary

- Framework: static HTML, CSS, and vanilla JavaScript.
- Build system: `npm run build` runs syntax checks with `node --check`.
- Routing: client-side section switching from the cover page; Studio uses `#studio` for static hosting compatibility.
- Existing pages/sections: cover page, Memory Atlas archive, Leaflet map, memory form, gallery, modal dialog.
- Persistence: Memory Atlas uses localStorage; geocoding cache also uses localStorage.
- Assets: current site uses external font/CDN links and user-provided image data stored locally in the browser.
- Deployment: static files can be served by any static host or `python3 -m http.server`.

## Visual identity to preserve

The site is warm, editorial, personal, and quiet. Studio reuses the same fonts, restrained controls, warm backgrounds, navy/charcoal text, and soft borders.

## Studio fit

Studio is the private working desk behind the cover page. It lives beside The Memory Atlas as another cover entry and does not replace the map/archive flow.

## Current risks / future work

- The MVP stores image Data URLs in localStorage for simplicity; large projects should move blobs to IndexedDB.
- Export rendering is Canvas-based and deterministic, but font rendering depends on browser font availability.
- Direct text editing is synchronized through inspector fields and selectable canvas text; future work could add a more robust inline editor.
