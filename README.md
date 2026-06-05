# PDF Manager — Chrome Extension

[![CI](https://github.com/lucianhanga/chrome.extension.manage.pdfs/actions/workflows/ci.yml/badge.svg)](https://github.com/lucianhanga/chrome.extension.manage.pdfs/actions/workflows/ci.yml)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](public/manifest.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](package.json)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](vite.config.ts)
[![Tests](https://img.shields.io/badge/tests-Vitest%20%2B%20Playwright-6E9F18?logo=vitest&logoColor=white)](tests/)
[![Privacy](https://img.shields.io/badge/privacy-100%25%20client--side-2ea44f)](#privacy)

A Manifest V3 Chrome extension that is, in practice, a full client-side web app for working with PDFs.
Load PDFs, images, and text; preview pages; assemble a brand-new PDF by dragging pages and images into any
order; and export with three quality profiles. **Files never leave your browser** — there is no network
access and no host permissions.

---

## Features

- **Source pane** — load PDFs, images (PNG/JPEG/WebP/GIF), and plain text via file picker or drag-and-drop.
  Page thumbnails, a larger preview, and metadata (page count, dimensions, file size, title/author).
- **Destination pane** — drag single or multiple pages/images from the source into an ordered, sortable
  destination list, then preview the assembled document live.
- **Export profiles** — three presets covering the quality/size trade-off:
  - **Print** — highest quality; native vector page copy, light image downsampling.
  - **Web** — balanced quality and size.
  - **Compressed** — smallest; aggressive image downsampling.
- **Off-main-thread work** — PDF rasterization (pdf.js worker) and image re-encoding (OffscreenCanvas
  worker) run off the UI thread.

## Privacy

The extension requests **no host permissions** and makes **no network requests**. All parsing, rendering,
assembly, and export happen locally in the extension page using `pdf.js` (read/render) and `pdf-lib`
(write/assemble). Closing the tab clears everything from memory. The only permission requested is
`contextMenus` (a right-click shortcut to open the app).

## Tech stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| UI | React 18 + Tailwind CSS |
| Build | Vite 6 (hand-rolled MV3 Rollup config) |
| State | Zustand |
| PDF read/render | pdf.js (`pdfjs-dist`) |
| PDF assemble/export | pdf-lib |
| Drag-and-drop | @dnd-kit |
| Tests | Vitest (unit) + Playwright (E2E, unpacked extension) |

See [`docs/architecture.md`](docs/architecture.md) for the full design, the permission/CSP rationale, and
the export-profile strategy.

## Getting started

Prerequisites: Node 22+ and [pnpm](https://pnpm.io/) 9+.

```bash
pnpm install
pnpm build        # produces a loadable dist/
```

### Load the unpacked extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `dist/` folder.
4. Click the extension's toolbar icon (or use the right-click "Open PDF Manager" menu) to open the
   full-page workspace.

After rebuilding, click the reload icon on the extension card in `chrome://extensions` to pick up changes.

## Development

```bash
pnpm dev          # vite build --watch — rebuilds dist/ on change
pnpm typecheck    # tsc --noEmit (app + node configs)
pnpm lint         # eslint
pnpm test         # vitest unit tests
pnpm test:e2e     # playwright (loads the unpacked extension)
```

## Testing

- **Unit (Vitest)** — validation guards, store actions, page selection, export-profile math, assembly
  ordering, and PDF ingestion. Notably `tests/unit/ingest-pdf.test.ts` is a regression test for the
  detached-`ArrayBuffer` ingestion bug (pdf.js transfers/detaches the buffer it parses, so the raw export
  bytes must be copied before `openPdf`).
- **E2E (Playwright)** — loads the built `dist/` as an unpacked extension and drives the real UI. Extension
  loading requires Chromium's new headless mode (`--headless=new`).

## Project structure

```
src/
  background/service-worker.ts   action.onClicked + contextMenus -> open app tab
  app/                           React root; sets pdf.js workerSrc (order matters)
  features/source/               ingestion, thumbnails, preview
  features/destination/          sortable assembly list + preview
  pdf/                           render (pdf.js), assemble (pdf-lib), compress, profiles, ingest
  workers/compress.worker.ts     OffscreenCanvas downsample/encode
  state/                         Zustand store + types
  shared/                        object-URL tracking, file validation
tests/unit/                      Vitest
tests/e2e/                       Playwright
docs/architecture.md             design and rationale
```

## Known limitations

- `pdf-lib` cannot recompress images on its own; the export pipeline pre-encodes images via Canvas before
  embedding. See `docs/architecture.md` §3.2.
- Requires Chrome 116+ (Manifest V3, module service worker).

## License

Private project. All rights reserved.
