import { useEffect, useRef } from "react";
import { useProfileStore } from "../stores/useProfileStore";
import { useRunningProfiles } from "./useRunningProfiles";

export function useProfileRunner() {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const { running, start, stop, error } = useRunningProfiles();
  const lastId = useRef<string | null>(null);

  const active = profiles.find((p) => p.id === activeId) ?? null;
  const signature = active ? JSON.stringify(active.triggers) : null;

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
  const activeRun = targetId
    ? { id: targetId, ok: running[0]?.id === targetId && error === null }
    : null;

  return { activeRun, error };
}
