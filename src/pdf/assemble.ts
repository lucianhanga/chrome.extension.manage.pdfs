// pdf-lib assembly pipeline: builds the output PDF from the ordered destination list.
//
// Item kinds and how they are assembled:
//   'pdf-page'  -> copyPages from the source PDF's raw bytes (vector, no rasterization)
//                  OR rasterize via pdf.js -> JPEG embed (compressed profile only).
//   'image'     -> fetch the source image bytes from the objectUrl, compress via worker,
//                  embed as a full-page image (sized to the image aspect ratio).
//   'text'      -> render the text resource to a new page using a pdf-lib standard font.
//
// Source PDFs are loaded (PDFDocument.load) once per unique resource within a single
// export; the loaded documents are cached to avoid redundant parsing of large files.

import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import type { PDFPage } from 'pdf-lib';
import type { DestinationItem, Resource, PdfResourceData, ImageResourceData, TextResourceData } from '../state/types.ts';
import type { ExportProfileParams } from './profiles.ts';
import { compressImage, terminateCompressWorker } from './compress.ts';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// ---------------------------------------------------------------------------
// Helper: rasterize a single PDF page to JPEG bytes via pdf.js.
// Used only by the compressed profile (rasterizePdfPages = true).
// ---------------------------------------------------------------------------

async function rasterizePageToJpeg(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number, // 1-based
  targetDpi: number,
): Promise<{ bytes: Uint8Array; widthPt: number; heightPt: number }> {
  const page = await pdfDoc.getPage(pageIndex);
  const viewport = page.getViewport({ scale: 1 });
  // PDF user-space units are 1pt = 1/72 inch. Convert DPI to scale factor.
  const scale = targetDpi / 72;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(scaledViewport.width);
  canvas.height = Math.round(scaledViewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D context for PDF rasterization');

  // White background before rendering (PDF pages may have transparent backgrounds).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
  page.cleanup();

  // JPEG quality for the compressed profile is baked in via the profile params
  // but we use 0.75 here as a reasonable base; the caller controls DPI already.
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas.toBlob returned null'))),
      'image/jpeg',
      0.75,
    );
  });
  const buffer = await blob.arrayBuffer();
  return {
    bytes: new Uint8Array(buffer),
    widthPt: viewport.width,
    heightPt: viewport.height,
  };
}

// ---------------------------------------------------------------------------
// Helper: embed a pdf-page item.
// ---------------------------------------------------------------------------

async function assemblePdfPage(
  outDoc: PDFDocument,
  item: DestinationItem,
  resource: Resource,
  sourceDocCache: Map<string, PDFDocument>,
  pdfDocProxyCache: Map<string, PDFDocumentProxy>,
  params: ExportProfileParams,
): Promise<void> {
  const data = resource.data as PdfResourceData;
  const pageIndex = item.pageIndex ?? 0; // 0-based

  if (params.rasterizePdfPages) {
    // Compressed profile: rasterize via pdf.js, embed as JPEG image page.
    let proxy = pdfDocProxyCache.get(resource.id);
    if (!proxy) {
      proxy = data.pdfDoc as PDFDocumentProxy;
      pdfDocProxyCache.set(resource.id, proxy);
    }

    const { bytes, widthPt, heightPt } = await rasterizePageToJpeg(proxy, pageIndex + 1, params.targetDpi);
    const jpgImage = await outDoc.embedJpg(bytes);

    const page = outDoc.addPage([widthPt, heightPt]);
    page.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width: widthPt,
      height: heightPt,
    });
    return;
  }

  // Print / web profiles: copy pages as native vector content.
  let srcDoc = sourceDocCache.get(resource.id);
  if (!srcDoc) {
    // Load once per source resource per export session.
    srcDoc = await PDFDocument.load(data.rawBytes, { ignoreEncryption: true });
    sourceDocCache.set(resource.id, srcDoc);
  }

  const [copiedPage] = await outDoc.copyPages(srcDoc, [pageIndex]);
  outDoc.addPage(copiedPage);
}

// ---------------------------------------------------------------------------
// Helper: fetch image bytes from an object URL.
// ---------------------------------------------------------------------------

async function fetchObjectUrlBytes(objectUrl: string): Promise<{ bytes: ArrayBuffer; mimeType: string }> {
  const response = await fetch(objectUrl);
  if (!response.ok) throw new Error(`Failed to fetch image bytes from object URL: ${response.status}`);
  const mimeType = response.headers.get('content-type') ?? 'image/png';
  const bytes = await response.arrayBuffer();
  return { bytes, mimeType };
}

