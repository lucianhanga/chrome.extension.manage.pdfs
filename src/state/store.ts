// Zustand store for PDF Manager.
// Holds in-memory resources, destination assembly items, and per-PDF page selections.

import { create } from 'zustand';
import type { Resource, DestinationItem, ExportProfile } from './types.ts';
import { revokeTrackedObjectUrl } from '../shared/objectUrl.ts';

function revokeResourceUrls(resource: Resource): void {
  if (resource.data.kind === 'pdf') {
    for (const url of resource.data.thumbnailUrls) {
      revokeTrackedObjectUrl(url);
    }
    // Clean up the PDFDocumentProxy to free memory.
    const doc = resource.data.pdfDoc as { cleanup?: () => void; destroy?: () => void } | null;
    if (doc) {
      try {
        doc.destroy?.();
      } catch {
        // Best-effort cleanup.
      }
    }
  } else if (resource.data.kind === 'image') {
    revokeTrackedObjectUrl(resource.data.objectUrl);
  }
}

interface AppState {
  resources: Resource[];
  destinationItems: DestinationItem[];
  activeExportProfile: ExportProfile;
  /**
   * Per-resource page selections (0-based page indices).
   * Only populated for PDF resources with an expanded grid.
   * Consumed by Phase 3 drag-to-destination.
   */
  pageSelections: Record<string, Set<number>>;
  // Actions
  addResource: (resource: Resource) => void;
  removeResource: (id: string) => void;
  clearResources: () => void;
  addDestinationItem: (item: DestinationItem) => void;
  addDestinationItems: (items: DestinationItem[]) => void;
  removeDestinationItem: (id: string) => void;
  duplicateDestinationItem: (id: string) => void;
  reorderDestinationItems: (orderedIds: string[]) => void;
  clearDestination: () => void;
  setExportProfile: (profile: ExportProfile) => void;
  setPageSelection: (resourceId: string, selection: Set<number>) => void;
  clearPageSelection: (resourceId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  resources: [],
  destinationItems: [],
  activeExportProfile: 'print',
  pageSelections: {},

  addResource: (resource) =>
    set((state) => ({ resources: [...state.resources, resource] })),

  removeResource: (id) => {
    const resource = get().resources.find((r) => r.id === id);
    if (resource) revokeResourceUrls(resource);
    set((state) => {
      const pageSelections = { ...state.pageSelections };
      delete pageSelections[id];
      return {
        resources: state.resources.filter((r) => r.id !== id),
        // Also remove any destination items referencing this resource.
        destinationItems: state.destinationItems.filter((i) => i.resourceId !== id),
        pageSelections,
      };
    });
  },

  clearResources: () => {
    const { resources } = get();
    for (const resource of resources) {
      revokeResourceUrls(resource);
    }
    set({ resources: [], destinationItems: [], pageSelections: {} });
  },

  addDestinationItem: (item) =>
    set((state) => ({ destinationItems: [...state.destinationItems, item] })),

  addDestinationItems: (items) =>
    set((state) => ({ destinationItems: [...state.destinationItems, ...items] })),

  removeDestinationItem: (id) =>
    set((state) => ({
      destinationItems: state.destinationItems.filter((i) => i.id !== id),
    })),

  duplicateDestinationItem: (id) =>
    set((state) => {
      const idx = state.destinationItems.findIndex((i) => i.id === id);
      if (idx === -1) return state;
      const original = state.destinationItems[idx];
      const clone: DestinationItem = { ...original, id: crypto.randomUUID() };
      const next = [...state.destinationItems];
      next.splice(idx + 1, 0, clone);
      return { destinationItems: next };
    }),

  reorderDestinationItems: (orderedIds) =>
    set((state) => ({
      destinationItems: orderedIds
        .map((id) => state.destinationItems.find((i) => i.id === id))
        .filter((i): i is DestinationItem => i !== undefined),
    })),

  clearDestination: () => set({ destinationItems: [] }),

  setExportProfile: (profile) => set({ activeExportProfile: profile }),

  setPageSelection: (resourceId, selection) =>
    set((state) => ({
      pageSelections: { ...state.pageSelections, [resourceId]: selection },
    })),

  clearPageSelection: (resourceId) =>
    set((state) => {
      const pageSelections = { ...state.pageSelections };
      delete pageSelections[resourceId];
      return { pageSelections };
    }),
}));
