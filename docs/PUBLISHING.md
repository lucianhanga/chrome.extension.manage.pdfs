# Publishing PDF Manager to the Chrome Web Store

This is the repeatable checklist for the initial submission and for every
subsequent update.

## One-time setup

- [x] Create a Chrome Web Store developer account and pay the one-time $5 fee
      at https://chrome.google.com/webstore/devconsole
- [ ] Host the privacy policy at a public URL (see "Privacy policy URL" below)

## Build the upload package

```bash
pnpm run package
```

This produces `dist-package/pdf-manager-v<version>.zip` with `manifest.json` at
the archive root, ready to upload. The script fails loudly if the
`package.json` and `manifest.json` versions disagree.

## Store listing assets

Prepare these in the Developer Dashboard before submitting:

- **Store icon**: 128x128 PNG (the manifest icon is reused; replace the
  placeholder art in `public/icons/` for a polished listing).
- **Screenshots**: at least one, 1280x800 or 640x400 (PNG or JPEG). Capture the
  source pane, the destination assembly, and an export in progress.
- **Short description** (<=132 chars): reuse the `description` field from
  `public/manifest.json`.
- **Detailed description**: explain assemble / preview / export and the
  local-only, files-never-leave-your-device guarantee.
- **Category**: Productivity.
- **Language**: English.

## Privacy disclosures (Data practices form)

- Data collection: **does not collect user data**.
- Justify the single `contextMenus` permission: "adds a right-click entry to
  open the extension."
- Confirm no remote code is used (everything is bundled).

### Privacy policy URL

The store requires a public URL. Easiest option: enable GitHub Pages on this
repo and link the raw rendered `PRIVACY.md`, or paste its contents into a
Pages site. Alternatively link directly to the file on the default branch:
`https://github.com/lucianhanga/chrome.extension.manage.pdfs/blob/main/PRIVACY.md`

## Submit

1. Dashboard -> "Add new item" -> upload the ZIP.
2. Fill in listing assets and the privacy form above.
3. Set visibility (Public / Unlisted) and submit for review.
4. Review typically takes a few hours to a few business days.

## Publishing an update

1. Make changes on a feature branch and merge per the project's GitHub flow.
2. Bump the version in **both** `package.json` and `public/manifest.json`
   (the package script enforces they match).
3. `pnpm run package`
4. Dashboard -> the existing item -> "Package" -> upload the new ZIP -> submit.

> Chrome Web Store versions must strictly increase and cannot be reused.
