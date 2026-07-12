# Editorial Studio

Editorial Studio is a private workspace inside **A Traveler’s Workstation** for turning owner-uploaded travel photographs and notes into consistent editorial carousel pages.

## Route integration

The existing site is a static HTML/CSS/JavaScript app. Studio is integrated into `index.html` as the `#studio` route and is opened from the cover page through the **Editorial Studio** entry. No new framework, backend, account system, analytics, API key, or external storage was added.

## Current MVP

- Default 10-page Amsterdam · 72 Hours editorial project.
- Output ratios: Instagram 3:4 (1080 × 1440) and 2:3 (1080 × 1620).
- Layout variants: Split Cover, Standard Page, Image First, Full Image, Places Page.
- Equal standard photo frame dimensions across standard pages.
- Manual photo upload for JPG, PNG, WebP, and browser-supported HEIC.
- Non-destructive crop values: zoom, x/y position, rotate, fit/fill/reset.
- Neutral photo adjustments for Natural Match: exposure, temperature, contrast, saturation, grain.
- Local project save/reload with `localStorage`.
- Project JSON import/export.
- Current-page PNG export, all-pages ZIP export, and long editorial image export.

## Privacy

Photographs remain in the browser. The MVP stores image Data URLs in localStorage metadata for a static-site-compatible first version. A future milestone should move full image blobs to IndexedDB while keeping lightweight project metadata in localStorage.

## Future Journey integration

The project model includes `journeyReference` and `websiteEntryReference`. Publishing to a Journey is intentionally disabled until a publishing/data architecture exists.
