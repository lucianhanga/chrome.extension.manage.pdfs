// Two-pane layout shell for PDF Manager.
// Phase 3: outer DndContext handles source -> destination drops.
// The inner DndContext inside DestinationPane handles within-destination reordering.

import { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { SourcePane } from '../features/source/SourcePane.tsx';
import { DestinationPane } from '../features/destination/DestinationPane.tsx';
import { useAppStore } from '../state/store.ts';
import type { DestinationItem } from '../state/types.ts';
import type { DragPayload, DraggableData } from '../shared/drag-types.ts';

// ID used to identify the destination drop zone in collision detection.
export const DESTINATION_DROP_ID = 'destination-pane-drop-zone';

export function App() {
  const addDestinationItems = useAppStore((s) => s.addDestinationItems);
  const [activeDragPayload, setActiveDragPayload] = useState<DragPayload | null>(null);
  // Track whether the drag was over the destination zone at the moment it ended.
  const isOverDestinationRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DraggableData | undefined;
    setActiveDragPayload(data?.payload ?? null);
    isOverDestinationRef.current = false;
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;
      const data = event.active.data.current as DraggableData | undefined;
      setActiveDragPayload(null);

      if (!over || !data) return;

      // Accept drop only when the target is the destination zone.
      if (String(over.id) !== DESTINATION_DROP_ID) return;

      const payload = data.payload;

      if (payload.kind === 'pdf-pages') {
        const items: DestinationItem[] = payload.pages.map((p) => ({
          id: crypto.randomUUID(),
          resourceId: p.resourceId,
          kind: 'pdf-page',
          pageIndex: p.pageIndex,
        }));
        addDestinationItems(items);
      } else if (payload.kind === 'image') {
        const item: DestinationItem = {
          id: crypto.randomUUID(),
          resourceId: payload.resourceId,
          kind: 'image',
        };
        addDestinationItems([item]);
      }
    },
    [addDestinationItems],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragPayload(null);
  }, []);

  const dragCount =
    activeDragPayload?.kind === 'pdf-pages'
      ? activeDragPayload.pages.length
      : activeDragPayload?.kind === 'image'
        ? 1
        : 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100 font-sans">
        {/* Header bar */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 z-10">
          <span className="text-blue-400 font-semibold tracking-wide text-sm">PDF Manager</span>
          <span className="ml-3 text-gray-500 text-xs">
            Client-side only &mdash; files never leave your browser
          </span>
        </div>

        {/* Main two-pane area, offset by header height */}
        <div className="flex w-full mt-12 overflow-hidden">
          {/* Left pane: Source / Resources */}
          <SourcePane />

          {/* Resizer divider (visual only in Phase 3) */}
          <div className="w-px bg-gray-800 flex-shrink-0" />

          {/* Right pane: Result / Destination PDF */}
          <DestinationPane />
        </div>
      </div>

      {/* Global drag overlay: shows drag count badge while dragging from source */}
      <DragOverlay dropAnimation={null}>
        {activeDragPayload ? (
          <DragCountOverlay count={dragCount} kind={activeDragPayload.kind} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// --- Drag overlay badge shown while dragging from source ---

interface DragCountOverlayProps {
  count: number;
  kind: DragPayload['kind'];
}

function DragCountOverlay({ count, kind }: DragCountOverlayProps) {
  const label =
    kind === 'image'
      ? 'image'
      : count === 1
        ? '1 page'
        : `${count} pages`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-xl opacity-90 pointer-events-none select-none">
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {label}
    </div>
  );
}
