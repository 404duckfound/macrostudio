import { invoke } from "@tauri-apps/api/core";
import { useProfileStore } from "../../stores/useProfileStore";

export default function OverlayPanel() {
  const { profiles, setActiveId } = useProfileStore();

  async function quickStart(id: string) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    await invoke("ahk_start_profile", {
      profileId: p.id,
      triggers: p.triggers,
      blockKey: p.block_key,
      actions: p.actions,
    });
    setActiveId(p.id);
  }

  return (
    <div>
      <h2>Quick Profile Switcher</h2>
      {profiles.map((p) => (
        <button key={p.id} className="btn-secondary" style={{ width: "100%", marginBottom: 8 }} onClick={() => quickStart(p.id)}>
          {p.name}
        </button>
      ))}
    </div>
  );
}
