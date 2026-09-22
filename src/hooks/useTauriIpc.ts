import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useProfileStore } from "../stores/useProfileStore";
import type { Profile } from "../types";
import { newId } from "../utils/id";

const DEFAULT_NAME = "Default";

/** Hedefi olmayan profil tum pencereleri kapsar. */
function isAllWindows(p: Profile): boolean {
  return !p.target_exe;
}

function buildDefaultProfile(): Profile {
  return {
    id: newId(),
    name: DEFAULT_NAME,
    trigger: "F9",
    target_exe: null, // hicbir hedef siniri yok => tum pencereler
    enabled: true,
    actions: [],
  };
}

function bindIds(list: Profile[], fallbackId: string) {
  const st = useProfileStore.getState();
  if (!st.defaultId || !list.some((p) => p.id === st.defaultId)) st.setDefaultId(fallbackId);
  if (!st.activeId || !list.some((p) => p.id === st.activeId)) st.setActiveId(fallbackId);
}

/**
 * Tum pencereleri kapsayan varsayilan profilin her zaman var olmasini saglar:
 * listede yoksa olusturup backend'e kaydeder, varsa eksik id'leri ona baglar.
 * Her zaman guncel listeyi dondurur. Kaydetmeden hemen once backend'i
 * tekrar okur (StrictMode cift mount / yarismaya karsi ikinci kontrol).
 * Bilerek baska profile tasinan "Make default" secimini ezmez: gecerli
 * defaultId/activeId oldugu gibi birakilir, sadece bos/silinmis id'ler baglanir.
 */
async function ensureDefaultProfile(): Promise<Profile[]> {
  const list = await invoke<Profile[]>("profile_list");
  const existing = list.find((p) => p.name === DEFAULT_NAME && isAllWindows(p)) ?? list.find(isAllWindows);
  if (existing) {
    bindIds(list, existing.id);
    return list;
  }
  const profile = buildDefaultProfile();
  // kaydetmeden once yarismaya karsi tekrar kontrol et
  const fresh = await invoke<Profile[]>("profile_list");
  const raced = fresh.find((p) => p.name === DEFAULT_NAME && isAllWindows(p)) ?? fresh.find(isAllWindows);
  if (raced) {
    bindIds(fresh, raced.id);
    return fresh;
  }
  await invoke("profile_save", { profile });
  const updated = [...fresh, profile];
  bindIds(updated, profile.id);
  return updated;
}

export function useTauriIpc() {
  const { setProfiles, setActiveWindow, profiles, activeWindow, defaultId, activeId } = useProfileStore();
  const loadedRef = useRef(false);
  const healingRef = useRef(false);

  useEffect(() => {
    ensureDefaultProfile().then(setProfiles).catch(console.error);
    const unlisten = listen<string>("active-window-changed", (e) => {
      setActiveWindow(e.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [setProfiles, setActiveWindow]);

  // Self-heal: tum pencereleri kapsayan profil sonradan silinirse
  // (ornegin Default silinirse) kendiliginden yeniden olustur.
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    if (healingRef.current || profiles.some(isAllWindows)) return;
    healingRef.current = true;
    ensureDefaultProfile()
      .then(setProfiles)
      .catch(console.error)
      .finally(() => {
        healingRef.current = false;
      });
  }, [profiles, setProfiles]);

  // Auto-profile switching: hedef exe eslesirse o profili sec
  const match = profiles.find(
    (p) => p.enabled && p.target_exe?.toLowerCase() === activeWindow.toLowerCase(),
  );

  useEffect(() => {
    if (match) useProfileStore.getState().setActiveId(match.id);
  }, [match]);

  // Fallback: eslesme yoksa varsayilan profil devrede, o da yoksa ilk profil
  useEffect(() => {
    if (match || profiles.length === 0) return;
    const state = useProfileStore.getState();
    const stillExists = state.activeId && profiles.some((p) => p.id === state.activeId);
    if (stillExists) return;
    const fallback = (state.defaultId && profiles.find((p) => p.id === state.defaultId)) || profiles[0];
    if (fallback && fallback.id !== state.activeId) state.setActiveId(fallback.id);
  }, [match, profiles, activeId, defaultId]);

  return {};
}
