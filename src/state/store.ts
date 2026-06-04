// Zustand store for PDF Manager.
// Holds in-memory resources and destination assembly items.

import { create } from 'zustand';
import type { Resource, DestinationItem, ExportProfile } from './types.ts';
import { revokeTrackedObjectUrl } from '../shared/objectUrl.ts';

function revokeResourceUrls(resource: Resource): void {
  if (resource.data.kind === 'pdf') {
    for (const url of resource.data.thumbnailUrls) {
      revokeTrackedObjectUrl(url);
    }
  } else if (resource.data.kind === 'image') {
    revokeTrackedObjectUrl(resource.data.objectUrl);
  }
}

interface AppState {
  resources: Resource[];
  destinationItems: DestinationItem[];
  activeExportProfile: ExportProfile;
  // Actions
  addResource: (resource: Resource) => void;
  removeResource: (id: string) => void;
  clearResources: () => void;
  addDestinationItem: (item: DestinationItem) => void;
  removeDestinationItem: (id: string) => void;
  reorderDestinationItems: (orderedIds: string[]) => void;
  setExportProfile: (profile: ExportProfile) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  resources: [],
  destinationItems: [],
  activeExportProfile: 'print',

  addResource: (resource) =>
    set((state) => ({ resources: [...state.resources, resource] })),

  removeResource: (id) => {
    const resource = get().resources.find((r) => r.id === id);
    if (resource) revokeResourceUrls(resource);
    set((state) => ({
      resources: state.resources.filter((r) => r.id !== id),
      // Also remove any destination items referencing this resource.
      destinationItems: state.destinationItems.filter((i) => i.resourceId !== id),
    }));
  },

  clearResources: () => {
    const { resources } = get();
    for (const resource of resources) {
      revokeResourceUrls(resource);
    }
    set({ resources: [], destinationItems: [] });
  },

  addDestinationItem: (item) =>
    set((state) => ({ destinationItems: [...state.destinationItems, item] })),

  removeDestinationItem: (id) =>
    set((state) => ({
      destinationItems: state.destinationItems.filter((i) => i.id !== id),
    })),

  reorderDestinationItems: (orderedIds) =>
    set((state) => ({
      destinationItems: orderedIds
        .map((id) => state.destinationItems.find((i) => i.id === id))
        .filter((i): i is DestinationItem => i !== undefined),
    })),

  setExportProfile: (profile) => set({ activeExportProfile: profile }),
}));
