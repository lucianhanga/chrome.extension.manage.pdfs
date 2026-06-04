// File type and size guards for the ingestion pipeline.

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

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Validate a File for ingestion.
 * Checks MIME type (as reported by the browser) and file size.
 * Returns an error reason string on failure.
 */
export function validateFile(file: File): ValidationResult {
  if (!isAcceptedMimeType(file.type)) {
    const label = file.type || 'unknown';
    return {
      ok: false,
      reason: `"${file.name}": unsupported file type (${label}). Accepted: PDF, PNG, JPEG, WebP, GIF, plain text.`,
    };
  }
  if (isFileTooLarge(file.size)) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    const limitMb = (MAX_FILE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      ok: false,
      reason: `"${file.name}" is ${mb} MB — exceeds the ${limitMb} MB per-file limit.`,
    };
  }
  return { ok: true };
}

/**
 * Check whether adding newBytes would exceed the total memory cap.
 */
export function wouldExceedTotalCap(currentBytes: number, newBytes: number): boolean {
  return currentBytes + newBytes > MAX_TOTAL_BYTES;
}

/** Human-readable file size string (e.g. "4.2 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
