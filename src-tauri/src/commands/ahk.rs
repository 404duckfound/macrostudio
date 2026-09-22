use tauri::State;

use crate::services::generator::{compile_to_ahk_v2, Action};
use crate::state::AppState;

/// Profili baslat: AHK betigini derle, dosyaya yaz, AutoHotkey64.exe ile calistir.
#[tauri::command]
pub async fn ahk_start_profile(
    state: State<'_, AppState>,
    profile_id: String,
    trigger: String,
    actions: Vec<Action>,
) -> Result<u32, String> {
    let script = compile_to_ahk_v2(&trigger, &actions);

    let config_dir = dirs_config_dir()?;
    let profiles_dir = std::path::Path::new(&config_dir).join("macro-studio/profiles");
    std::fs::create_dir_all(&profiles_dir).map_err(|e| e.to_string())?;
    let script_path = profiles_dir.join(format!("{profile_id}.ahk"));
    std::fs::write(&script_path, script).map_err(|e| e.to_string())?;

    let manager = state.ahk_manager.clone();
    let path_str = script_path.to_string_lossy().to_string();
    tauri::async_runtime::spawn_blocking(move || manager.start_profile(&profile_id, &path_str))
        .await
        .map_err(|e| e.to_string())?
}

/// Profili durdur.
#[tauri::command]
pub async fn ahk_stop_profile(state: State<'_, AppState>, profile_id: String) -> Result<(), String> {
    state.ahk_manager.stop_profile(&profile_id)
}

/// Sadece derle, calistirmadan AHK v2 kodu dondur (editor onizleme icin).
#[tauri::command]
pub fn ahk_compile_preview(trigger: String, actions: Vec<Action>) -> String {
    compile_to_ahk_v2(&trigger, &actions)
}

fn dirs_config_dir() -> Result<String, String> {
    std::env::var("APPDATA").map_err(|_| "APPDATA bulunamadi".to_string())
}
