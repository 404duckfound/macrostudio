import { create } from "zustand";
import type { Profile } from "../types";

interface ProfileState {
  profiles: Profile[];
  activeId: string | null;
  pinnedId: string | null;
  defaultId: string | null;
  activeWindow: string;
  focusFallbackMs: number;
  setProfiles: (p: Profile[]) => void;
  setActiveId: (id: string | null) => void;
  setPinnedId: (id: string | null) => void;
  setDefaultId: (id: string | null) => void;
  setActiveWindow: (exe: string) => void;
  setFocusFallbackMs: (ms: number) => void;
}

export const DEFAULT_FOCUS_FALLBACK_MS = 750;

export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [],
  activeId: null,
  pinnedId: null,
  defaultId: null,
  activeWindow: "Unknown",
  focusFallbackMs: DEFAULT_FOCUS_FALLBACK_MS,
  setProfiles: (profiles) =>
    set((s) => ({
      profiles,
      activeId:
        s.activeId && !profiles.some((p) => p.id === s.activeId)
          ? null
          : s.activeId,
      pinnedId:
        s.pinnedId && !profiles.some((p) => p.id === s.pinnedId)
          ? null
          : s.pinnedId,
      defaultId:
        s.defaultId && !profiles.some((p) => p.id === s.defaultId)
          ? null
          : s.defaultId,
    })),
  setActiveId: (activeId) => set({ activeId }),
  setPinnedId: (pinnedId) => set({ pinnedId }),
  setDefaultId: (defaultId) => set({ defaultId }),
  setActiveWindow: (activeWindow) => set({ activeWindow }),
  setFocusFallbackMs: (focusFallbackMs) => set({ focusFallbackMs }),
}));
