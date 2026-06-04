// Unit tests for Phase 4 export logic: pure helpers that do not require a DOM,
// pdf-lib, or a worker.
//
// Covers:
//   - Profile parameter values and constraints
//   - computeMaxDimension (DPI -> max pixel dimension)
//   - wrapTextIntoLines (text layout helper)
//   - sanitizeFilename (download filename sanitization)

import { describe, it, expect } from 'vitest';
import { PRINT_PROFILE, WEB_PROFILE, COMPRESSED_PROFILE } from '../../src/pdf/profiles.ts';
import { computeMaxDimension } from '../../src/pdf/compress.ts';
import { wrapTextIntoLines, sanitizeFilename } from '../../src/pdf/assemble.ts';

// ---------------------------------------------------------------------------
// Profile parameter tables
// ---------------------------------------------------------------------------

describe('export profile parameters', () => {
  describe('PRINT_PROFILE', () => {
    it('has the highest DPI (300)', () => {
      expect(PRINT_PROFILE.targetDpi).toBe(300);
    });

    it('has the highest JPEG quality (0.92)', () => {
      expect(PRINT_PROFILE.jpegQuality).toBe(0.92);
    });

    it('does not rasterize PDF pages', () => {
      expect(PRINT_PROFILE.rasterizePdfPages).toBe(false);
    });

    it('uses object streams', () => {
      expect(PRINT_PROFILE.useObjectStreams).toBe(true);
    });

    it('JPEG quality is in valid range [0, 1]', () => {
      expect(PRINT_PROFILE.jpegQuality).toBeGreaterThan(0);
      expect(PRINT_PROFILE.jpegQuality).toBeLessThanOrEqual(1);
    });
  });

  describe('WEB_PROFILE', () => {
    it('has mid-range DPI (150)', () => {
      expect(WEB_PROFILE.targetDpi).toBe(150);
    });

    it('has mid-range JPEG quality (0.8)', () => {
      expect(WEB_PROFILE.jpegQuality).toBe(0.8);
    });

    it('does not rasterize PDF pages', () => {
      expect(WEB_PROFILE.rasterizePdfPages).toBe(false);
    });

    it('uses object streams', () => {
      expect(WEB_PROFILE.useObjectStreams).toBe(true);
    });
  });

  describe('COMPRESSED_PROFILE', () => {
    it('has the lowest DPI (96)', () => {
      expect(COMPRESSED_PROFILE.targetDpi).toBe(96);
    });

    it('has the lowest JPEG quality (0.6)', () => {
      expect(COMPRESSED_PROFILE.jpegQuality).toBe(0.6);
    });

    it('rasterizes PDF pages (max compression path)', () => {
      expect(COMPRESSED_PROFILE.rasterizePdfPages).toBe(true);
    });

    it('uses object streams', () => {
      expect(COMPRESSED_PROFILE.useObjectStreams).toBe(true);
    });
  });

  describe('profile ordering', () => {
    it('DPI ordering: compressed < web < print', () => {
      expect(COMPRESSED_PROFILE.targetDpi).toBeLessThan(WEB_PROFILE.targetDpi);
      expect(WEB_PROFILE.targetDpi).toBeLessThan(PRINT_PROFILE.targetDpi);
    });

    it('JPEG quality ordering: compressed < web < print', () => {
      expect(COMPRESSED_PROFILE.jpegQuality).toBeLessThan(WEB_PROFILE.jpegQuality);
      expect(WEB_PROFILE.jpegQuality).toBeLessThan(PRINT_PROFILE.jpegQuality);
    });

    it('all profiles have useObjectStreams = true', () => {
      expect(PRINT_PROFILE.useObjectStreams).toBe(true);
      expect(WEB_PROFILE.useObjectStreams).toBe(true);
      expect(COMPRESSED_PROFILE.useObjectStreams).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// computeMaxDimension
// ---------------------------------------------------------------------------

describe('computeMaxDimension', () => {
  it('returns a positive integer for all profiles', () => {
    for (const profile of [PRINT_PROFILE, WEB_PROFILE, COMPRESSED_PROFILE]) {
      const max = computeMaxDimension(profile.targetDpi);
      expect(max).toBeGreaterThan(0);
      expect(Number.isInteger(max)).toBe(true);
    }
  });

  it('dimension ordering matches DPI ordering: compressed < web < print', () => {
    const printMax = computeMaxDimension(PRINT_PROFILE.targetDpi);
    const webMax = computeMaxDimension(WEB_PROFILE.targetDpi);
    const compressedMax = computeMaxDimension(COMPRESSED_PROFILE.targetDpi);
    expect(compressedMax).toBeLessThan(webMax);
    expect(webMax).toBeLessThan(printMax);
  });

  it('print profile yields at least 2000px (suitable for 300 DPI output)', () => {
    expect(computeMaxDimension(300)).toBeGreaterThanOrEqual(2000);
  });

  it('compressed profile yields less than 1000px (aggressively small)', () => {
    expect(computeMaxDimension(96)).toBeLessThan(1000);
  });

  it('is proportional to DPI: doubling DPI doubles the max dimension', () => {
    const d1 = computeMaxDimension(100);
    const d2 = computeMaxDimension(200);
    expect(d2).toBe(d1 * 2);
  });
});

// ---------------------------------------------------------------------------
// wrapTextIntoLines
// ---------------------------------------------------------------------------

describe('wrapTextIntoLines', () => {
  it('returns an empty array for an empty string', () => {
    expect(wrapTextIntoLines('', 400, 11)).toEqual([]);
  });

  it('returns a single line for short text', () => {
    const lines = wrapTextIntoLines('Hello world', 400, 11);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Hello world');
  });

  it('wraps long lines at word boundaries', () => {
    // With a narrow width, long text must wrap.
    const text = 'one two three four five six seven eight nine ten';
    const lines = wrapTextIntoLines(text, 100, 11);
    // All words must appear somewhere in the output.
    const joined = lines.join(' ');
    expect(joined).toContain('one');
    expect(joined).toContain('ten');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('preserves newlines as line breaks', () => {
    const text = 'line one\nline two\nline three';
    const lines = wrapTextIntoLines(text, 500, 11);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('line one');
    expect(lines[1]).toBe('line two');
    expect(lines[2]).toBe('line three');
  });

  it('preserves blank lines from double newlines', () => {
    const text = 'para one\n\npara two';
    const lines = wrapTextIntoLines(text, 500, 11);
    expect(lines).toContain('');
    expect(lines).toContain('para one');
    expect(lines).toContain('para two');
  });

  it('hard-wraps a single word longer than the available width', () => {
    // Very narrow column: one character per line would be extreme.
    // Use 5px width and font size 11 (charWidth ~= 5.72) -> ~0-1 chars per "line".
    // We want to test that hard wrapping does not crash or infinite loop.
    const longWord = 'abcdefghijklmnopqrstuvwxyz';
    const lines = wrapTextIntoLines(longWord, 30, 11);
    const rejoined = lines.join('');
    expect(rejoined).toBe(longWord);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('wider available width produces fewer lines', () => {
    const text = 'word '.repeat(20).trim();
    const narrow = wrapTextIntoLines(text, 100, 11);
    const wide = wrapTextIntoLines(text, 400, 11);
    expect(wide.length).toBeLessThan(narrow.length);
  });
});

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------

describe('sanitizeFilename', () => {
  it('returns "result.pdf" for an empty string', () => {
    expect(sanitizeFilename('')).toBe('result.pdf');
  });

  it('returns "result.pdf" for a whitespace-only string', () => {
    expect(sanitizeFilename('   ')).toBe('result.pdf');
  });

  it('appends .pdf when missing', () => {
    expect(sanitizeFilename('output')).toBe('output.pdf');
  });

  it('does not double-append .pdf', () => {
    expect(sanitizeFilename('output.pdf')).toBe('output.pdf');
  });

  it('is case-insensitive for the .pdf extension check', () => {
    expect(sanitizeFilename('REPORT.PDF')).toBe('REPORT.PDF');
  });

  it('replaces forward slashes with hyphens', () => {
    expect(sanitizeFilename('dir/file')).toBe('dir-file.pdf');
  });

  it('replaces backslashes with hyphens', () => {
    expect(sanitizeFilename('dir\\file')).toBe('dir-file.pdf');
  });

  it('strips leading and trailing whitespace', () => {
    expect(sanitizeFilename('  myfile.pdf  ')).toBe('myfile.pdf');
  });

  it('strips null bytes', () => {
    expect(sanitizeFilename('file\x00name.pdf')).toBe('filename.pdf');
  });

  it('handles a normal filename unchanged', () => {
    expect(sanitizeFilename('my-report-2024.pdf')).toBe('my-report-2024.pdf');
  });
});
