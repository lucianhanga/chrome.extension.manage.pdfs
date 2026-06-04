// PageGrid: expandable grid of PDF page thumbnails with multi-select.
//
// Selection model:
//   - Plain click        -> select only that tile (deselect others)
//   - Ctrl/Cmd-click     -> toggle tile in/out of selection
//   - Shift-click        -> extend range from last selected tile
//   - "Select all" link  -> select all pages
//   - "Clear" link       -> deselect all
//
// Thumbnails are rendered lazily: the grid generates them on first expansion,
// one page at a time, reusing already-rendered URLs stored in the resource's
// thumbnailUrls array (populated during ingestion for the first page, then
// expanded here for remaining pages on demand).
//
// Phase 3: page tiles are @dnd-kit drag sources.
//   - Dragging a tile that IS in the current selection drags all selected pages.
//   - Dragging an unselected tile drags only that page.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { PdfResourceData } from '../../state/types.ts';
import { useAppStore } from '../../state/store.ts';
import { computeSelection, selectAll, clearSelection } from '../../pdf/page-selection.ts';
import { getPageThumbnail } from '../../pdf/render.ts';
import { buildPdfDragPayload } from '../../shared/drag-types.ts';
import type { DraggableData } from '../../shared/drag-types.ts';
import type { PDFDocumentProxy } from 'pdfjs-dist';

/** Width in pixels for grid thumbnail tiles. */
const GRID_THUMB_WIDTH = 120;

interface PageGridProps {
  resourceId: string;
  data: PdfResourceData;
  /** Pass the open PDFDocumentProxy so thumbnails can be rendered on demand. */
  pdfDoc: PDFDocumentProxy | null;
  onOpenLightbox: (pageIndex: number) => void;
}

// Stable empty set — shared across all renders to avoid recreating a new object.
const EMPTY_SELECTION = new Set<number>();

export function PageGrid({ resourceId, data, pdfDoc, onOpenLightbox }: PageGridProps) {
  const { pageSelections, setPageSelection } = useAppStore();
  const selection: Set<number> = useMemo(
    () => pageSelections[resourceId] ?? EMPTY_SELECTION,
    [pageSelections, resourceId],
  );

  // Track locally which thumbnail URLs are ready at grid-thumb resolution.
  // We start with the ingestion thumbnails array and fill missing entries lazily.
  const [gridUrls, setGridUrls] = useState<string[]>(() => [...data.thumbnailUrls]);
  const [renderingPages, setRenderingPages] = useState<Set<number>>(new Set());
  // Track the last tile clicked (for shift-range selection).
  const lastSelectedRef = useRef<number | null>(null);

  // When the grid mounts (or pdfDoc becomes available), render any missing thumbnails.
  useEffect(() => {
    if (!pdfDoc) return;

    let cancelled = false;

    const renderMissing = async () => {
      for (let i = 0; i < data.pageCount; i++) {
        if (cancelled) break;
        // Ingestion already rendered page 0..n-1 at THUMBNAIL_WIDTH (200px).
        // Grid uses GRID_THUMB_WIDTH (120px) — the ingestion thumbnail is larger,
        // so we can reuse it directly. Skip if already present.
        if (gridUrls[i]) continue;

        setRenderingPages((prev) => new Set(prev).add(i));
        try {
          const blob = await getPageThumbnail(pdfDoc, i + 1, GRID_THUMB_WIDTH);
          if (cancelled) break;
          const url = URL.createObjectURL(blob);
          setGridUrls((prev) => {
            const next = [...prev];
            next[i] = url;
            return next;
          });
        } catch {
          // Silently skip failed pages — the tile will show a fallback.
        } finally {
          if (!cancelled) {
            setRenderingPages((prev) => {
              const next = new Set(prev);
              next.delete(i);
              return next;
            });
          }
        }
      }
    };

    void renderMissing();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, data.pageCount]);

  // Revoke grid-generated URLs on unmount (only URLs we created here, not
  // the ingestion URLs which are tracked in objectUrl.ts).
  useEffect(() => {
    return () => {
      for (let i = 0; i < gridUrls.length; i++) {
        const url = gridUrls[i];
        // Ingestion URLs start with blob: and are tracked in the global tracker —
        // we must not revoke them here (store.removeResource handles those).
        // URLs created inside this component via URL.createObjectURL (for pages
        // that were missing from ingestion) are not in the global tracker, so
        // we revoke them locally. Distinguishing them: ingestion URLs are in
        // data.thumbnailUrls; any url NOT in that array was created by this grid.
        if (url && !data.thumbnailUrls.includes(url)) {
          URL.revokeObjectURL(url);
        }
      }
    };
    // Run only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTileClick = useCallback(
    (pageIndex: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = computeSelection(selection, pageIndex, data.pageCount, {
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        lastSelected: lastSelectedRef.current,
      });
      lastSelectedRef.current = pageIndex;
      setPageSelection(resourceId, next);
    },
    [selection, data.pageCount, resourceId, setPageSelection],
  );

  const handleSelectAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setPageSelection(resourceId, selectAll(data.pageCount));
      lastSelectedRef.current = data.pageCount - 1;
    },
    [resourceId, data.pageCount, setPageSelection],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setPageSelection(resourceId, clearSelection());
      lastSelectedRef.current = null;
    },
    [resourceId, setPageSelection],
  );

  const handleOpenLightbox = useCallback(
    (pageIndex: number, e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenLightbox(pageIndex);
    },
    [onOpenLightbox],
  );

  const selectionCount = selection.size;

  return (
    <div className="mt-2 border-t border-gray-800 pt-2" onClick={(e) => e.stopPropagation()}>
      {/* Grid controls row */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-xs text-gray-500">
          {data.pageCount} {data.pageCount === 1 ? 'page' : 'pages'}
          {selectionCount > 0 && (
            <span className="ml-1 text-blue-400 font-medium">
              &mdash; {selectionCount} selected
            </span>
          )}
        </span>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            Select all
          </button>
          {selectionCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Thumbnail grid */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}
        role="list"
        aria-label={`Pages for this PDF`}
        aria-multiselectable="true"
      >
        {Array.from({ length: data.pageCount }, (_, i) => (
          <PageTile
            key={i}
            pageIndex={i}
            url={gridUrls[i] ?? ''}
            isRendering={renderingPages.has(i)}
            isSelected={selection.has(i)}
            resourceId={resourceId}
            selection={selection}
            onClick={handleTileClick}
            onOpenLightbox={handleOpenLightbox}
          />
        ))}
      </div>
    </div>
  );
}

