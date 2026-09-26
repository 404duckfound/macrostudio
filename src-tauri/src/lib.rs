pub mod commands;
pub mod events;
pub mod services;
pub mod state;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

use crate::commands::{ahk::*, profile::*, system::*};
use crate::state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            ahk_start_profile,
            ahk_stop_profile,
            ahk_compile_preview,
            profile_list,
            profile_save,
            profile_delete,
            system_active_pids,
            system_visible_window_exes,
        ])
        .setup(|app| {
            init_tray(app)?;
            crate::services::watcher::start_foreground_watcher(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn init_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let quit_item = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
    let tray_menu = Menu::with_items(app, &[&quit_item])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&tray_menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app_handle, event| match event.id.as_ref() {
            "quit" => app_handle.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}
