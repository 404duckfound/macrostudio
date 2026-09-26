# Trigger Sistemi, Aksiyon Editörü, Duplicate ve Suppress Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add New Trigger çalışsın (profil başına çoklu trigger), trigger'a basınca ne olacağı düzenlenebilsin (aksiyon listesi + custom AHK), profil kopyalama olsun, Block Original Keypress gerçekten tuşu geçirsin/engellesin.

**Architecture:** Backend `Profile` şeması `trigger: string` → `triggers: string[]` + `block_key: bool` olur, eski JSON'lar Rust tarafında migrate edilir. Generator istiflenmiş hotkey (`^F1::` + `^+F1::` tek gövde) üretir, `block_key=false` iken `~` öneki koyar, yeni `custom` aksiyonu verbatim yazar. Frontend'de Workspace trigger listesi + aksiyon editörü kazanır, ProfileRail'e Duplicate gelir.

**Tech Stack:** Tauri v2, Rust (serde_json), React 19, Zustand, TypeScript strict (`noUnusedLocals`), pnpm, cargo test (Rust unit testleri — repo'da tek test altyapısı budur).

**Spec:** Kullanıcı raporu (2026-09-26): "yeni trigger ekleme çalışmıyo ve trigger basınca ne olacağını ayarlayamıyoruz mesela custom function atanmıyo. profil duplicateleme yok. Block Original Keypress çalışmıyo."

## Global Constraints

- Frontend verify: `pnpm build` (= `tsc && vite build`) — hata vermeden geçmeli; repo'da jest/vitest/pytest yok.
- Rust verify: `cargo check --manifest-path src-tauri/Cargo.toml` uyarısız geçmeli; Rust unit testleri `cargo test --manifest-path src-tauri/Cargo.toml` ile koşar.
- Yeni `#[tauri::command]` eklenmiyor — `generate_handler!` değişmez (`src-tauri/src/lib.rs:23`).
- `tsconfig` strict: kullanılmayan import/değişken `pnpm build`'i patlatır.
- `profile_save` her kayıtta `{id}.json` + `{id}.ahk` yazar, `profile_list` eksik `.ahk`'yi backfill eder (`src-tauri/src/commands/profile.rs`) — bu davranış korunur.
- Tauri invoke parametreleri JS tarafında camelCase: `profile_id` → `profileId`, `block_key` → `blockKey`.
- Windows-first: dosya konumu `%APPDATA%/macro-studio/profiles`, `std::env::var("APPDATA")`.

## Review Focus

- Eski profilde sadece `"trigger": "F9"` varsa açılışta trigger kaybolmamalı, `triggers: ["F9"]` olmalı — Task 1'in migrate testiyle pinlenir.
- Trigger listesi tamamen boşken üretilen AHK bozuk olmamalı, `F9` fallback çalışmalı — Task 2'nin fallback testiyle pinlenir.
- `block_key=false` iken üretilen hotkey `~` ile başlamalı (tuş sisteme de geçmeli) — Task 2'nin suppress testiyle pinlenir.
- Duplicate orijinal profilin üzerine yazmamalı, yeni id + `(copy)` isimle iki ayrı dosya çifti oluşmalı — Task 4'ün manuel doğrulama adımıyla pinlenir.
- İçinde tırnak ve çok satır olan custom AHK kodu JSON save'i ve AHK derlemeyi bozmamalı — Task 2'nin custom testiyle pinlenir.

---

### Task 1: Backend profil şeması — `triggers` + `block_key` + eski JSON migrate

**Files:**
- Modify: `src-tauri/src/commands/profile.rs` (tamamı ~90 satır, ilgili bloklar aşağıda)

**Interfaces:**
- Consumes: `crate::services::generator::{compile_to_ahk_v2, Action}` (imzası Task 2'de değişir; bu task derlenebilirlik için Task 2 ile aynı commit dizisinde ilerler — önce Task 2'nin imzasını uygula, sonra bu taskı).
- Produces: `Profile { id, name, triggers: Vec<String>, target_exe: Option<String>, enabled: bool, actions: serde_json::Value, block_key: bool }`, `migrate_value(v: serde_json::Value) -> serde_json::Value`.

- [ ] **Step 1: Yeni struct + migrate fonksiyonunu yaz**

```rust
use serde::{Deserialize, Serialize};

use crate::services::generator::{compile_to_ahk_v2, Action};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub triggers: Vec<String>,
    pub target_exe: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub actions: serde_json::Value,
    #[serde(default = "default_true")]
    pub block_key: bool,
}

fn default_true() -> bool {
    true
}

/// Eski tek-triggirli JSON'u yeni semaya cevirir, legacy "trigger" anahtarini siler.
fn migrate_value(mut v: serde_json::Value) -> serde_json::Value {
    if v.get("triggers").is_none() {
        let legacy = v
            .get("trigger")
            .and_then(|t| t.as_str())
            .unwrap_or("F9")
            .to_string();
        if let Some(obj) = v.as_object_mut() {
            obj.insert("triggers".to_string(), serde_json::json!([legacy]));
            obj.remove("trigger");
        }
    }
    v
}
```

- [ ] **Step 2: `profile_list` içinde migrate + rewrite uygula**

```rust
let content = std::fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
let value: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
let needs_rewrite = value.get("triggers").is_none();
let migrated = migrate_value(value);
if let Ok(p) = serde_json::from_value::<Profile>(migrated.clone()) {
    if needs_rewrite {
        let pretty = serde_json::to_string_pretty(&migrated).map_err(|e| e.to_string())?;
        std::fs::write(entry.path(), pretty).map_err(|e| e.to_string())?;
    }
    out.push(p);
}
```

- [ ] **Step 3: `write_ahk_file` yeni imzaya geçir**

```rust
fn write_ahk_file(dir: &std::path::Path, profile: &Profile) {
    let actions: Vec<Action> = serde_json::from_value(profile.actions.clone()).unwrap_or_default();
    let script = compile_to_ahk_v2(&profile.triggers, profile.block_key, &actions);
    let path = dir.join(format!("{}.ahk", profile.id));
    let _ = std::fs::write(path, script);
}
```

- [ ] **Step 4: migrate için failing Rust testi yaz**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_single_trigger_migrates_to_triggers() {
        let old = serde_json::json!({
            "id": "x", "name": "N", "trigger": "Ctrl+Shift+F1",
            "target_exe": null, "enabled": true, "actions": []
        });
        let migrated = migrate_value(old);
        let p: Profile = serde_json::from_value(migrated).unwrap();
        assert_eq!(p.triggers, vec!["Ctrl+Shift+F1".to_string()]);
        assert!(p.block_key);
    }
}
```

- [ ] **Step 5: Testi koş, fail ettiğini gör**

Run: `cargo test --manifest-path src-tauri/Cargo.toml profile`
Expected: FAIL — `compile_to_ahk_v2` henüz 3 parametreli değil (Task 2 uygulanmadan derlenmez; bu beklenen faildir, Task 2 ile birlikte yeşile döner).

- [ ] **Step 6: Task 2 tamamlanınca testi tekrar koş**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS (tüm testler).

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/commands/profile.rs
git commit -m "feat: multi-trigger and block_key profile schema with legacy migration"
```

