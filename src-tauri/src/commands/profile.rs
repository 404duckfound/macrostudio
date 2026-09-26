use serde::{Deserialize, Serialize};

use crate::services::generator::{compile_to_ahk_v2, Action, Trigger};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub triggers: Vec<Trigger>,
    pub target_exe: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_true")]
    pub block_key: bool,
}

fn default_true() -> bool {
    true
}

/// Tek dosyalik profili cozumler; bozuk icerik disinda tutulmasi icin None doner.
fn parse_profile_entry(content: &str) -> Option<(Profile, bool)> {
    let value: serde_json::Value = serde_json::from_str(content).ok()?;
    let needs_rewrite = !is_new_triggers(value.get("triggers"));
    let migrated = migrate_value(value);
    let profile: Profile = serde_json::from_value(migrated).ok()?;
    Some((profile, needs_rewrite))
}

fn is_new_triggers(v: Option<&serde_json::Value>) -> bool {
    match v {
        Some(serde_json::Value::Array(arr)) => arr.iter().all(|x| x.is_object()),
        _ => false,
    }
}

/// Eski semalari yeni semaya cevirir: legacy "trigger" + paylasilan "actions"
/// ve string-dizisi "triggers", her biri kendi aksiyonlarini tasiyan
/// trigger objelerine donusur. Legacy anahtarlar silinir.
fn migrate_value(mut v: serde_json::Value) -> serde_json::Value {
    if is_new_triggers(v.get("triggers")) {
        return v;
    }
    let shared: Vec<Action> = v
        .get("actions")
        .and_then(|a| serde_json::from_value(a.clone()).ok())
        .unwrap_or_default();
    let mut shortcuts: Vec<String> = match v.get("triggers") {
        Some(serde_json::Value::Array(arr)) => arr
            .iter()
            .filter_map(|x| x.as_str().map(|s| s.to_string()))
            .collect(),
        _ => Vec::new(),
    };
    if shortcuts.is_empty() {
        shortcuts.push(
            v.get("trigger")
                .and_then(|t| t.as_str())
                .unwrap_or("F9")
                .to_string(),
        );
    }
    if let Some(obj) = v.as_object_mut() {
        let triggers: Vec<serde_json::Value> = shortcuts
            .into_iter()
            .map(|s| {
                serde_json::json!({ "shortcut": s, "actions": shared })
            })
            .collect();
        obj.insert(
            "triggers".to_string(),
            serde_json::Value::Array(triggers),
        );
        obj.remove("trigger");
        obj.remove("actions");
    }
    v
}

fn profiles_dir() -> Result<std::path::PathBuf, String> {
    let appdata = std::env::var("APPDATA").map_err(|_| "APPDATA bulunamadi".to_string())?;
    let dir = std::path::Path::new(&appdata).join("macro-studio/profiles");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn write_ahk_file(dir: &std::path::Path, profile: &Profile) {
    let script = compile_to_ahk_v2(&profile.triggers, profile.block_key);
    let path = dir.join(format!("{}.ahk", profile.id));
    let _ = std::fs::write(path, script);
}

#[tauri::command]
pub fn profile_list() -> Result<Vec<Profile>, String> {
    let dir = profiles_dir()?;
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let content = std::fs::read_to_string(entry.path()).map_err(|e| e.to_string())?;
        let Some((p, needs_rewrite)) = parse_profile_entry(&content) else {
            continue;
        };
        if needs_rewrite {
            let pretty = serde_json::to_string_pretty(&p).map_err(|e| e.to_string())?;
            std::fs::write(entry.path(), pretty).map_err(|e| e.to_string())?;
        }
        out.push(p);
    }
    for p in &out {
        let ahk = dir.join(format!("{}.ahk", p.id));
        if !ahk.exists() {
            write_ahk_file(&dir, p);
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn profile_save(profile: Profile) -> Result<(), String> {
    let dir = profiles_dir()?;
    let path = dir.join(format!("{}.json", profile.id));
    let content = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    write_ahk_file(&dir, &profile);
    Ok(())
}

#[tauri::command]
pub fn profile_delete(profile_id: String) -> Result<(), String> {
    let dir = profiles_dir()?;
    let json = dir.join(format!("{profile_id}.json"));
    let ahk = dir.join(format!("{profile_id}.ahk"));
    let _ = std::fs::remove_file(json);
    let _ = std::fs::remove_file(ahk);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_single_trigger_migrates_to_triggers() {
        let old = serde_json::json!({
            "id": "x", "name": "N", "trigger": "Ctrl+Shift+F1",
            "target_exe": null, "enabled": true,
            "actions": [{ "type": "delay", "ms": 5 }]
        });
        let migrated = migrate_value(old);
        let p: Profile = serde_json::from_value(migrated).unwrap();
        assert_eq!(p.triggers.len(), 1);
        assert_eq!(p.triggers[0].shortcut, "Ctrl+Shift+F1");
        assert_eq!(p.triggers[0].actions.len(), 1);
        assert!(p.block_key);
    }

    #[test]
    fn string_array_triggers_share_actions() {
        let old = serde_json::json!({
            "id": "x", "name": "N", "triggers": ["F9", "F10"],
            "enabled": true, "block_key": false,
            "actions": [{ "type": "send_keys", "payload": "hi" }]
        });
        let (p, needs_rewrite) = parse_profile_entry(&old.to_string()).unwrap();
        assert!(needs_rewrite);
        assert_eq!(p.triggers.len(), 2);
        assert!(p.triggers.iter().all(|t| t.actions.len() == 1));
        assert!(!p.block_key);
    }

    #[test]
    fn corrupt_json_entry_is_skipped() {
        assert!(parse_profile_entry("not json{{{").is_none());
    }

    #[test]
    fn legacy_entry_reports_rewrite() {
        let (_, needs_rewrite) = parse_profile_entry(
            r#"{"id":"x","name":"N","trigger":"F9","enabled":true,"actions":[]}"#,
        )
        .unwrap();
        assert!(needs_rewrite);
    }
}
