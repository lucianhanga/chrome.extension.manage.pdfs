// File type and size guards for ingestion pipeline (Phase 2).

export const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
]);

/** Maximum total loaded bytes before the UI warns (500 MB). */
export const MAX_TOTAL_BYTES = 500 * 1024 * 1024;

/** Maximum single file size (200 MB). */
export const MAX_FILE_BYTES = 200 * 1024 * 1024;

export function isAcceptedMimeType(mime: string): boolean {
  return ACCEPTED_MIME_TYPES.has(mime);
}

export function isFileTooLarge(bytes: number): boolean {
  return bytes > MAX_FILE_BYTES;
}
