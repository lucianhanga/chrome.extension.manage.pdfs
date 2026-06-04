import { describe, it, expect } from 'vitest';
import { isAcceptedMimeType, isFileTooLarge, MAX_FILE_BYTES } from '../../src/shared/validate.ts';

describe('isAcceptedMimeType', () => {
  it('accepts PDF', () => {
    expect(isAcceptedMimeType('application/pdf')).toBe(true);
  });

  it('accepts supported image types', () => {
    expect(isAcceptedMimeType('image/png')).toBe(true);
    expect(isAcceptedMimeType('image/jpeg')).toBe(true);
    expect(isAcceptedMimeType('image/webp')).toBe(true);
    expect(isAcceptedMimeType('image/gif')).toBe(true);
  });

  it('accepts plain text', () => {
    expect(isAcceptedMimeType('text/plain')).toBe(true);
  });

  it('rejects unsupported types', () => {
    expect(isAcceptedMimeType('video/mp4')).toBe(false);
    expect(isAcceptedMimeType('application/zip')).toBe(false);
    expect(isAcceptedMimeType('')).toBe(false);
  });
});

describe('isFileTooLarge', () => {
  it('returns false for files within the limit', () => {
    expect(isFileTooLarge(1024)).toBe(false);
    expect(isFileTooLarge(MAX_FILE_BYTES)).toBe(false);
  });

  it('returns true for files exceeding the limit', () => {
    expect(isFileTooLarge(MAX_FILE_BYTES + 1)).toBe(true);
  });
});