// --- PageTile ---

interface PageTileProps {
  pageIndex: number;
  url: string;
  isRendering: boolean;
  isSelected: boolean;
  resourceId: string;
  /** Current selection set — used to determine multi-select drag payload. */
  selection: Set<number>;
  onClick: (pageIndex: number, e: React.MouseEvent) => void;
  onOpenLightbox: (pageIndex: number, e: React.MouseEvent) => void;
}

function PageTile({
  pageIndex,
  url,
  isRendering,
  isSelected,
  resourceId,
  selection,
  onClick,
  onOpenLightbox,
}: PageTileProps) {
  // Phase 3: attach @dnd-kit drag source.
  // The drag payload is determined at drag-start time (via attributes/listeners).
  const draggableData: DraggableData = {
    payload: buildPdfDragPayload(resourceId, pageIndex, selection),
  };

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `page-tile-${resourceId}-${pageIndex}`,
    data: draggableData,
  });

  return (
    <div
      ref={setNodeRef}
      aria-selected={isSelected}
      aria-label={`Page ${pageIndex + 1}`}
      className={[
        'relative group cursor-grab active:cursor-grabbing rounded overflow-hidden border transition-all select-none',
        isDragging ? 'opacity-40 border-blue-400' : '',
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/40'
          : 'border-gray-700 hover:border-gray-500',
      ].join(' ')}
      style={{ aspectRatio: '0.707' }} // A4-ish portrait
      onClick={(e) => onClick(pageIndex, e)}
      data-resource-id={resourceId}
      data-page-index={pageIndex}
      {...attributes}
      {...listeners}
    >
      {/* Thumbnail image */}
      {url ? (
        <img
          src={url}
          alt={`Page ${pageIndex + 1}`}
          className="w-full h-full object-contain bg-gray-800"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          {isRendering ? (
            <div className="w-3 h-3 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25"
              />
            </svg>
          )}
        </div>
      )}

      {/* Selection check badge */}
      {isSelected && (
        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shadow">
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Page number label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-0.5">
        <span className="text-xs text-gray-300">{pageIndex + 1}</span>
      </div>

      {/* Zoom/expand icon — clicking opens the lightbox */}
      <button
        type="button"
        aria-label={`Open page ${pageIndex + 1} in lightbox`}
        className="absolute top-1 right-1 p-0.5 rounded bg-black/50 text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        onClick={(e) => onOpenLightbox(pageIndex, e)}
        // Stop drag listeners from triggering on the icon click.
        onPointerDown={(e) => e.stopPropagation()}
      >
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>
    </div>
  );
}
