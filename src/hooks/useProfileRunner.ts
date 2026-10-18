import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProfileStore } from "../stores/useProfileStore";
import { macroSignature } from "../components/profiles/triggers/triggerDraft";
import type { Trigger } from "../types";

const POLL_MS = 2000;

interface RunningProfile {
  id: string;
  pid: number;
}

function toRunning(entries: [string, number][]): RunningProfile[] {
  return entries.map(([id, pid]) => ({ id, pid }));
}

/**
 * Owns the AHK process lifecycle and the policy around it: the active profile
 * runs automatically, switching profiles stops the previous one, and only one
 * profile is alive at a time.
 */
export function useProfileRunner() {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const macros = useProfileStore((s) => s.macros);

  const [running, setRunning] = useState<RunningProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lastId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRunning(
        toRunning(await invoke<[string, number][]>("ahk_running_profiles")),
      );
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const start = useCallback(
    async (profileId: string, profileName: string, triggers: Trigger[]) => {
      setError(null);
      try {
        await invoke("ahk_start_profile", {
          profileId,
          profileName,
          triggers,
        });
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

  const active = profiles.find((p) => p.id === activeId) ?? null;
  // Depends on the trigger content, not the array identity: profile_list
  // returns fresh objects, so keying on identity would restart on every load.
  const signature = active ? macroSignature(active.triggers, macros) : null;

  useEffect(() => {
    let cancelled = false;
    const previous = lastId.current;
    lastId.current = activeId;
    (async () => {
      const shouldRun = active !== null && active.triggers.length > 0;
      if (previous !== null && (previous !== activeId || !shouldRun)) {
        try {
          await stop(previous);
        } catch {}
      }
      if (cancelled || !shouldRun || !active) return;
      try {
        await start(active.id, active.name, active.triggers);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, signature]);

  const targetId = active && active.triggers.length > 0 ? active.id : null;
  // Reported for the profile that should be running, not running[0]: a failed
  // start leaves the list empty and would otherwise flag the wrong profile.
  const activeRun = targetId
    ? { id: targetId, ok: running[0]?.id === targetId && error === null }
    : null;

  return { activeRun, error };
}