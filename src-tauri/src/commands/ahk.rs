use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, State};

use crate::services::ahk_manager::{
    ahk_exe_candidates, resolve_ahk_exe, AHK_EXE_FILE,
};
use crate::services::generator::{compile_to_ahk_v2, Macro, Trigger};
use crate::commands::macros::load_macros;
use crate::state::AppState;

#[tauri::command]
pub async fn ahk_start_profile(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    profile_name: String,
    triggers: Vec<Trigger>,
) -> Result<u32, String> {
    let script = compile_to_ahk_v2(&triggers, &profile_name, &load_macros());

    let config_dir = dirs_config_dir()?;
    let profiles_dir = std::path::Path::new(&config_dir).join("macro-studio/profiles");
    std::fs::create_dir_all(&profiles_dir).map_err(|e| e.to_string())?;
    let script_path = profiles_dir.join(format!("{profile_id}.ahk"));
    std::fs::write(&script_path, script).map_err(|e| e.to_string())?;

    // `resolve` is the only API that mirrors the bundler's resource layout: a `..`
    // segment becomes `_up_` in both the MSI and the NSIS installer, and only
    // `resolve` synthesizes that. Joining `resource_dir()` by hand looks in a
    // folder that never exists.
    let resolved = app
        .path()
        .resolve("../tools/AutoHotkey64.exe", BaseDirectory::Resource)
        .ok();
    let cwd = std::env::current_dir().map_err(|e| format!("current_dir hatasi: {e}"))?;

    let candidates = ahk_exe_candidates(resolved.as_deref(), &cwd);
    let ahk_exe = resolve_ahk_exe(&candidates).ok_or_else(|| {
        format!(
            "{} bulunamadi. Aranan yerler: {}. Yeniden kurun.",
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

#[tauri::command]
pub async fn ahk_stop_profile(state: State<'_, AppState>, profile_id: String) -> Result<(), String> {
    state.ahk_manager.stop_profile(&profile_id)
}

#[tauri::command]
pub fn ahk_compile_preview(triggers: Vec<Trigger>, macros: Vec<Macro>) -> String {
    compile_to_ahk_v2(&triggers, "Preview", &macros)
}

#[tauri::command]
pub fn ahk_running_profiles(state: State<'_, AppState>) -> Vec<(String, u32)> {
    state.ahk_manager.list()
}

fn dirs_config_dir() -> Result<String, String> {
    std::env::var("APPDATA").map_err(|_| "APPDATA bulunamadi".to_string())
}
