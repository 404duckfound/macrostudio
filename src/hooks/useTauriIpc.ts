import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { load, type Store } from "@tauri-apps/plugin-store";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import {
  DEFAULT_IGNORED_EXES,
  normalizeExeList,
  useProfileStore,
} from "../stores/useProfileStore";
import type { Profile } from "../types";

const SETTINGS_PATH = "settings.json";
const IGNORED_KEY = "ignoredExes";

let settingsStore: Promise<Store> | null = null;
function getSettingsStore() {
  if (!settingsStore) {
    settingsStore = load(SETTINGS_PATH, {
      autoSave: true,
      defaults: { [IGNORED_KEY]: DEFAULT_IGNORED_EXES },
    });
  }
  return settingsStore;
}

function isIgnoredExe(exe: string, ignored: string[]): boolean {
  const lower = exe.trim().toLowerCase();
  return ignored.some((e) => e.toLowerCase() === lower);
}

const DEFAULT_NAME = "Default";

function notifyProfileSwitch(profile: Profile) {
  isPermissionGranted()
    .then(async (granted) => {
      if (granted) return true;
      return (await requestPermission()) === "granted";
    })
    .then((granted) => {
      if (!granted) return;
      sendNotification({
        title: "Profile changed to",
        body: profile.name,
      });
    })
    .catch(() => {
      /* notification failure must not block the profile switch */
    });
}

function isAllWindows(p: Profile): boolean {
  return !p.target_exe;
}

function buildDefaultProfile(): Profile {
  return {
    id: crypto.randomUUID(),
    name: DEFAULT_NAME,
    triggers: [],
    target_exe: null,
    enabled: true,
  };
}

function bindIds(list: Profile[], fallbackId: string) {
  const st = useProfileStore.getState();
  if (!st.defaultId || !list.some((p) => p.id === st.defaultId))
    st.setDefaultId(fallbackId);
  if (!st.activeId || !list.some((p) => p.id === st.activeId))
    st.setActiveId(fallbackId);
  if (!st.pinnedId || !list.some((p) => p.id === st.pinnedId))
    st.setPinnedId(st.activeId ?? fallbackId);
}

function pickDefault(list: Profile[]): Profile | undefined {
  return (
    list.find((p) => p.name === DEFAULT_NAME && isAllWindows(p)) ??
    list.find(isAllWindows)
  );
}

async function ensureDefaultProfile(): Promise<Profile[]> {
  const list = await invoke<Profile[]>("profile_list");
  const existing = pickDefault(list);
  if (existing) {
    bindIds(list, existing.id);
    return list;
  }
  const profile = buildDefaultProfile();
  await invoke("profile_save", { profile });
  const updated = [...list, profile];
  bindIds(updated, profile.id);
  return updated;
}

export function useTauriIpc() {
  const {
    setProfiles,
    setActiveWindow,
    setIgnoredExes,
    profiles,
    activeWindow,
    defaultId,
    focusFallbackMs,
    ignoredExes,
  } = useProfileStore();
  const loadedRef = useRef(false);
  const healingRef = useRef(false);
  const settingsLoadedRef = useRef(false);

  useEffect(() => {
    ensureDefaultProfile().then(setProfiles).catch(console.error);
    getSettingsStore()
      .then((s) => s.get<string[]>(IGNORED_KEY))
      .then((val) => {
        if (Array.isArray(val)) setIgnoredExes(normalizeExeList(val));
      })
      .catch(console.error)
      .finally(() => {
        settingsLoadedRef.current = true;
      });
    const unlisten = listen<string>("active-window-changed", (e) => {
      if (isIgnoredExe(e.payload, useProfileStore.getState().ignoredExes))
        return;
      setActiveWindow(e.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [setProfiles, setActiveWindow, setIgnoredExes]);

  useEffect(() => {
    if (!settingsLoadedRef.current) return;
    getSettingsStore()
      .then((s) => s.set(IGNORED_KEY, ignoredExes))
      .catch(console.error);
  }, [ignoredExes]);

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

  const match = profiles.find(
    (p) =>
      p.enabled && p.target_exe?.toLowerCase() === activeWindow.toLowerCase(),
  );

  useEffect(() => {
    if (!match) return;
    const state = useProfileStore.getState();
    if (state.activeId === match.id) return;
    state.setActiveId(match.id);
    notifyProfileSwitch(match);
  }, [match]);

  useEffect(() => {
    if (match || profiles.length === 0) return;
    const timer = window.setTimeout(() => {
      const state = useProfileStore.getState();
      const target =
        (state.pinnedId && profiles.find((p) => p.id === state.pinnedId)) ||
        (state.defaultId && profiles.find((p) => p.id === state.defaultId)) ||
        profiles[0];
      if (!target || target.id === state.activeId) return;
      state.setActiveId(target.id);
      notifyProfileSwitch(target);
    }, focusFallbackMs);
    return () => window.clearTimeout(timer);
  }, [match, profiles, focusFallbackMs]);

  useEffect(() => {
    if (profiles.length === 0) return;
    const state = useProfileStore.getState();
    const stillExists =
      state.activeId && profiles.some((p) => p.id === state.activeId);
    if (stillExists) return;
    const fallback =
      (state.defaultId && profiles.find((p) => p.id === state.defaultId)) ||
      profiles[0];
    if (fallback && fallback.id !== state.activeId)
      state.setActiveId(fallback.id);
  }, [profiles, defaultId]);

  return {};
}
