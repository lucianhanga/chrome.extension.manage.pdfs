# Store assets

Source images for the Chrome Web Store listing. See
[docs/store-listing.md](../docs/store-listing.md) for the listing copy and
[docs/PUBLISHING.md](../docs/PUBLISHING.md) for the full submission checklist.

## What the store requires

The store accepts **JPEG or 24-bit PNG with no alpha** for screenshots and promo
tiles. Store **icons** may keep transparency (the padding).

| Asset | Spec | File to upload |
|-------|------|----------------|
| Store icon | 128x128 PNG (transparency OK) | `store-icon-128.png` (artwork 96x96, 16px padding) |
| Screenshot | 1280x800, JPEG/24-bit PNG no alpha; at least 1, up to 5 | `01-source.jpg` |
| Small promo tile (optional) | 440x280, JPEG/24-bit PNG no alpha | `promo-small-440x280.jpg` |
| Marquee promo (optional) | 1400x560, JPEG/24-bit PNG no alpha | `promo-marquee-1400x560.jpg` |

## Files here

- `01-source.jpg` — **upload this** screenshot: the two-pane workspace with files
  loaded in Source and three items assembled in Destination. 1280x800, no alpha.
- `01-source.png` — the original screenshot master (has an alpha channel, so it
  is NOT store-eligible; `01-source.jpg` is the flattened upload copy).
- `promo-small-440x280.jpg` / `promo-marquee-1400x560.jpg` — branded promo tiles
  (icon + wordmark + tagline on the brand gradient). No alpha.
- `icon.svg` — vector master for the toolbar icon set (fills the full tile).
- `store-icon.svg` — vector master for the Web Store listing icon (artwork
  scaled to 96x96 inside the 128x128 canvas with 16px transparent padding).
- `store-icon-128.png` — the rendered 128x128 store icon to upload to the
  Developer Dashboard. Regenerate from `store-icon.svg` if the art changes.

## Recommended additional screenshots

One strong screenshot is present (`01-source.jpg`). For an even fuller listing
you can add up to four more (1280x800, no alpha), for example:

1. The **Destination pane** mid-assembly with several tiles and position numbers.
2. An **export in progress** (the Export PDF button showing a percentage) or the
   quality-profile dropdown open.
3. A **multi-page PDF** expanded with a multi-select highlighted before dragging.

Save them as `02-*.jpg`, `03-*.jpg`, etc.
