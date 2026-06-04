// Unit tests for Phase 3 store actions:
//   addDestinationItems (batch), duplicateDestinationItem, clearDestination.
// Runs in Node; no DOM required.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock URL.createObjectURL / revokeObjectURL before module load.
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock/x'),
  revokeObjectURL: vi.fn(),
});

// Dynamic import so the mock is in place when the module resolves.
const { useAppStore } = await import('../../src/state/store.ts');

function getState() {
  return useAppStore.getState();
}

function makeItem(id: string, resourceId = 'r1'): import('../../src/state/types.ts').DestinationItem {
  return { id, resourceId, kind: 'pdf-page', pageIndex: 0 };
}

beforeEach(() => {
  getState().clearResources(); // also clears destinationItems
});

// ---------------------------------------------------------------------------
// addDestinationItems (batch)
// ---------------------------------------------------------------------------
describe('addDestinationItems', () => {
  it('appends multiple items at once', () => {
    getState().addDestinationItems([makeItem('a'), makeItem('b'), makeItem('c')]);
    expect(getState().destinationItems).toHaveLength(3);
    const ids = getState().destinationItems.map((i) => i.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('appends to existing items', () => {
    getState().addDestinationItem(makeItem('x'));
    getState().addDestinationItems([makeItem('y'), makeItem('z')]);
    const ids = getState().destinationItems.map((i) => i.id);
    expect(ids).toEqual(['x', 'y', 'z']);
  });

  it('handles an empty array without changing state', () => {
    getState().addDestinationItem(makeItem('only'));
    getState().addDestinationItems([]);
    expect(getState().destinationItems).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// duplicateDestinationItem
// ---------------------------------------------------------------------------
describe('duplicateDestinationItem', () => {
  it('inserts a copy immediately after the original', () => {
    getState().addDestinationItems([makeItem('a'), makeItem('b'), makeItem('c')]);
    getState().duplicateDestinationItem('b');
    const ids = getState().destinationItems.map((i) => i.id);
    // 'b' clone appears right after 'b', before 'c'.
    expect(ids[0]).toBe('a');
    expect(ids[1]).toBe('b');
    expect(ids[3]).toBe('c');
    expect(ids).toHaveLength(4);
  });

  it('clone has a different id from the original', () => {
    getState().addDestinationItem(makeItem('orig'));
    getState().duplicateDestinationItem('orig');
    const ids = getState().destinationItems.map((i) => i.id);
    expect(ids[0]).toBe('orig');
    expect(ids[1]).not.toBe('orig');
    expect(ids[1]).toBeTruthy();
  });

  it('clone preserves all other fields from the original', () => {
    const item = { id: 'p1', resourceId: 'res-42', kind: 'pdf-page' as const, pageIndex: 7 };
    getState().addDestinationItem(item);
    getState().duplicateDestinationItem('p1');
    const clone = getState().destinationItems[1];
    expect(clone.resourceId).toBe('res-42');
    expect(clone.kind).toBe('pdf-page');
    expect(clone.pageIndex).toBe(7);
  });

  it('does nothing when id is not found', () => {
    getState().addDestinationItem(makeItem('real'));
    getState().duplicateDestinationItem('ghost');
    expect(getState().destinationItems).toHaveLength(1);
  });

  it('duplicating the last item appends at the end', () => {
    getState().addDestinationItems([makeItem('a'), makeItem('b')]);
    getState().duplicateDestinationItem('b');
    const ids = getState().destinationItems.map((i) => i.id);
    expect(ids[0]).toBe('a');
    expect(ids[1]).toBe('b');
    expect(ids).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// clearDestination
// ---------------------------------------------------------------------------
describe('clearDestination', () => {
  it('removes all destination items without affecting resources', () => {
    getState().addDestinationItems([makeItem('d1'), makeItem('d2')]);
    getState().clearDestination();
    expect(getState().destinationItems).toHaveLength(0);
  });

  it('is idempotent on an already-empty list', () => {
    getState().clearDestination();
    expect(getState().destinationItems).toHaveLength(0);
  });

  it('does not affect the resources list', () => {
    const resource = {
      id: 'r1',
      name: 'test.txt',
      sizeBytes: 10,
      data: { kind: 'text' as const, preview: 'hi' },
    };
    getState().addResource(resource);
    getState().addDestinationItem(makeItem('d1'));
    getState().clearDestination();
    expect(getState().destinationItems).toHaveLength(0);
    expect(getState().resources).toHaveLength(1);
  });
});