### Task 2: Generator — istiflenmiş hotkey, `~` suppress, custom aksiyon

**Files:**
- Modify: `src-tauri/src/services/generator.rs` (tamamı ~43 satır + testler)

**Interfaces:**
- Consumes: yok (bağımsız).
- Produces: `compile_to_ahk_v2(triggers: &[String], block_key: bool, actions: &[Action]) -> String`, `Action::Custom { code: String }`.

- [ ] **Step 1: Failing testleri yaz**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stacked_triggers_share_one_body() {
        let out = compile_to_ahk_v2(
            &["Ctrl+Shift+F1".to_string(), "F9".to_string()],
            true,
            &[Action::SendKeys { payload: "hi".to_string() }],
        );
        assert!(out.contains("^+F1::\nF9::\n{\n"));
        assert!(out.contains("Send(\"hi\")"));
    }

    #[test]
    fn suppress_off_prefixes_tilde() {
        let out = compile_to_ahk_v2(&["F9".to_string()], false, &[]);
        assert!(out.contains("~F9::"));
    }

    #[test]
    fn empty_triggers_fall_back_to_f9() {
        let out = compile_to_ahk_v2(&[], true, &[]);
        assert!(out.contains("F9::"));
    }

    #[test]
    fn custom_action_emitted_verbatim() {
        let out = compile_to_ahk_v2(
            &["F9".to_string()],
            true,
            &[Action::Custom { code: "MsgBox(\"a\")\nSleep(10)".to_string() }],
        );
        assert!(out.contains("    MsgBox(\"a\")\n    Sleep(10)\n"));
    }
}
```

- [ ] **Step 2: Testleri koş, fail gör**

Run: `cargo test --manifest-path src-tauri/Cargo.toml generator`
Expected: FAIL — `compile_to_ahk_v2` 1 parametre alıyor, `Custom` varyantı yok.

- [ ] **Step 3: Minimal implementasyon**

```rust
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    SendKeys { payload: String },
    Delay { ms: u32 },
    MouseClick { button: String, x: i32, y: i32 },
    Custom { code: String },
}

