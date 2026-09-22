import { create } from "zustand";
import type { Profile } from "../types";

interface ProfileState {
  profiles: Profile[];
  activeId: string | null;
  defaultId: string | null;
  activeWindow: string;
  setProfiles: (p: Profile[]) => void;
  setActiveId: (id: string | null) => void;
  setDefaultId: (id: string | null) => void;
  setActiveWindow: (exe: string) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [],
  activeId: null,
  defaultId: null,
  activeWindow: "Unknown",
  setProfiles: (profiles) => set((s) => ({
    profiles,
    // silinen id'leri temizle
    activeId: s.activeId && !profiles.some((p) => p.id === s.activeId) ? null : s.activeId,
    defaultId: s.defaultId && !profiles.some((p) => p.id === s.defaultId) ? null : s.defaultId,
  })),
  setActiveId: (activeId) => set({ activeId }),
  setDefaultId: (defaultId) => set({ defaultId }),
  setActiveWindow: (activeWindow) => set({ activeWindow }),
}));
