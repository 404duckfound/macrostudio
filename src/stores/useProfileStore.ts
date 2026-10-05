import { create } from "zustand";
import type { Profile } from "../types";

interface ProfileState {
  profiles: Profile[];
  activeId: string | null;
  pinnedId: string | null;
  defaultId: string | null;
  activeWindow: string;
  focusFallbackMs: number;
  ignoredExes: string[];
  setProfiles: (p: Profile[]) => void;
  setActiveId: (id: string | null) => void;
  setPinnedId: (id: string | null) => void;
  setDefaultId: (id: string | null) => void;
  setActiveWindow: (exe: string) => void;
  setFocusFallbackMs: (ms: number) => void;
  setIgnoredExes: (exes: string[]) => void;
  addIgnoredExe: (exe: string) => void;
  removeIgnoredExe: (exe: string) => void;
}

export const DEFAULT_FOCUS_FALLBACK_MS = 750;

export const DEFAULT_IGNORED_EXES: string[] = [];

export function normalizeExeList(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [],
  activeId: null,
  pinnedId: null,
  defaultId: null,
  activeWindow: "Unknown",
  focusFallbackMs: DEFAULT_FOCUS_FALLBACK_MS,
  ignoredExes: [...DEFAULT_IGNORED_EXES],
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
  setIgnoredExes: (exes) => set({ ignoredExes: normalizeExeList(exes) }),
  addIgnoredExe: (exe) =>
    set((s) => ({ ignoredExes: normalizeExeList([...s.ignoredExes, exe]) })),
  removeIgnoredExe: (exe) =>
    set((s) => ({
      ignoredExes: s.ignoredExes.filter(
        (e) => e.toLowerCase() !== exe.trim().toLowerCase(),
      ),
    })),
}));
