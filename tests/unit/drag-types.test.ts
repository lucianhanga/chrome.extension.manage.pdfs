// Unit tests for drag payload builder functions.
// These are pure functions — no DOM or browser APIs needed.

import { describe, it, expect } from 'vitest';
import {
  buildPdfDragPayload,
  buildImageDragPayload,
  buildTextDragPayload,
} from '../../src/shared/drag-types.ts';

describe('buildPdfDragPayload', () => {
  it('creates a single-page payload when selection is empty', () => {
    const payload = buildPdfDragPayload('r1', 2, new Set());
    expect(payload.kind).toBe('pdf-pages');
    expect(payload.pages).toHaveLength(1);
    expect(payload.pages[0]).toEqual({ resourceId: 'r1', pageIndex: 2 });
  });

  it('creates a single-page payload when dragged tile is NOT in the selection', () => {
    const selection = new Set([0, 1]); // tiles 0 and 1 are selected, but tile 3 is dragged
    const payload = buildPdfDragPayload('r1', 3, selection);
    expect(payload.pages).toHaveLength(1);
    expect(payload.pages[0]).toEqual({ resourceId: 'r1', pageIndex: 3 });
  });

  it('creates a multi-page payload when dragged tile IS in the selection', () => {
    const selection = new Set([0, 2, 4]);
    const payload = buildPdfDragPayload('r1', 2, selection);
    expect(payload.kind).toBe('pdf-pages');
    expect(payload.pages).toHaveLength(3);
  });

  it('sorts multi-page payload pages in ascending order', () => {
    const selection = new Set([4, 0, 2]); // insertion order is arbitrary
    const payload = buildPdfDragPayload('r1', 4, selection);
    const indices = payload.pages.map((p) => p.pageIndex);
    expect(indices).toEqual([0, 2, 4]);
  });

  it('includes correct resourceId in every entry of a multi-page payload', () => {
    const selection = new Set([1, 3]);
    const payload = buildPdfDragPayload('res-abc', 1, selection);
    for (const p of payload.pages) {
      expect(p.resourceId).toBe('res-abc');
    }
  });

  it('single-page drag with non-empty selection (tile not in set)', () => {
    const selection = new Set([5, 6, 7]);
    const payload = buildPdfDragPayload('r2', 0, selection);
    expect(payload.pages).toHaveLength(1);
    expect(payload.pages[0].pageIndex).toBe(0);
  });
});

describe('buildImageDragPayload', () => {
  it('creates an image payload with the correct resourceId', () => {
    const payload = buildImageDragPayload('img-42');
    expect(payload.kind).toBe('image');
    expect(payload.resourceId).toBe('img-42');
  });
});

describe('buildTextDragPayload', () => {
  it('creates a text payload with the correct resourceId', () => {
    const payload = buildTextDragPayload('txt-7');
    expect(payload.kind).toBe('text');
    expect(payload.resourceId).toBe('txt-7');
  });
});
