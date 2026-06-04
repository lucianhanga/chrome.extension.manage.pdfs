// pdf.js rendering helpers: open, metadata extraction, and thumbnail rasterization.
// workerSrc MUST be set before calling openPdf — do it in main.tsx before first use.

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export { pdfjsLib };

export interface PdfMetadata {
  title?: string;
  author?: string;
  pageCount: number;
  pageDimensions: Array<{ width: number; height: number }>;
}

/**
 * Open a PDF from an ArrayBuffer.
 * Caller must set pdfjsLib.GlobalWorkerOptions.workerSrc before the first call.
 */
export async function openPdf(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
  return loadingTask.promise;
}

/**
 * Extract metadata from an already-opened PDFDocumentProxy.
 * Page dimensions are in PDF user-space units (1 pt = 1/72 inch).
 */
export async function getPdfMetadata(doc: PDFDocumentProxy): Promise<PdfMetadata> {
  const numPages = doc.numPages;
  const pageDimensions: Array<{ width: number; height: number }> = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    pageDimensions.push({ width: viewport.width, height: viewport.height });
    page.cleanup();
  }

  let title: string | undefined;
  let author: string | undefined;

  try {
    const meta = await doc.getMetadata();
    const info = meta.info as Record<string, string> | undefined;
    if (info) {
      if (info['Title']) title = info['Title'];
      if (info['Author']) author = info['Author'];
    }
  } catch {
    // Metadata may be absent — not an error.
  }

  return { pageCount: numPages, pageDimensions, title, author };
}

/**
 * Render a single PDF page to a Blob (PNG) at the given target width in pixels.
 * The page proxy is cleaned up after rasterization to release memory.
 * pageIndex is 1-based (matching pdf.js page numbering).
 */
export async function getPageThumbnail(
  doc: PDFDocumentProxy,
  pageIndex: number,
  targetWidth: number,
): Promise<Blob> {
  const page = await doc.getPage(pageIndex);
  const viewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / viewport.width;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(scaledViewport.width);
  canvas.height = Math.round(scaledViewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not acquire 2D canvas context');

  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
  page.cleanup();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas.toBlob returned null'));
      },
      'image/png',
    );
  });
}
