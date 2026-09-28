import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Trigger } from "../types";

export interface RunningProfile {
  id: string;
  pid: number;
}

const POLL_MS = 2000;

function toRunning(entries: [string, number][]): RunningProfile[] {
  return entries.map(([id, pid]) => ({ id, pid }));
}

export function useRunningProfiles() {
  const [running, setRunning] = useState<RunningProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Hatayi burada temizlemiyoruz: polling ve focus `refresh` cagirir, hata
  // bir sonraki baslat/durdur'a kadar ekranda kalmali.
  const refresh = useCallback(async () => {
    try {
      setRunning(toRunning(await invoke<[string, number][]>("ahk_running_profiles")));
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const start = useCallback(
    async (profileId: string, triggers: Trigger[], blockKey: boolean) => {
      setError(null);
      try {
        await invoke("ahk_start_profile", { profileId, triggers, blockKey });
      } catch (e) {
        setError(String(e));
        throw e;
      }
      await refresh();
    },
    [refresh],
  );

  const stop = useCallback(
    async (profileId: string) => {
      setError(null);
      try {
        await invoke("ahk_stop_profile", { profileId });
      } catch (e) {
        setError(String(e));
        throw e;
      }
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (running.length === 0) return;
    const t = window.setInterval(() => {
      refresh();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [running.length, refresh]);

  return { running, start, stop, error };
}