pub fn compile_to_ahk_v2(triggers: &[String], block_key: bool, actions: &[Action]) -> String {
    let mut script = String::from("#Requires AutoHotkey v2.0\n\n");
    let prefix = if block_key { "" } else { "~" };
    let keys: Vec<String> = triggers
        .iter()
        .map(|t| format!("{prefix}{}", map_shortcut_to_ahk(t)))
        .collect();
    let keys = if keys.is_empty() {
        vec![format!("{prefix}F9")]
    } else {
        keys
    };
    for k in &keys {
        script.push_str(&format!("{k}::\n"));
    }
    script.push_str("{\n");
    for action in actions {
        match action {
            Action::SendKeys { payload } => {
                let escaped = payload.replace('"', "`\"");
                script.push_str(&format!("    Send(\"{escaped}\")\n"));
            }
            Action::Delay { ms } => {
                script.push_str(&format!("    Sleep({ms})\n"));
            }
            Action::MouseClick { button, x, y } => {
                script.push_str(&format!("    Click({x}, {y}, \"{button}\")\n"));
            }
            Action::Custom { code } => {
                for line in code.lines() {
                    script.push_str(&format!("    {line}\n"));
                }
            }
        }
    }
    script.push_str("}\n");
    script
}
```

`map_shortcut_to_ahk` aynen kalır.

- [ ] **Step 4: Testleri koş, pass gör**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS (Task 1 testleri dahil).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/services/generator.rs
git commit -m "feat: stacked hotkeys, tilde suppress, custom AHK action"
```

### Task 3: IPC imzaları + mevcut çağrı noktaları

**Files:**
- Modify: `src-tauri/src/commands/ahk.rs:6-39`
- Modify: `src/components/overlay/OverlayPanel.tsx:7-11`
- Modify: `src/components/editor/AhkEditor.tsx:11-16`

**Interfaces:**
- Consumes: Task 1 `Profile`, Task 2 `compile_to_ahk_v2`.
- Produces: `ahk_start_profile(profile_id, triggers, block_key, actions)`, `ahk_compile_preview(triggers, block_key, actions)`.

- [ ] **Step 1: `ahk.rs` imzaları güncelle**

```rust
#[tauri::command]
pub async fn ahk_start_profile(
    state: State<'_, AppState>,
    profile_id: String,
    triggers: Vec<String>,
    block_key: bool,
    actions: Vec<Action>,
) -> Result<u32, String> {
    let script = compile_to_ahk_v2(&triggers, block_key, &actions);
    // ... dosya yazma ve baslatma aynen kalir
}

#[tauri::command]
pub fn ahk_compile_preview(triggers: Vec<String>, block_key: bool, actions: Vec<Action>) -> String {
    compile_to_ahk_v2(&triggers, block_key, &actions)
}
```

