// Ingestion pipeline: reads a File, validates it, parses metadata, renders thumbnails.
// Returns a fully-populated Resource ready to add to the store.

import { validateFile, wouldExceedTotalCap, formatBytes, MAX_TOTAL_BYTES } from '../shared/validate.ts';
import { createTrackedObjectUrl } from '../shared/objectUrl.ts';
import { openPdf, getPdfMetadata, getPageThumbnail } from './render.ts';
import type { Resource, PdfResourceData, ImageResourceData, TextResourceData } from '../state/types.ts';

/** Width in pixels for generated thumbnails. */
const THUMBNAIL_WIDTH = 200;

/** Maximum characters from a text file to keep as preview. */
const TEXT_PREVIEW_CHARS = 2000;

export type IngestResult =
  | { ok: true; resource: Resource }
  | { ok: false; reason: string };

/**
 * Ingest a single File from a picker or drag-drop.
 * currentTotalBytes is the sum of sizes already loaded (for the cap check).
 */
export async function ingestFile(
  file: File,
  currentTotalBytes: number,
): Promise<IngestResult> {
  const validation = validateFile(file);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  if (wouldExceedTotalCap(currentTotalBytes, file.size)) {
    const limitMb = (MAX_TOTAL_BYTES / (1024 * 1024)).toFixed(0);
    return {
      ok: false,
      reason: `Cannot load "${file.name}": total loaded size would exceed the ${limitMb} MB cap. Remove some resources first.`,
    };
  }

  const id = crypto.randomUUID();

  if (file.type === 'application/pdf') {
    return ingestPdf(file, id);
  }
  if (file.type.startsWith('image/')) {
    return ingestImage(file, id);
  }
  if (file.type === 'text/plain') {
    return ingestText(file, id);
  }

  return { ok: false, reason: `"${file.name}": unrecognised file type.` };
}

async function ingestPdf(file: File, id: string): Promise<IngestResult> {
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch (err) {
    return { ok: false, reason: `"${file.name}": could not read file — ${String(err)}` };
  }

  let doc: Awaited<ReturnType<typeof openPdf>>;
  try {
    doc = await openPdf(bytes);
  } catch (err) {
    return { ok: false, reason: `"${file.name}": could not parse PDF — ${String(err)}` };
  }

  let metadata: Awaited<ReturnType<typeof getPdfMetadata>>;
  try {
    metadata = await getPdfMetadata(doc);
  } catch (err) {
    return { ok: false, reason: `"${file.name}": could not read PDF metadata — ${String(err)}` };
  }

  // Render thumbnails sequentially to avoid flooding the canvas context.
  const thumbnailUrls: string[] = [];
  for (let i = 1; i <= metadata.pageCount; i++) {
    try {
      const blob = await getPageThumbnail(doc, i, THUMBNAIL_WIDTH);
      thumbnailUrls.push(createTrackedObjectUrl(blob));
    } catch {
      // On failure push an empty string so page index alignment is preserved.
      thumbnailUrls.push('');
    }
  }

  // Keep the PDFDocumentProxy alive so the page grid and lightbox can render
  // additional pages on demand. The proxy is stored as `pdfDoc` in the resource
  // data and cleaned up when the resource is removed from the store.

  const data: PdfResourceData = {
    kind: 'pdf',
    pageCount: metadata.pageCount,
    pageDimensions: metadata.pageDimensions,
    thumbnailUrls,
    title: metadata.title,
    author: metadata.author,
    pdfDoc: doc,
  };

  return {
    ok: true,
    resource: { id, name: file.name, sizeBytes: file.size, data },
  };
}

async function ingestImage(file: File, id: string): Promise<IngestResult> {
  let blob: Blob;
  try {
    // Create a blob copy for the object URL (the File is a Blob subtype).
    blob = file.slice(0, file.size, file.type);
  } catch (err) {
    return { ok: false, reason: `"${file.name}": could not read file — ${String(err)}` };
  }

  const objectUrl = createTrackedObjectUrl(blob);

  // Get image dimensions by loading it into an HTMLImageElement.
  const { width, height } = await getImageDimensions(objectUrl).catch(() => ({
    width: 0,
    height: 0,
  }));

  const data: ImageResourceData = {
    kind: 'image',
    width,
    height,
    objectUrl,
  };

  return {
    ok: true,
    resource: { id, name: file.name, sizeBytes: file.size, data },
  };
}

async function ingestText(file: File, id: string): Promise<IngestResult> {
  let text: string;
  try {
    text = await file.text();
  } catch (err) {
    return { ok: false, reason: `"${file.name}": could not read file — ${String(err)}` };
  }

  const preview = text.slice(0, TEXT_PREVIEW_CHARS);
  const data: TextResourceData = { kind: 'text', preview };

  return {
    ok: true,
    resource: { id, name: file.name, sizeBytes: file.size, data },
  };
}

function getImageDimensions(
  url: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

/** Format file size as a human-readable label for display. */
export { formatBytes };
