// pdf.js rendering helpers (Phase 2 implementation).
// Stub only — import and workerSrc wiring happens in Phase 2.

// TODO Phase 2:
//   import * as pdfjsLib from 'pdfjs-dist';
//   import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
//   pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
//
//   export async function openPdf(bytes: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy>
//   export async function getPageThumbnail(doc: pdfjsLib.PDFDocumentProxy, pageIndex: number, targetWidth: number): Promise<Blob>
//   export async function getPdfMetadata(doc: pdfjsLib.PDFDocumentProxy): Promise<PdfMetadata>

export interface PdfMetadata {
  title?: string;
  author?: string;
  pageCount: number;
  pageDimensions: Array<{ width: number; height: number }>;
}
