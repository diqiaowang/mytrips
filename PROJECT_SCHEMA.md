# Studio Project Schema

Schema version: `1`

## Project

- `id`
- `schemaVersion`
- `title`
- `city`
- `country`
- `travelDates`
- `journeyReference`
- `websiteEntryReference`
- `aspectRatio`
- `theme`
- `pages`
- `mediaAssets`
- `exportSettings`
- `createdAt`
- `updatedAt`

## Page

- `id`
- `order`
- `layoutType`: `split-cover`, `standard`, `image-first`, `full-image`, `places`
- `content`: `number`, `title`, `subtitle`, `kicker`, `notes`
- `photoAssetId`
- `crop`: `zoom`, `x`, `y`, `rotate`, `fit`
- `adjustments`: `exposure`, `temperature`, `tint`, `contrast`, `highlights`, `shadows`, `saturation`, `grain`
- `background`
- `typographyOverrides`
- `altText`

## MediaAsset

- `id`
- `originalName`
- `mimeType`
- `width`
- `height`
- `indexedDbReference`
- `dataUrl` (MVP fallback)
- `createdAt`

Runtime validation is implemented in `validateStudioProject()` before importing or loading project files.