- [ ] **Step 2: `OverlayPanel.tsx` çağrısını güncelle**

```tsx
await invoke("ahk_start_profile", {
  profileId: p.id,
  triggers: p.triggers,
  blockKey: p.block_key,
  actions: p.actions,
});
```

- [ ] **Step 3: `AhkEditor.tsx` çağrısını güncelle**

```tsx
invoke<string>("ahk_compile_preview", {
  triggers: active.triggers,
  blockKey: active.block_key,
  actions: active.actions,
}).then(setCode).catch(console.error);
```

- [ ] **Step 4: Rust tarafını doğrula**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: uyarısız `Finished`.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/ahk.rs src/components/overlay/OverlayPanel.tsx src/components/editor/AhkEditor.tsx
git commit -m "feat: pass triggers and block_key through AHK IPC"
```

### Task 4: Frontend model + default profil + Duplicate

**Files:**
- Modify: `src/types/index.ts` (tamamı ~29 satır)
- Modify: `src/hooks/useTauriIpc.ts:15-24` (`buildDefaultProfile`)
- Modify: `src/components/profiles/ProfileRail.tsx` (add modal profili ~81-93 + menü ~166-196)

**Interfaces:**
- Consumes: Task 1 backend şeması.
- Produces: TS `Profile { id, name, triggers: string[], target_exe, enabled, block_key: boolean, actions }`, `duplicateProfile(p: Profile)` menü aksiyonu.

- [ ] **Step 1: `src/types/index.ts` güncelle**

```ts
export interface CustomAction {
  type: "custom";
  code: string;
}

export type MacroAction = SendKeysAction | DelayAction | MouseClickAction | CustomAction;

export interface Profile {
  id: string;
  name: string;
  triggers: string[];
  target_exe?: string | null;
  enabled: boolean;
  block_key: boolean;
  actions: MacroAction[];
}
```

- [ ] **Step 2: `useTauriIpc.ts` default profili güncelle**

```ts
function buildDefaultProfile(): Profile {
  return {
    id: newId(),
    name: DEFAULT_NAME,
    triggers: ["F9"],
    target_exe: null,
    enabled: true,
    block_key: true,
    actions: [],
  };
}
```

- [ ] **Step 3: `ProfileRail.tsx` yeni profil objesini güncelle**

```ts
const profile: Profile = {
  id: newId(),
  name: cleanName,
  triggers: ["F9"],
  target_exe: cleanTarget || null,
  enabled: true,
  block_key: true,
  actions: [],
};
```

- [ ] **Step 4: Duplicate menü butonu + handler ekle**

```tsx
<button
  className="rail-menu-item"
  type="button"
  onClick={() => duplicateProfile(p)}
>
  Duplicate
</button>
```

```tsx
async function duplicateProfile(p: Profile) {
  const copy: Profile = {
    ...p,
    id: newId(),
    name: `${p.name} (copy)`,
    triggers: [...p.triggers],
    actions: p.actions.map((a) => ({ ...a })),
  };
  await invoke("profile_save", { profile: copy });
  await refresh();
  setActiveId(copy.id);
  setOpenMenuId(null);
}
```

(`refresh`, `setActiveId`, `setOpenMenuId`, `invoke`, `newId` bileşende zaten mevcut.)

- [ ] **Step 5: Derle**

Run: `pnpm build`
Expected: `✓ built` — hata yok (eski `p.trigger` referansı kalırsa tsc patlar; kalanları `p.triggers[0] ?? "F9"` yap).

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/hooks/useTauriIpc.ts src/components/profiles/ProfileRail.tsx
git commit -m "feat: multi-trigger profile model and duplicate action"
```

### Task 5: Workspace — trigger listesi, inspector wiring, aksiyon editörü

**Files:**
- Modify: `src/components/workspace/Workspace.tsx` (tamamı ~230 satır)
- Modify: `src/theme.css` (sonuna aksiyon stilleri ekle)

