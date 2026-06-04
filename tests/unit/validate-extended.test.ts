// Extended validation tests for validateFile, wouldExceedTotalCap, and formatBytes.

import { describe, it, expect } from 'vitest';
import {
  validateFile,
  wouldExceedTotalCap,
  formatBytes,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
} from '../../src/shared/validate.ts';

// Helper to create a minimal File-like object that satisfies the validation API.
function makeFile(name: string, type: string): File {
  // Use Blob as the backing store; actual bytes don't matter for validation.
  const blob = new Blob([new Uint8Array(0)], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
}

describe('validateFile', () => {
  it('accepts a valid PDF', () => {
    const f = makeFile('test.pdf', 'application/pdf');
    const result = validateFile(f);
    expect(result.ok).toBe(true);
  });

  it('rejects an unsupported MIME type', () => {
    const f = makeFile('video.mp4', 'video/mp4');
    const result = validateFile(f);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('unsupported file type');
      expect(result.reason).toContain('video.mp4');
    }
  });

  it('rejects a file that is too large', () => {
    // Build a real file that is large enough by using a sized Blob.
    const oversized = MAX_FILE_BYTES + 1;
    const blob = new Blob([new Uint8Array(oversized)], { type: 'application/pdf' });
    const f = new File([blob], 'big.pdf', { type: 'application/pdf' });
    const result = validateFile(f);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('exceeds');
    }
  });

  it('accepts a file exactly at the size limit', () => {
    const blob = new Blob([new Uint8Array(MAX_FILE_BYTES)], { type: 'image/png' });
    const f = new File([blob], 'max.png', { type: 'image/png' });
    const result = validateFile(f);
    expect(result.ok).toBe(true);
  });

  it('includes the filename in rejection messages', () => {
    const f = makeFile('secret.exe', 'application/x-msdownload');
    const result = validateFile(f);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('secret.exe');
    }
  });
});

describe('wouldExceedTotalCap', () => {
  it('returns false when under the cap', () => {
    expect(wouldExceedTotalCap(0, 1024)).toBe(false);
  });

  it('returns false when exactly at the cap', () => {
    expect(wouldExceedTotalCap(0, MAX_TOTAL_BYTES)).toBe(false);
  });

  it('returns true when over the cap', () => {
    expect(wouldExceedTotalCap(MAX_TOTAL_BYTES, 1)).toBe(true);
  });

  it('returns true when combined exceeds cap', () => {
    const half = MAX_TOTAL_BYTES / 2;
    expect(wouldExceedTotalCap(half, half + 1)).toBe(true);
  });
});

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(4.5 * 1024 * 1024)).toBe('4.5 MB');
  });
});
