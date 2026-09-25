use serde::{Deserialize, Serialize};

use crate::services::generator::{compile_to_ahk_v2, Action};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub trigger: String,
    pub target_exe: Option<String>,
    pub enabled: bool,
    pub actions: serde_json::Value,
}

fn profiles_dir() -> Result<std::path::PathBuf, String> {
    let appdata = std::env::var("APPDATA").map_err(|_| "APPDATA bulunamadi".to_string())?;
    let dir = std::path::Path::new(&appdata).join("macro-studio/profiles");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn write_ahk_file(dir: &std::path::Path, profile: &Profile) {
    let actions: Vec<Action> = serde_json::from_value(profile.actions.clone()).unwrap_or_default();
    let script = compile_to_ahk_v2(&profile.trigger, &actions);
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
        if let Ok(p) = serde_json::from_str::<Profile>(&content) {
            out.push(p);
        }
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
