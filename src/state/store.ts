// Zustand store skeleton for PDF Manager.
// Phase 1: types defined, state shape established; actions filled in Phase 2+.

import { create } from 'zustand';
import type { Resource, DestinationItem, ExportProfile } from './types.ts';

interface AppState {
  resources: Resource[];
  destinationItems: DestinationItem[];
  activeExportProfile: ExportProfile;
  // Actions (Phase 2+)
  addResource: (resource: Resource) => void;
  removeResource: (id: string) => void;
  addDestinationItem: (item: DestinationItem) => void;
  removeDestinationItem: (id: string) => void;
  reorderDestinationItems: (orderedIds: string[]) => void;
  setExportProfile: (profile: ExportProfile) => void;
}

export const useAppStore = create<AppState>((set) => ({
  resources: [],
  destinationItems: [],
  activeExportProfile: 'print',

  addResource: (resource) =>
    set((state) => ({ resources: [...state.resources, resource] })),

  removeResource: (id) =>
    set((state) => ({ resources: state.resources.filter((r) => r.id !== id) })),

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
