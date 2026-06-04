// Typed drag-and-drop payload contracts for @dnd-kit.
// Used by both source drag sources and the destination drop target.

/**
 * Payload carried by a draggable PDF page tile.
 * When the dragged tile is part of a multi-selection, `pages` contains
 * all selected pages of that resource in ascending order.
 * A plain single-tile drag (tile not in selection) produces a single entry.
 */
export interface PdfPageDragPayload {
  kind: 'pdf-pages';
  /** Pages to drop — at least one entry. Each entry is { resourceId, pageIndex }. */
  pages: Array<{ resourceId: string; pageIndex: number }>;
}

/**
 * Payload carried by a draggable image resource card.
 */
export interface ImageDragPayload {
  kind: 'image';
  resourceId: string;
}

/**
 * Payload carried by a draggable text resource card.
 * The text becomes a rendered PDF page at export time (Phase 4).
 */
export interface TextDragPayload {
  kind: 'text';
  resourceId: string;
}

export type DragPayload = PdfPageDragPayload | ImageDragPayload | TextDragPayload;

/** @dnd-kit DraggableData shape — stored in `active.data.current`. */
export interface DraggableData {
  payload: DragPayload;
}

/**
 * Build the drag payload for a PDF page tile click.
 *
 * If the dragged tile is part of the current selection (selection.has(pageIndex)),
 * the payload includes ALL currently-selected pages of that resource, sorted ascending.
 * Otherwise, the payload contains only the dragged tile's page.
 *
 * @param resourceId  - id of the source PDF resource
 * @param pageIndex   - 0-based index of the tile being dragged
 * @param selection   - current multi-select set for this resource (may be empty)
 */
export function buildPdfDragPayload(
  resourceId: string,
  pageIndex: number,
  selection: Set<number>,
): PdfPageDragPayload {
  if (selection.size > 0 && selection.has(pageIndex)) {
    // Multi-select drag: include all selected pages in order.
    const pages = Array.from(selection)
      .sort((a, b) => a - b)
      .map((idx) => ({ resourceId, pageIndex: idx }));
    return { kind: 'pdf-pages', pages };
  }
  // Single-tile drag.
  return { kind: 'pdf-pages', pages: [{ resourceId, pageIndex }] };
}

/**
 * Build the drag payload for an image resource.
 */
export function buildImageDragPayload(resourceId: string): ImageDragPayload {
  return { kind: 'image', resourceId };
}

/**
 * Build the drag payload for a text resource.
 */
export function buildTextDragPayload(resourceId: string): TextDragPayload {
  return { kind: 'text', resourceId };
}
