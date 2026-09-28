import { useEffect, useRef } from "react";
import { useProfileStore } from "../stores/useProfileStore";
import { useRunningProfiles } from "./useRunningProfiles";

export function useProfileRunner() {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const { running, start, stop, error } = useRunningProfiles();
  const lastId = useRef<string | null>(null);

  const active = profiles.find((p) => p.id === activeId) ?? null;
  // profile_list her cagrida yeni objeler donuyor; dizi kimligine degil icerige
  // baglanmak, her save'de profili yeniden baslatmamak icin sart.
  const signature = active
    ? JSON.stringify([active.triggers, active.block_key])
    : null;

  useEffect(() => {
    let cancelled = false;
    const previous = lastId.current;
    lastId.current = activeId;
    (async () => {
      const shouldRun = active !== null && active.triggers.length > 0;
      // Ayni profilin trigger'i silinip kaydedildiginde de durmali: eski
      // surec, artik var olmayan hotkey'lerle calismaya devam ediyor.
      if (previous !== null && (previous !== activeId || !shouldRun)) {
        try {
          await stop(previous);
        } catch {
          /* profil zaten oluyse sessiz gec */
        }
      }
      if (cancelled || !shouldRun || !active) return;
      try {
        await start(active.id, active.triggers, active.block_key);
      } catch {
        /* hata useRunningProfiles icinde state'e yazildi */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, signature]);

  const targetId =
    active && active.triggers.length > 0 ? active.id : null;
  // Start hata verirse `running` bos kalir; bu yuzden nokta "calismasi beklenen"
  // profilde durur ve yalnizca gercekten ayakta ise yesil olur.
  const activeRun = targetId
    ? { id: targetId, ok: running[0]?.id === targetId && error === null }
    : null;

  return { activeRun, error };
}
