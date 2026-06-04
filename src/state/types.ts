// Shared type contracts for PDF Manager.

export type ExportProfile = 'print' | 'web' | 'compressed';

export interface PageDimension {
  width: number;
  height: number;
}

export interface PdfResourceData {
  kind: 'pdf';
  pageCount: number;
  pageDimensions: PageDimension[];
  title?: string;
  author?: string;
  /** Thumbnail object URLs per page (index-aligned). Revoke on removal. */
  thumbnailUrls: string[];
  /**
   * The open PDFDocumentProxy from pdf.js. Kept alive so the page grid and
   * lightbox can render additional pages on demand without re-parsing the file.
   * Call doc.cleanup() when the resource is removed.
   * Typed as unknown to avoid coupling types.ts to pdfjs-dist; cast at use site.
   */
  pdfDoc: unknown;
}

export interface ImageResourceData {
  kind: 'image';
  width: number;
  height: number;
  /** Object URL for display. Revoke on removal. */
  objectUrl: string;
}

export interface TextResourceData {
  kind: 'text';
  /** First N characters for preview. */
  preview: string;
}

export type ResourceData = PdfResourceData | ImageResourceData | TextResourceData;

export interface Resource {
  id: string;
  name: string;
  sizeBytes: number;
  data: ResourceData;
}

export interface DestinationItem {
  id: string;
  resourceId: string;
  kind: 'pdf-page' | 'image';
  pageIndex?: number;
}
