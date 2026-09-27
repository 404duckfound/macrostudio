use std::path::PathBuf;

use tauri::{AppHandle, Manager, State};

use crate::services::ahk_manager::{
    ahk_exe_candidates, resolve_ahk_exe, AHK_EXE_FILE,
};
use crate::services::generator::{compile_to_ahk_v2, Trigger};
use crate::state::AppState;

/// Profili baslat: AHK betigini derle, dosyaya yaz, AutoHotkey64.exe ile calistir.
#[tauri::command]
pub async fn ahk_start_profile(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    triggers: Vec<Trigger>,
    block_key: bool,
) -> Result<u32, String> {
    let script = compile_to_ahk_v2(&triggers, block_key);

    let config_dir = dirs_config_dir()?;
    let profiles_dir = std::path::Path::new(&config_dir).join("macro-studio/profiles");
    std::fs::create_dir_all(&profiles_dir).map_err(|e| e.to_string())?;
    let script_path = profiles_dir.join(format!("{profile_id}.ahk"));
    std::fs::write(&script_path, script).map_err(|e| e.to_string())?;

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource_dir hatasi: {e}"))?;
    let exe_dir = std::env::current_exe()
        .map_err(|e| format!("current_exe hatasi: {e}"))?
        .parent()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    let cwd = std::env::current_dir().map_err(|e| format!("current_dir hatasi: {e}"))?;

    let candidates = ahk_exe_candidates(&resource_dir, &exe_dir, &cwd);
    let ahk_exe = resolve_ahk_exe(&candidates).ok_or_else(|| {
        format!(
            "{} bulunamadi. Aranan yerler: {}",
            AHK_EXE_FILE,
            candidates
                .iter()
                .map(|p| p.display().to_string())
                .collect::<Vec<_>>()
                .join(", ")
        )
    })?;

    let manager = state.ahk_manager.clone();
    let path_str = script_path.to_string_lossy().to_string();
    let exe_str = ahk_exe.to_string_lossy().to_string();
    tauri::async_runtime::spawn_blocking(move || {
        manager.start_profile(&profile_id, &path_str, &exe_str)
    })
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
pub fn ahk_compile_preview(triggers: Vec<Trigger>, block_key: bool) -> String {
    compile_to_ahk_v2(&triggers, block_key)
}

fn dirs_config_dir() -> Result<String, String> {
    std::env::var("APPDATA").map_err(|_| "APPDATA bulunamadi".to_string())
}