**Interfaces:**
- Consumes: Task 4 TS `Profile`/`MacroAction`.
- Produces: seçili trigger düzenleme, trigger ekle/sil, aksiyon CRUD + Kaydet ile `profile_save`.

- [ ] **Step 1: State'i çoklu trigger + aksiyonlara çevir**

```tsx
const [draftTriggers, setDraftTriggers] = useState<string[]>(active?.triggers ?? ["F9"]);
const [selectedIdx, setSelectedIdx] = useState(0);
const [draftActions, setDraftActions] = useState<MacroAction[]>(active?.actions ?? []);
const [draftBlockKey, setDraftBlockKey] = useState(active?.block_key ?? true);
```

Aktif profil değişince hepsini sıfırlayan `useEffect` mevcut desenle (`active?.id` bağımlılığı) yazılır. Kayıt (Record Key) seçili index'e yazar. `selectedIdx` liste dışına taşarsa `Math.min` ile kelepçele.

- [ ] **Step 2: Canvas'a trigger listesi + aksiyon listesi çiz**

Trigger kartları `draftTriggers.map` ile üretilir, tıklanan seçilir (`selectedIdx`), seçili kart inspector'ı besler. "Add New Trigger" boş olmayan son eleman yoksa `"F9"` ekler, yeni index'i seçer ve `recording=true` yapar. Sil (`Sil` butonu) seçili trigger'ı siler; liste boşalırsa `draftTriggers` boş kalır (backend F9 fallback üretir) ve inspector "No shortcut set" gösterir.

Aksiyon bölümü canvas'ta trigger listesinin altına gelir:

```tsx
<div className="flow-head">
  <div>
    <h3 className="flow-title">Actions ({draftActions.length})</h3>
    <p className="flow-sub">What runs when any trigger fires, in order</p>
  </div>
</div>
{draftActions.map((a, i) => (
  <ActionCard key={i} action={a} index={i} onChange={updateAction} onDelete={deleteAction} />
))}
<div className="action-add-row">
  <button type="button" onClick={() => addAction("send_keys")}>+ Text</button>
  <button type="button" onClick={() => addAction("delay")}>+ Delay</button>
  <button type="button" onClick={() => addAction("mouse_click")}>+ Click</button>
  <button type="button" onClick={() => addAction("custom")}>+ Custom</button>
</div>
```

`ActionCard` aynı dosyada küçük bir bileşendir: `send_keys` → text input, `delay` → number input, `mouse_click` → button select + x/y number, `custom` → textarea (monospace). Her kartta sil butonu. Tip daraltması `a.type` switch ile yapılır — tsc bunu zorlar.

- [ ] **Step 3: Inspector'ı draft'lara bağla**

`blockKey`/`setBlockKey` yerine `draftBlockKey` kullanılır. Kaydet:

```tsx
async function save() {
  if (!active) return;
  const cleanTriggers = draftTriggers.map((t) => t.trim()).filter((t) => t.length > 0);
  setSaving(true);
  try {
    const updated: Profile = {
      ...active,
      triggers: cleanTriggers,
      target_exe: draftTarget.trim() || null,
      block_key: draftBlockKey,
      actions: draftActions,
    };
    await invoke("profile_save", { profile: updated });
    const list = await invoke<Profile[]>("profile_list");
    useProfileStore.getState().setProfiles(list);
  } finally {
    setSaving(false);
  }
}
```

`dirty` hesabına `draftActions` (JSON karşılaştırma) ve `draftBlockKey` eklenir.

- [ ] **Step 4: Aksiyon stillerini `theme.css` sonuna ekle**

