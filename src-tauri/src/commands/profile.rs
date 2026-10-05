use serde::{Deserialize, Serialize};

use crate::services::generator::{compile_to_ahk_v2, Trigger};
use crate::commands::macros::load_macros;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub triggers: Vec<Trigger>,
    pub target_exe: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

fn profiles_dir() -> Result<std::path::PathBuf, String> {
    let appdata = std::env::var("APPDATA").map_err(|_| "APPDATA bulunamadi".to_string())?;
    let dir = std::path::Path::new(&appdata).join("macro-studio/profiles");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn write_ahk_file(dir: &std::path::Path, profile: &Profile) {
    let script = compile_to_ahk_v2(&profile.triggers, &profile.name, &load_macros());
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
        let Ok(p) = serde_json::from_str::<Profile>(&content) else {
            continue;
        };
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
    fn corrupt_json_entry_is_skipped() {
        assert!(serde_json::from_str::<Profile>("not json{{{").is_err());
    }

    // Triggers written before blocking moved down from the profile have no
    // per-trigger field, so they parse as passthrough. Losing blocking on
    // upgrade is the accepted consequence, not an oversight -- locking it here
    // so a future "helpful" default cannot quietly change stored behaviour.
    #[test]
    fn trigger_without_block_key_defaults_to_passthrough() {
        let old = serde_json::json!({
            "id": "x", "name": "N", "enabled": true, "block_key": true,
            "triggers": [{ "shortcut": "F9", "actions": [] }]
        });
        let p: Profile = serde_json::from_value(old).unwrap();
        assert!(!p.triggers[0].block_key);
    }

    // The old profile-level field is simply ignored, so files written by the
    // previous version still load instead of disappearing from the list.
    #[test]
    fn stale_profile_level_block_key_is_ignored() {
        let old = r#"{"id":"x","name":"N","enabled":true,"block_key":true,
            "triggers":[{"shortcut":"F9","actions":[]}]}"#;
        let p: Profile = serde_json::from_str(old).unwrap();
        assert_eq!(p.triggers.len(), 1);
        assert!(!p.triggers[0].block_key);
    }
}
