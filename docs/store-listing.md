# Chrome Web Store listing copy

Paste-ready text for the Developer Dashboard. The store's "Detailed description"
field is **plain text** (no Markdown rendering), so the block below uses plain
text with hyphen bullets. Edit freely before submitting.

See [PUBLISHING.md](PUBLISHING.md) for the full submission checklist and
[store-assets/README.md](../store-assets/README.md) for image requirements.

---

## Name

```
PDF Manager
```

## Short description (<= 132 characters)

```
Assemble, preview, and export PDFs entirely in your browser. Files never leave your device.
```

(91 characters — reused from the manifest `description`.)

## Category

```
Productivity
```

## Language

```
English
```

## Detailed description

```
PDF Manager is a complete workspace for building PDFs that runs entirely in your
browser. Load PDFs, images, and text; pick the exact pages you want; drag them
into any order; preview the result live; and export a brand-new PDF. Your files
never leave your device - there is no network access and no access to the pages
you visit.

HOW IT WORKS
- Open the full-page workspace from the toolbar icon or the right-click "Open
  PDF Manager" menu.
- Load files by drag-and-drop or the file picker - PDF, PNG, JPEG, WebP, GIF,
  and plain text are supported.
- Drag pages, images, or text from the Source pane into the Destination pane.
  For multi-page PDFs, multi-select pages (Ctrl/Cmd-click or Shift-click) and
  drag them in together.
- Reorder by dragging, duplicate or remove any item, and preview the assembled
  document as you go.
- Export with one of three quality profiles and download the finished PDF.

THREE EXPORT PROFILES
- Optimized for printing - highest quality; keeps vector text sharp.
- Optimized for web sharing - balanced quality and file size.
- Compressed - smallest file (note: this profile flattens pages to images, so
  text is no longer selectable).

PRIVATE BY DESIGN
Everything - reading, rendering, assembling, and exporting - happens locally in
the extension page. The extension makes NO network requests, requests NO host
permissions, and has NO access to the websites you visit. Closing the tab clears
everything from memory. The only permission requested is "contextMenus", used
solely to add the right-click shortcut that opens the app.

GUIDES & USER MANUAL
- How to use it (illustrated walkthrough):
  https://github.com/lucianhanga/chrome.extension.manage.pdfs/blob/main/docs/user-guide.md
- Privacy policy:
  https://github.com/lucianhanga/chrome.extension.manage.pdfs/blob/main/PRIVACY.md
- Source code:
  https://github.com/lucianhanga/chrome.extension.manage.pdfs

PERMISSIONS & PRIVACY
PDF Manager does not collect, transmit, or store any data on remote servers. It
uses no analytics, tracking, advertising, or telemetry. It works fully offline.
```

## Permission justifications and the data-practices form

These live in [PUBLISHING.md](PUBLISHING.md) so they stay in one place with the
rest of the submission steps. In short:

- **Single permission — `contextMenus`:** "Adds a right-click entry to open the
  extension's workspace. It does not read page content."
- **Host permissions:** none.
- **Remote code:** none — everything is bundled in the package.
- **Data collection:** "Does not collect user data."