// ---------------------------------------------------------------------------
// Helper: embed an image item.
// ---------------------------------------------------------------------------

async function assembleImageItem(
  outDoc: PDFDocument,
  resource: Resource,
  params: ExportProfileParams,
): Promise<void> {
  const data = resource.data as ImageResourceData;

  const { bytes: rawBytes, mimeType: rawMime } = await fetchObjectUrlBytes(data.objectUrl);

  // Re-encode via OffscreenCanvas worker to apply DPI cap and quality settings.
  const { bytes: compressedBytes, mimeType: outMime } = await compressImage(rawBytes, rawMime, params);

  let image;
  if (outMime === 'image/jpeg') {
    image = await outDoc.embedJpg(new Uint8Array(compressedBytes));
  } else {
    image = await outDoc.embedPng(new Uint8Array(compressedBytes));
  }

  const { width: imgW, height: imgH } = image;

  // Fit the image into a standard page. If the image is very small, it is
  // placed at its natural size centered on the page. If it is larger than
  // the page, it is scaled to fit with uniform aspect ratio.
  const [pageW, pageH] = PageSizes.A4; // 595.28 x 841.89 pt

  // Compute scale to fit within the page with margins.
  const marginPt = 36; // 0.5 inch margin
  const maxW = pageW - 2 * marginPt;
  const maxH = pageH - 2 * marginPt;
  const scale = Math.min(1, maxW / imgW, maxH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;

  // Center on the page.
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;

  const page: PDFPage = outDoc.addPage([pageW, pageH]);
  page.drawImage(image, { x, y, width: drawW, height: drawH });
}

// ---------------------------------------------------------------------------
// Helper: render a text resource to a PDF page.
// ---------------------------------------------------------------------------

const TEXT_FONT_SIZE = 11;
const TEXT_LINE_HEIGHT = TEXT_FONT_SIZE * 1.4;
const TEXT_MARGIN_PT = 50; // ~0.7 inch
const [TEXT_PAGE_W, TEXT_PAGE_H] = PageSizes.A4;

/**
 * Wrap plain text into lines that fit within the available width.
 * Uses a character-count approximation for a monospace-like font.
 * pdf-lib's standard fonts are proportional; ~0.6 is a conservative character
 * width factor for Helvetica at the given font size.
 */
export function wrapTextIntoLines(
  text: string,
  availableWidth: number,
  fontSize: number,
): string[] {
  if (text.length === 0) return [];

  const charWidth = fontSize * 0.52; // average glyph advance for Helvetica
  const charsPerLine = Math.max(1, Math.floor(availableWidth / charWidth));

  const lines: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (rawLine.length === 0) {
      lines.push('');
      continue;
    }
    // Word-wrap within the raw line.
    const words = rawLine.split(' ');
    let current = '';
    for (const word of words) {
      if (word.length === 0) {
        current += ' ';
        continue;
      }
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= charsPerLine) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        // Long words that exceed line width are hard-wrapped.
        let remaining = word;
        while (remaining.length > charsPerLine) {
          lines.push(remaining.slice(0, charsPerLine));
          remaining = remaining.slice(charsPerLine);
        }
        current = remaining;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

async function assembleTextItem(outDoc: PDFDocument, resource: Resource): Promise<void> {
  const data = resource.data as TextResourceData;
  const fullText = data.preview; // preview holds up to 2000 chars from ingestion

  const font = await outDoc.embedFont(StandardFonts.Helvetica);
  const availableWidth = TEXT_PAGE_W - 2 * TEXT_MARGIN_PT;
  const availableHeight = TEXT_PAGE_H - 2 * TEXT_MARGIN_PT;
  const linesPerPage = Math.floor(availableHeight / TEXT_LINE_HEIGHT);

  const allLines = wrapTextIntoLines(fullText, availableWidth, TEXT_FONT_SIZE);

  // Paginate: split lines into pages.
  let lineOffset = 0;
  while (lineOffset < allLines.length) {
    const pageLines = allLines.slice(lineOffset, lineOffset + linesPerPage);
    lineOffset += linesPerPage;

    const page: PDFPage = outDoc.addPage([TEXT_PAGE_W, TEXT_PAGE_H]);

    // Draw lines from top to bottom.
    for (let i = 0; i < pageLines.length; i++) {
      const y = TEXT_PAGE_H - TEXT_MARGIN_PT - (i + 1) * TEXT_LINE_HEIGHT;
      if (y < TEXT_MARGIN_PT) break;
      page.drawText(pageLines[i], {
        x: TEXT_MARGIN_PT,
        y,
        size: TEXT_FONT_SIZE,
        font,
        color: rgb(0, 0, 0),
      });
    }

    // If there are more lines, the loop continues and adds another page.
  }

  // Ensure at least one page is produced even for empty text resources.
  if (allLines.length === 0 || outDoc.getPageCount() === 0) {
    outDoc.addPage([TEXT_PAGE_W, TEXT_PAGE_H]);
  }
}

// ---------------------------------------------------------------------------
// Public API: assemble the ordered destination list into a PDF Uint8Array.
// ---------------------------------------------------------------------------

export interface AssembleOptions {
  /** Called with progress [0..1] as pages are processed. Optional. */
  onProgress?: (fraction: number) => void;
}

/**
 * Assemble the destination item list into a single PDF document.
 *
 * @param destinationItems - Ordered list of pages/images/text items to include.
 * @param resources - Map from resource id to Resource.
 * @param params - Export profile parameters controlling quality and rasterization.
 * @param options - Optional callbacks.
 * @returns Serialized PDF bytes.
 */
export async function assemblePdf(
  destinationItems: DestinationItem[],
  resources: Map<string, Resource>,
  params: ExportProfileParams,
  options: AssembleOptions = {},
): Promise<Uint8Array> {
  const { onProgress } = options;
  const outDoc = await PDFDocument.create();

  // Cache per-source loaded PDFDocuments (for copyPages) and PDFDocumentProxy (for rasterize).
  const sourceDocCache = new Map<string, PDFDocument>();
  const pdfDocProxyCache = new Map<string, PDFDocumentProxy>();

  const total = destinationItems.length;

  try {
    for (let i = 0; i < destinationItems.length; i++) {
      const item = destinationItems[i];
      const resource = resources.get(item.resourceId);
      if (!resource) continue; // Resource removed since export started — skip gracefully.

      switch (item.kind) {
        case 'pdf-page':
          await assemblePdfPage(outDoc, item, resource, sourceDocCache, pdfDocProxyCache, params);
          break;
        case 'image':
          await assembleImageItem(outDoc, resource, params);
          break;
        case 'text':
          await assembleTextItem(outDoc, resource);
          break;
      }

      onProgress?.((i + 1) / total);
    }

    return outDoc.save({ useObjectStreams: params.useObjectStreams });
  } finally {
    // Always terminate the worker after export to free OffscreenCanvas resources.
    terminateCompressWorker();
  }
}

// ---------------------------------------------------------------------------
// Public API: trigger browser download of PDF bytes without permissions.
// ---------------------------------------------------------------------------

/**
 * Download PDF bytes as a file using a temporary blob object URL.
 * Does NOT require the `downloads` permission — uses <a download> from the page.
 * The object URL is revoked immediately after the click event.
 *
 * @param bytes - PDF bytes to download.
 * @param filename - Suggested filename (sanitized if necessary).
 */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const sanitized = sanitizeFilename(filename);
  // Cast to Uint8Array<ArrayBuffer> — Blob constructor accepts ArrayBufferView,
  // but the generic Uint8Array<ArrayBufferLike> triggers a TS strict-mode mismatch.
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = sanitized;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke the object URL after the browser has had a chance to initiate the download.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Sanitize a filename: strip path separators, trim whitespace, ensure .pdf extension.
 * Exported for unit testing.
 */
export function sanitizeFilename(raw: string): string {
  // Strip directory components, null bytes, and trim whitespace.
  // Filter null bytes via charCodeAt instead of a regex to satisfy no-control-regex.
  let name = Array.from(raw)
    .filter((ch) => ch.charCodeAt(0) !== 0)
    .join('')
    .replace(/[/\\]/g, '-')
    .trim();

  // Default if empty after sanitization.
  if (!name) name = 'result';

  // Ensure .pdf extension.
  if (!name.toLowerCase().endsWith('.pdf')) {
    name = `${name}.pdf`;
  }

  return name;
}

