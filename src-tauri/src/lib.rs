pub mod commands;
pub mod events;
pub mod services;
pub mod state;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

use crate::commands::{ahk::*, profile::*, system::*};
use crate::state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            ahk_start_profile,
            ahk_stop_profile,
            ahk_compile_preview,
            profile_list,
            profile_save,
            profile_delete,
            system_active_pids,
            system_running_exes,
        ])
        .setup(|app| {
            init_tray(app)?;
            configure_overlay_autohide(app.handle());
            crate::services::watcher::start_foreground_watcher(app.handle().clone());
            register_overlay_shortcut(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn init_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItem::with_id(app, "show_overlay", "Quick Profile Switcher", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
    let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&tray_menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app_handle, event| match event.id.as_ref() {
            "show_overlay" => show_overlay(app_handle),
            "quit" => app_handle.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

fn show_overlay(app_handle: &tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("overlay") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn configure_overlay_autohide(app_handle: &tauri::AppHandle) {
    if let Some(overlay_window) = app_handle.get_webview_window("overlay") {
        let window_clone = overlay_window.clone();
        overlay_window.on_window_event(move |event| {
            if let tauri::WindowEvent::Focused(is_focused) = event {
                if !is_focused {
                    let _ = window_clone.hide();
                }
            }
        });
    }
}

fn register_overlay_shortcut(app_handle: &tauri::AppHandle) {
    use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyM);
    if let Err(e) = app_handle.global_shortcut().register(shortcut) {
        let _ = app_handle.emit("global-shortcut-error", format!("Shortcut conflict: {e}"));
    }
}
