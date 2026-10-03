import type { Trigger } from "../../types";

/// Bos shortcut'i ve yinelenen kaydi kirpar; sonuc profilde saklanan haliyle
/// birebir ayni olmali, yoksa `dirty` her zaman true doner.
export function cleanDraft(drafts: Trigger[]): Trigger[] {
  const seen = new Set<string>();
  const out: Trigger[] = [];
  for (const t of drafts) {
    const shortcut = t.shortcut.trim();
    if (!shortcut || seen.has(shortcut)) continue;
    seen.add(shortcut);
    out.push({ shortcut, actions: t.actions });
  }
  return out;
}

/// Kayitli trigger'lari duzenlenebilir taslaga cevirir. Her trigger ilk
/// aksiyonunu korur (coklu aksiyon eski profillerde kalmis olabilir) ve
/// `custom` bloklari kopyalanir, boylece taslak kaydettigimiz profili
/// yanlislikla degistirmez.
export function toDrafts(triggers: Trigger[] | undefined): Trigger[] {
  if (!triggers?.length) return [];
  return triggers.map((t) => ({
    shortcut: t.shortcut,
    actions: t.actions
      .slice(0, 1)
      .map((a) =>
        a.type === "custom"
          ? { type: "custom", blocks: a.blocks.map((b) => ({ ...b })) }
          : { ...a },
      ),
  }));
}
