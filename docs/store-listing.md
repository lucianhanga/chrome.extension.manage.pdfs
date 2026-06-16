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
PDF Manager is a complete PDF-building workspace that runs entirely inside your
browser. Combine PDFs, pull out just the pages you need, add images and text,
put everything in the exact order you want, and export a clean new PDF - without
uploading a single file to anyone.

WHY YOU'LL WANT IT
Most "merge PDF" and "split PDF" tools make you upload your documents to a
website you don't control. That's a problem when the file is a contract, a
payslip, a medical record, an ID, or anything else you'd rather not hand to a
stranger's server. PDF Manager does all the work locally, so your documents
never leave your device. It's also fast, works offline, and has nothing to sign
up for.

WHAT YOU CAN DO
- Merge several PDFs into one.
- Pick and choose individual pages - take page 3 from one file and pages 1-2
  from another.
- Reorder pages by dragging them into place.
- Drop in images (PNG, JPEG, WebP, GIF) and plain text as new pages.
- Duplicate or remove any page, and preview the result as you build it.
- Export with the quality you need: print quality, a smaller web-friendly file,
  or a heavily compressed version for email.

HOW IT WORKS
Open the full-page workspace from the toolbar icon (or the right-click "Open PDF
Manager" menu). Drag your files into the Source pane, then drag the pages,
images, or text you want into the Destination pane. For multi-page PDFs, select
several pages at once and drag them in together. Arrange the order, choose an
export profile, and click Export - your finished PDF downloads instantly.

PRIVATE BY DESIGN
Everything - reading, rendering, assembling, and exporting - happens on your
computer. PDF Manager makes NO network requests, asks for NO access to the
websites you visit, and collects NO data, analytics, or tracking. The only
permission it requests is a right-click shortcut to open the app. Close the tab
and everything is cleared from memory.

OPEN SOURCE
PDF Manager is free and open source (MIT licensed). You can read the full source
code, verify exactly what it does, report issues, or contribute on GitHub:
https://github.com/lucianhanga/chrome.extension.manage.pdfs

PERFECT FOR
Combining scanned documents, building a single PDF from mixed files, extracting
a few pages to share, assembling an application or portfolio, shrinking a PDF
small enough to email, or reordering a report - all privately, all in your
browser.

Free, no account, no uploads. Learn more:
https://github.com/lucianhanga/chrome.extension.manage.pdfs/blob/main/docs/user-guide.md
```

## Permission justifications and the data-practices form

These live in [PUBLISHING.md](PUBLISHING.md) so they stay in one place with the
rest of the submission steps. In short:

- **Single permission — `contextMenus`:** "Adds a right-click entry to open the
  extension's workspace. It does not read page content."
- **Host permissions:** none.
- **Remote code:** none — everything is bundled in the package.
- **Data collection:** "Does not collect user data."
