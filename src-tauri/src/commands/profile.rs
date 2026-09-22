use serde::{Deserialize, Serialize};

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
    Ok(out)
}

#[tauri::command]
pub fn profile_save(profile: Profile) -> Result<(), String> {
    let dir = profiles_dir()?;
    let path = dir.join(format!("{}.json", profile.id));
    let content = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())
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
