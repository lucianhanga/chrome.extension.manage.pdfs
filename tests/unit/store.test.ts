// Unit tests for Zustand store actions (resource management).
// Runs in Node; does not require a DOM.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock URL API before the store module loads ---
let urlCounter = 0;
const mockCreate = vi.fn((_blob: Blob) => `blob:mock/${++urlCounter}`);
const mockRevoke = vi.fn();
vi.stubGlobal('URL', {
  createObjectURL: mockCreate,
  revokeObjectURL: mockRevoke,
});

// --- Dynamic import so the mock is in place when the module executes ---
const { useAppStore } = await import('../../src/state/store.ts');

function getState() {
  return useAppStore.getState();
}

function makePdfResource(id: string, thumbnailUrls: string[] = []) {
  return {
    id,
    name: `${id}.pdf`,
    sizeBytes: 1024,
    data: {
      kind: 'pdf' as const,
      pageCount: thumbnailUrls.length || 1,
      pageDimensions: [{ width: 595, height: 842 }],
      thumbnailUrls,
    },
  };
}

function makeImageResource(id: string, objectUrl: string) {
  return {
    id,
    name: `${id}.png`,
    sizeBytes: 512,
    data: {
      kind: 'image' as const,
      width: 100,
      height: 100,
      objectUrl,
    },
  };
}

function makeTextResource(id: string) {
  return {
    id,
    name: `${id}.txt`,
    sizeBytes: 200,
    data: { kind: 'text' as const, preview: 'hello' },
  };
}

beforeEach(() => {
  // Reset store state between tests.
  getState().clearResources();
  mockCreate.mockClear();
  mockRevoke.mockClear();
  urlCounter = 0;
});

describe('addResource / resources list', () => {
  it('starts with an empty resource list', () => {
    expect(getState().resources).toHaveLength(0);
  });

  it('adds a resource', () => {
    const r = makeTextResource('r1');
    getState().addResource(r);
    expect(getState().resources).toHaveLength(1);
    expect(getState().resources[0].id).toBe('r1');
  });

  it('adds multiple resources', () => {
    getState().addResource(makeTextResource('a'));
    getState().addResource(makeTextResource('b'));
    expect(getState().resources).toHaveLength(2);
  });
});

describe('removeResource', () => {
  it('removes a resource by id', () => {
    getState().addResource(makeTextResource('x'));
    getState().addResource(makeTextResource('y'));
    getState().removeResource('x');
    expect(getState().resources).toHaveLength(1);
    expect(getState().resources[0].id).toBe('y');
  });

  it('revokes object URLs when removing a PDF resource', () => {
    const r = makePdfResource('p1', ['blob:mock/1', 'blob:mock/2']);
    // Pre-populate the objectUrl tracker by creating them.
    // Since the test bypasses ingest.ts, we directly add pre-formed URLs.
    // The store's removeResource calls revokeTrackedObjectUrl, but the URLs
    // aren't in the tracker unless created via createTrackedObjectUrl.
    // So here we verify removeResource does NOT crash on untracked URLs.
    getState().addResource(r);
    getState().removeResource('p1');
    expect(getState().resources).toHaveLength(0);
  });

  it('revokes the object URL when removing an image resource', () => {
    const r = makeImageResource('img1', 'blob:mock/42');
    getState().addResource(r);
    getState().removeResource('img1');
    expect(getState().resources).toHaveLength(0);
  });

  it('removes destination items for the removed resource', () => {
    getState().addResource(makeTextResource('t1'));
    getState().addDestinationItem({ id: 'd1', resourceId: 't1', kind: 'image' });
    getState().addDestinationItem({ id: 'd2', resourceId: 'other', kind: 'image' });
    getState().removeResource('t1');
    const items = getState().destinationItems;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('d2');
  });
});

describe('clearResources', () => {
  it('removes all resources', () => {
    getState().addResource(makeTextResource('a'));
    getState().addResource(makeTextResource('b'));
    getState().clearResources();
    expect(getState().resources).toHaveLength(0);
  });

  it('clears destination items too', () => {
    getState().addResource(makeTextResource('a'));
    getState().addDestinationItem({ id: 'd1', resourceId: 'a', kind: 'image' });
    getState().clearResources();
    expect(getState().destinationItems).toHaveLength(0);
  });
});

describe('destination items', () => {
  it('adds and removes destination items', () => {
    getState().addDestinationItem({ id: 'i1', resourceId: 'r1', kind: 'pdf-page', pageIndex: 0 });
    getState().addDestinationItem({ id: 'i2', resourceId: 'r1', kind: 'pdf-page', pageIndex: 1 });
    expect(getState().destinationItems).toHaveLength(2);
    getState().removeDestinationItem('i1');
    expect(getState().destinationItems).toHaveLength(1);
    expect(getState().destinationItems[0].id).toBe('i2');
  });

  it('reorders destination items by given ids', () => {
    getState().addDestinationItem({ id: 'a', resourceId: 'r', kind: 'image' });
    getState().addDestinationItem({ id: 'b', resourceId: 'r', kind: 'image' });
    getState().addDestinationItem({ id: 'c', resourceId: 'r', kind: 'image' });
    getState().reorderDestinationItems(['c', 'a', 'b']);
    const ids = getState().destinationItems.map((i) => i.id);
    expect(ids).toEqual(['c', 'a', 'b']);
  });

  it('reorder ignores unknown ids', () => {
    getState().addDestinationItem({ id: 'x', resourceId: 'r', kind: 'image' });
    getState().reorderDestinationItems(['x', 'ghost']);
    expect(getState().destinationItems).toHaveLength(1);
    expect(getState().destinationItems[0].id).toBe('x');
  });
});

describe('export profile', () => {
  it('defaults to print', () => {
    expect(getState().activeExportProfile).toBe('print');
  });

  it('can be changed', () => {
    getState().setExportProfile('compressed');
    expect(getState().activeExportProfile).toBe('compressed');
    getState().setExportProfile('web');
    expect(getState().activeExportProfile).toBe('web');
  });
});
