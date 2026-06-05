// DestinationPane: the right pane — sorted destination item list + live preview.
//
// Receives dropped items from the source pane (via @dnd-kit DragOverlay in App.tsx),
// renders them in an ordered, sortable grid, and supports reorder-by-drag,
// remove, duplicate, and clear operations.
//
// The sortable context here uses a separate DndContext so that:
//   1. The outer DndContext in App.tsx handles source -> destination drops.
//   2. The inner DndContext here handles reordering within the destination list.
// Nesting DndContexts is the recommended @dnd-kit pattern for this use case.
//
// Phase 4: Export button runs the full assembly + download pipeline.

import { useCallback, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../state/store.ts';
import type { DestinationItem, ExportProfile, Resource } from '../../state/types.ts';
import { DestinationThumbnail } from './DestinationThumbnail.tsx';
import { DESTINATION_DROP_ID } from '../../app/App.tsx';
import { assemblePdf, downloadPdf } from '../../pdf/assemble.ts';
import { PRINT_PROFILE, WEB_PROFILE, COMPRESSED_PROFILE } from '../../pdf/profiles.ts';
import type { ExportProfileParams } from '../../pdf/profiles.ts';

// Map profile name to its parameter table.
function getProfileParams(profile: ExportProfile): ExportProfileParams {
  if (profile === 'web') return WEB_PROFILE;
  if (profile === 'compressed') return COMPRESSED_PROFILE;
  return PRINT_PROFILE;
}

// --- Main component ---

export function DestinationPane() {
  const {
    destinationItems,
    resources,
    activeExportProfile,
    reorderDestinationItems,
    removeDestinationItem,
    duplicateDestinationItem,
    clearDestination,
    setExportProfile,
  } = useAppStore();

  const [activeSortId, setActiveSortId] = useState<string | null>(null);

  // Export state.
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (destinationItems.length === 0 || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    try {
      const resourceMap = new Map<string, Resource>(resources.map((r) => [r.id, r]));
      const params = getProfileParams(activeExportProfile);

      const pdfBytes = await assemblePdf(destinationItems, resourceMap, params, {
        onProgress: (fraction) => setExportProgress(fraction),
      });

      downloadPdf(pdfBytes, 'result.pdf');
    } catch (err) {
      setExportError(String(err));
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [destinationItems, resources, activeExportProfile, isExporting]);

  // Register this pane as a drop target for source -> destination drags.
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: DESTINATION_DROP_ID,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveSortId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // No-op: closestCenter strategy handles position visually.
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveSortId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = destinationItems.map((i) => i.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(ids, oldIndex, newIndex);
      reorderDestinationItems(reordered);
    },
    [destinationItems, reorderDestinationItems],
  );

  const activeSortItem = activeSortId
    ? destinationItems.find((i) => i.id === activeSortId)
    : null;

  const profileLabels: Record<ExportProfile, string> = {
    print: 'Optimized for printing',
    web: 'Optimized for web sharing',
    compressed: 'Compressed',
  };

  return (
    <div className="flex flex-col w-1/2 overflow-hidden">
      {/* Pane header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Result / Destination PDF
          </h2>
          {destinationItems.length > 0 && (
            <span className="text-xs text-gray-600 tabular-nums">
              {destinationItems.length} {destinationItems.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {destinationItems.length > 0 && !isExporting && (
            <button
              type="button"
              onClick={clearDestination}
              className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-0.5 rounded hover:bg-gray-800"
            >
              Clear all
            </button>
          )}
          <select
            value={activeExportProfile}
            onChange={(e) => setExportProfile(e.target.value as ExportProfile)}
            disabled={isExporting}
            className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(Object.keys(profileLabels) as ExportProfile[]).map((p) => (
              <option key={p} value={p}>
                {profileLabels[p]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={destinationItems.length === 0 || isExporting}
            className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors min-w-[80px] text-center"
            aria-busy={isExporting}
          >
            {isExporting
              ? exportProgress > 0
                ? `${Math.round(exportProgress * 100)}%`
                : 'Exporting...'
              : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Scrollable body — also the outer drop target for source drags */}
      <div
        ref={setDropRef}
        className={[
          'flex-1 overflow-y-auto transition-colors',
          isDropOver ? 'bg-blue-900/10 outline outline-2 outline-blue-500/40 outline-offset-[-2px]' : '',
        ].join(' ')}
      >
        {destinationItems.length === 0 ? (
          <EmptyState isOver={isDropOver} />
        ) : (
          // Separate DndContext for in-destination reordering.
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={destinationItems.map((i) => i.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className="grid gap-2 p-3"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}
                role="list"
                aria-label="Destination items — drag to reorder"
              >
                {destinationItems.map((item, index) => (
                  <SortableDestinationCard
                    key={item.id}
                    item={item}
                    index={index}
                    onRemove={removeDestinationItem}
                    onDuplicate={duplicateDestinationItem}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Drag overlay — rendered in the DndContext portal layer */}
            <DragOverlay>
              {activeSortItem ? (
                <SortableOverlayCard item={activeSortItem} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Status bar */}
      {destinationItems.length > 0 && (
        <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 flex-shrink-0">
          {exportError ? (
            <p className="text-xs text-red-400">
              Export failed: {exportError}
            </p>
          ) : isExporting ? (
            <p className="text-xs text-yellow-400">
              Assembling PDF... {exportProgress > 0 ? `${Math.round(exportProgress * 100)}%` : ''}
            </p>
          ) : (
            <p className="text-xs text-gray-600">
              {destinationItems.length} {destinationItems.length === 1 ? 'item' : 'items'} in destination order &mdash; drag to reorder
              {activeExportProfile === 'compressed' && ' — Compressed profile rasterizes PDF pages (text becomes image)'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- Empty state ---

interface EmptyStateProps {
  isOver: boolean;
}

function EmptyState({ isOver }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div
        className={[
          'w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors',
          isOver ? 'bg-blue-700' : 'bg-gray-800',
        ].join(' ')}
      >
        <svg
          className={['w-6 h-6 transition-colors', isOver ? 'text-blue-200' : 'text-gray-600'].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>
      <p className={['text-sm transition-colors', isOver ? 'text-blue-300' : 'text-gray-500'].join(' ')}>
        {isOver ? 'Release to add to destination' : 'No pages assembled yet'}
      </p>
      <p className="text-xs text-gray-700 mt-2 max-w-xs leading-relaxed">
        Drag PDF page tiles, images, or text resources from the Source pane into
        this area. For multi-page PDFs, multi-select pages first (Ctrl/Cmd-click
        or Shift-click), then drag any selected tile to drop the whole selection.
      </p>
    </div>
  );
}

// --- Sortable item card ---

interface SortableDestinationCardProps {
  item: DestinationItem;
  index: number;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function SortableDestinationCard({
  item,
  index,
  onRemove,
  onDuplicate,
}: SortableDestinationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      aria-label={`Destination item ${index + 1}`}
      className="group relative rounded overflow-hidden border border-gray-700 bg-gray-900 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* Thumbnail */}
      <div style={{ aspectRatio: item.kind === 'image' ? '1' : '0.707' }}>
        <DestinationThumbnail
          resourceId={item.resourceId}
          kind={item.kind}
          pageIndex={item.pageIndex}
          className="w-full h-full"
        />
      </div>

      {/* Position badge */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-0.5">
        <span className="text-xs text-gray-300 tabular-nums">{index + 1}</span>
      </div>

      {/* Action buttons — visible on hover */}
      <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {/* Duplicate */}
        <button
          type="button"
          aria-label="Duplicate item"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(item.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-0.5 rounded bg-black/60 text-gray-300 hover:text-white hover:bg-blue-600/80 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Remove */}
        <button
          type="button"
          aria-label="Remove item"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-0.5 rounded bg-black/60 text-gray-300 hover:text-white hover:bg-red-600/80 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// --- Drag overlay card (mirrors the dragged card visually) ---

interface SortableOverlayCardProps {
  item: DestinationItem;
}

function SortableOverlayCard({ item }: SortableOverlayCardProps) {
  return (
    <div
      className="rounded overflow-hidden border-2 border-blue-400 bg-gray-900 shadow-2xl rotate-2 opacity-90"
      style={{ width: '96px' }}
    >
      <div style={{ aspectRatio: item.kind === 'image' ? '1' : '0.707' }}>
        <DestinationThumbnail
          resourceId={item.resourceId}
          kind={item.kind}
          pageIndex={item.pageIndex}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
