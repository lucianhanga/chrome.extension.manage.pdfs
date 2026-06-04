// Unit tests for pure page-selection logic.

import { describe, it, expect } from 'vitest';
import {
  computeSelection,
  selectAll,
  clearSelection,
  isValidPageIndex,
} from '../../src/pdf/page-selection.ts';

// Helper to call computeSelection without modifier keys (plain click).
function plainClick(current: ReadonlySet<number>, clicked: number, total: number): Set<number> {
  return computeSelection(current, clicked, total, { ctrl: false, shift: false, lastSelected: null });
}

// Helper: ctrl/cmd click.
function ctrlClick(
  current: ReadonlySet<number>,
  clicked: number,
  total: number,
  lastSelected: number | null = null,
): Set<number> {
  return computeSelection(current, clicked, total, { ctrl: true, shift: false, lastSelected });
}

// Helper: shift click.
function shiftClick(
  current: ReadonlySet<number>,
  clicked: number,
  total: number,
  lastSelected: number | null,
): Set<number> {
  return computeSelection(current, clicked, total, { ctrl: false, shift: true, lastSelected });
}

describe('computeSelection — plain click', () => {
  it('selects the clicked page and deselects others', () => {
    const result = plainClick(new Set([0, 2, 5]), 3, 10);
    expect(result).toEqual(new Set([3]));
  });

  it('selects a single page when nothing was selected', () => {
    const result = plainClick(new Set(), 0, 5);
    expect(result).toEqual(new Set([0]));
  });

  it('re-selecting the only selected page keeps it selected', () => {
    const result = plainClick(new Set([2]), 2, 5);
    expect(result).toEqual(new Set([2]));
  });
});

describe('computeSelection — ctrl/cmd click (toggle)', () => {
  it('adds an unselected page to the selection', () => {
    const result = ctrlClick(new Set([0, 1]), 3, 10);
    expect(result).toEqual(new Set([0, 1, 3]));
  });

  it('removes an already-selected page from the selection', () => {
    const result = ctrlClick(new Set([0, 1, 3]), 1, 10);
    expect(result).toEqual(new Set([0, 3]));
  });

  it('toggles into an empty selection', () => {
    const result = ctrlClick(new Set(), 5, 10);
    expect(result).toEqual(new Set([5]));
  });

  it('removing the last selected page leaves an empty selection', () => {
    const result = ctrlClick(new Set([2]), 2, 5);
    expect(result).toEqual(new Set());
  });
});

describe('computeSelection — shift click (range)', () => {
  it('selects a forward range from lastSelected to clicked', () => {
    const result = shiftClick(new Set(), 4, 10, 1);
    expect(result).toEqual(new Set([1, 2, 3, 4]));
  });

  it('selects a backward range (clicked < lastSelected)', () => {
    const result = shiftClick(new Set(), 1, 10, 5);
    expect(result).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('merges range with existing selection', () => {
    const result = shiftClick(new Set([7, 8]), 4, 10, 2);
    expect(result).toEqual(new Set([2, 3, 4, 7, 8]));
  });

  it('single-item range when lastSelected === clicked', () => {
    const result = shiftClick(new Set(), 3, 10, 3);
    expect(result).toEqual(new Set([3]));
  });

  it('falls back to plain-click behavior when lastSelected is null', () => {
    // shift + null lastSelected -> plain single-select
    const result = computeSelection(new Set([0, 2]), 4, 10, {
      ctrl: false,
      shift: true,
      lastSelected: null,
    });
    expect(result).toEqual(new Set([4]));
  });
});

describe('selectAll', () => {
  it('creates a set containing 0..totalPages-1', () => {
    const result = selectAll(5);
    expect(result).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('returns empty set for 0 pages', () => {
    expect(selectAll(0)).toEqual(new Set());
  });

  it('works for a single page', () => {
    expect(selectAll(1)).toEqual(new Set([0]));
  });
});

describe('clearSelection', () => {
  it('returns an empty set', () => {
    expect(clearSelection()).toEqual(new Set());
  });
});

describe('isValidPageIndex', () => {
  it('accepts valid indices', () => {
    expect(isValidPageIndex(0, 5)).toBe(true);
    expect(isValidPageIndex(4, 5)).toBe(true);
  });

  it('rejects out-of-range indices', () => {
    expect(isValidPageIndex(-1, 5)).toBe(false);
    expect(isValidPageIndex(5, 5)).toBe(false);
  });

  it('rejects non-integer indices', () => {
    expect(isValidPageIndex(1.5, 5)).toBe(false);
    expect(isValidPageIndex(NaN, 5)).toBe(false);
  });

  it('rejects any index when totalPages is 0', () => {
    expect(isValidPageIndex(0, 0)).toBe(false);
  });
});
