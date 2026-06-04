// Pure functions for multi-select page-grid interaction logic.
// Supports: plain click (single-select), Ctrl/Cmd-click (toggle), Shift-click (range).
// These are intentionally side-effect-free so they can be unit-tested without a DOM.

/** Compute the next selection set given a click interaction. */
export function computeSelection(
  current: ReadonlySet<number>,
  clicked: number,
  _totalPages: number,
  opts: {
    ctrl: boolean;
    shift: boolean;
    lastSelected: number | null;
  },
): Set<number> {
  const { ctrl, shift, lastSelected } = opts;

  if (shift && lastSelected !== null) {
    // Range from lastSelected to clicked (inclusive), merged with existing.
    const lo = Math.min(lastSelected, clicked);
    const hi = Math.max(lastSelected, clicked);
    const next = new Set(current);
    for (let i = lo; i <= hi; i++) {
      next.add(i);
    }
    return next;
  }

  if (ctrl) {
    // Toggle the clicked page.
    const next = new Set(current);
    if (next.has(clicked)) {
      next.delete(clicked);
    } else {
      next.add(clicked);
    }
    return next;
  }

  // Plain click: select only this page (deselect all others).
  return new Set([clicked]);
}

/** Select all pages 0..totalPages-1. */
export function selectAll(totalPages: number): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < totalPages; i++) s.add(i);
  return s;
}

/** Empty selection set. */
export function clearSelection(): Set<number> {
  return new Set();
}

/** Validate that a page index is in range [0, totalPages). */
export function isValidPageIndex(index: number, totalPages: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < totalPages;
}
