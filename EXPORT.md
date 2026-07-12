# Studio Export Pipeline

Editorial Studio uses deterministic browser Canvas rendering for exports instead of screenshotting editor DOM.

## Supported exports

- Current page as PNG.
- All pages as a ZIP of numbered PNG files.
- One continuous long editorial PNG.
- Portable project JSON.

## Dimensions

- `3:4`: 1080 × 1440 px.
- `2:3`: 1080 × 1620 px.

## File naming

Files use the project title, page order, and page title:

`amsterdam-72-hours-01-amsterdam.png`

## Notes

The Canvas renderer mirrors the controlled template geometry and crop state. It intentionally excludes editor controls, guides, and selection UI. The current static-site MVP includes a small no-dependency ZIP writer to avoid adding a large dependency to the public bundle.
