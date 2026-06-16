# Store assets

Source images for the Chrome Web Store listing. See
[docs/store-listing.md](../docs/store-listing.md) for the listing copy and
[docs/PUBLISHING.md](../docs/PUBLISHING.md) for the full submission checklist.

## What the store requires

| Asset | Spec | Status |
|-------|------|--------|
| Store icon | 128x128 PNG | Reuses `public/icons/128.png` |
| Screenshots | 1280x800 or 640x400 PNG/JPEG; at least 1, up to 5 | `01-source.png` present |
| Small promo tile (optional) | 440x280 PNG/JPEG | Not yet created |
| Marquee promo (optional) | 1400x560 PNG/JPEG | Not yet created |

## Files here

- `01-source.png` — the two-pane workspace (Source + Destination).
- `icon.svg` — vector master for the extension icon set.

## Recommended additional screenshots

The single required screenshot is present. For a stronger listing, capture:

1. The **Source pane** with a few files loaded and a multi-page PDF expanded.
2. The **Destination pane** mid-assembly with several tiles and the position
   numbers visible.
3. An **export in progress** (the Export PDF button showing a percentage) or the
   quality-profile dropdown open.

Save them as `02-*.png`, `03-*.png`, etc., at 1280x800.
