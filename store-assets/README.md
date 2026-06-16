# Store assets

Source images for the Chrome Web Store listing. See
[docs/store-listing.md](../docs/store-listing.md) for the listing copy and
[docs/PUBLISHING.md](../docs/PUBLISHING.md) for the full submission checklist.

## What the store requires

| Asset | Spec | Status |
|-------|------|--------|
| Store icon | 128x128 PNG | `store-icon-128.png` (artwork 96x96, 16px transparent padding) |
| Screenshots | 1280x800 or 640x400 PNG/JPEG; at least 1, up to 5 | `01-source.png` present |
| Small promo tile (optional) | 440x280 PNG/JPEG | Not yet created |
| Marquee promo (optional) | 1400x560 PNG/JPEG | Not yet created |

## Files here

- `01-source.png` — the two-pane workspace (Source + Destination).
- `icon.svg` — vector master for the toolbar icon set (fills the full tile).
- `store-icon.svg` — vector master for the Web Store listing icon (artwork
  scaled to 96x96 inside the 128x128 canvas with 16px transparent padding).
- `store-icon-128.png` — the rendered 128x128 store icon to upload to the
  Developer Dashboard. Regenerate from `store-icon.svg` if the art changes.

## Recommended additional screenshots

The single required screenshot is present. For a stronger listing, capture:

1. The **Source pane** with a few files loaded and a multi-page PDF expanded.
2. The **Destination pane** mid-assembly with several tiles and the position
   numbers visible.
3. An **export in progress** (the Export PDF button showing a percentage) or the
   quality-profile dropdown open.

Save them as `02-*.png`, `03-*.png`, etc., at 1280x800.