```css
.action-card {
  width: 100%;
  background: #10141b;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
}
.action-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.action-kind { font-size: 12px; font-weight: 600; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.05em; }
.action-delete { border: none; background: none; min-height: 0; padding: 4px; font-size: 11px; color: #8e98a8; border-radius: 4px; }
.action-delete:hover { color: var(--status-danger); }
.action-add-row { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.action-add-row button {
  flex: 1;
  min-height: 40px;
  border: 1px dashed #283241;
  border-radius: 8px;
  background: transparent;
  color: #c3c6d2;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.action-add-row button:hover { border-color: rgba(122, 162, 232, 0.7); color: var(--text-primary); }
.action-input, .action-textarea { font-family: "JetBrains Mono", monospace; font-size: 13px; }
.action-textarea { min-height: 88px; resize: vertical; padding: 8px 12px; }
.action-grid { display: flex; gap: 8px; }
.action-grid > * { flex: 1; min-width: 0; }
```

(Mevcut global `input, select, textarea` kuralı yok — textarea için `.action-textarea`'ya `background/border/color/width` eklenir: `background: var(--bg-base); border: 1px solid var(--border-default); color: var(--text-primary); width: 100%; border-radius: 12px;`.)

- [ ] **Step 5: Derle**

Run: `pnpm build`
Expected: `✓ built`.

- [ ] **Step 6: Commit**

```bash
git add src/components/workspace/Workspace.tsx src/theme.css
git commit -m "feat: multi-trigger list, action editor, wired block_key inspector"
```

### Task 6: Uçtan uca doğrulama

**Files:** yok (doğrulama taskı).

- [ ] **Step 1: Tüm otomatik kapıları koş**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS.

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: uyarısız `Finished`.

Run: `pnpm build`
Expected: `✓ built`.

- [ ] **Step 2: Manuel test — migrate + duplicate**

Run: `pnpm tauri dev`. `%APPDATA%/macro-studio/profiles` altında eski `trigger`-lı JSON varsa listede `triggers`'a dönüştüğünü ve dosyanın yeniden yazıldığını doğrula. Bir profili Duplicate et: `(copy)` profili listede belirir, `{yeni-id}.json` + `{yeni-id}.ahk` oluşur, orijinal değişmez.

- [ ] **Step 3: Manuel test — trigger + aksiyon + suppress**

Aktif profile 2. trigger ekle (Add New Trigger → tuşa bas), bir Text aksiyonu + bir Custom aksiyon (`Send("x")`) ekle, Kaydet. `{id}.ahk` içeriğinde istiflenmiş `::` satırları ve custom satırların 4 boşluk girintili olduğunu dosyadan oku. `block_key=false` yapıp Kaydet → hotkey satırlarının `~` ile başladığını dosyadan doğrula. Overlay (`Ctrl+Alt+M`) ile profili başlat, hotkey'e bas: aksiyonlar çalışır, `block_key=false` iken tuş hedef uygulamaya da geçer.

- [ ] **Step 4: Bilinen kısıtı not et, commit**

Çalışan AHK süreci Kaydet ile otomatik restart almaz — ayar değişince overlay'den stop/start gerekir. Bunu `AGENTS.md` Gotchas'a tek satır ekle:

```bash
git add AGENTS.md
git commit -m "docs: note AHK restart needed after trigger edits"
```

## Self-Review

1. **Spec coverage:** Add New Trigger → Task 5 (Task 1+2 altyapı). Aksiyon/custom atama → Task 2 (`Custom`) + Task 5 (editör). Duplicate → Task 4. Block Original Keypress → Task 2 (`~`) + Task 3 (IPC) + Task 5 (wiring). Hepsi karşılanıyor.
2. **Placeholder scan:** Planda "TBD/TODO/sonra" yok; her kod adımı gerçek kod içeriyor; "benzer şekilde" atıfı yok.
3. **Type consistency:** Rust `triggers: Vec<String>` ↔ TS `triggers: string[]` ↔ invoke `triggers`; Rust `block_key: bool` ↔ invoke `blockKey` ↔ TS `block_key: boolean`; `Action::Custom{code}` ↔ `CustomAction{code}`. Task 3 ve 5 aynı isimleri kullanıyor.
4. **Review Focus:** 5 satırın beşi de bir task testine bağlı (Task 1 testi, Task 2'nin 4 testi, Task 4 manuel adımı). Boş değil.
