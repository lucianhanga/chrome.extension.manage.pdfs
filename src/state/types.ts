// Shared type contracts for PDF Manager.
// Phase 1 skeleton — types will be filled out in subsequent phases.

export type ExportProfile = 'print' | 'web' | 'compressed';

export interface Resource {
  id: string;
  kind: 'pdf' | 'image' | 'text';
  name: string;
  sizeBytes: number;
  // PDF-specific (set after pdf.js parses the document)
  pageCount?: number;
  // Populated after ingestion
  objectUrl?: string;
}

export interface DestinationItem {
  id: string;
  resourceId: string;
  kind: 'pdf-page' | 'image';
  pageIndex?: number;
}
