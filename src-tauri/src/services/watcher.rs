
pub fn should_suppress_foreground_event(exe: &str) -> bool {
    use crate::services::ahk_manager::AHK_EXE_FILE;
    exe.is_empty() || exe == "Unknown" || exe.eq_ignore_ascii_case(AHK_EXE_FILE)
}

#[cfg(windows)]
pub fn start_foreground_watcher(app_handle: tauri::AppHandle) {
    std::thread::spawn(move || unsafe {
        use tauri::Emitter;
        use windows::core::PWSTR;
        use windows::Win32::Foundation::HWND;
        use windows::Win32::System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT,
            PROCESS_QUERY_LIMITED_INFORMATION,
        };
        use windows::Win32::UI::Accessibility::{
            HWINEVENTHOOK, SetWinEventHook, UnhookWinEvent,
        };
        use windows::Win32::UI::WindowsAndMessaging::{
            DispatchMessageW, GetMessageW, GetWindowThreadProcessId, MSG, WINEVENT_OUTOFCONTEXT,
        };

        const EVENT_SYSTEM_FOREGROUND: u32 = 0x0003;

        static mut APP: Option<tauri::AppHandle> = None;
        static mut LAST_EXE: Option<String> = None;
        APP = Some(app_handle);

        extern "system" fn win_event_proc(
            _h_hook: HWINEVENTHOOK,
            event: u32,
            hwnd: HWND,
            _id_object: i32,
            _id_child: i32,
            _event_thread: u32,
            _event_time: u32,
        ) {
            if event != EVENT_SYSTEM_FOREGROUND {
                return;
            }
            let exe = get_process_name_from_hwnd(hwnd);
            if should_suppress_foreground_event(&exe) {
                return;
            }
            unsafe {
                let last = std::ptr::addr_of!(LAST_EXE).as_ref().and_then(|o| o.clone());
                if last.as_deref() == Some(exe.as_str()) {
                    return;
                }
                std::ptr::addr_of_mut!(LAST_EXE).write(Some(exe.clone()));
            }
            unsafe {
                if let Some(app) = std::ptr::addr_of!(APP).as_ref().and_then(|o| o.clone()) {
                    let _ = app.emit("active-window-changed", exe);
                }
            }
        }

        fn get_process_name_from_hwnd(hwnd: HWND) -> String {
            unsafe {
                let mut pid = 0;
                GetWindowThreadProcessId(hwnd, Some(&mut pid));
                if pid == 0 {
                    return String::new();
                }
                if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                    let mut buf = [0u16; 1024];
                    let mut size = buf.len() as u32;
                    if QueryFullProcessImageNameW(
                        handle,
                        PROCESS_NAME_FORMAT(0),
                        PWSTR(buf.as_mut_ptr()),
                        &mut size,
                    )
                    .is_ok()
                    {
                        let full = String::from_utf16_lossy(&buf[..size as usize]);
                        return full.split('\\').next_back().unwrap_or("").to_string();
                    }
                }
                String::new()
            }
        }

        let hook = SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            None,
            Some(win_event_proc),
            0,
            0,
            WINEVENT_OUTOFCONTEXT,
        );

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, HWND(std::ptr::null_mut()), 0, 0).into() {
            DispatchMessageW(&msg);
        }

        let _ = UnhookWinEvent(hook);
    });
}

#[cfg(not(windows))]
pub fn start_foreground_watcher(_app_handle: tauri::AppHandle) {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn suppresses_autohotkey_msgbox_window() {
        assert!(should_suppress_foreground_event("AutoHotkey64.exe"));
    }

    #[test]
    fn suppresses_autohotkey_regardless_of_case() {
        assert!(should_suppress_foreground_event("autohotkey64.exe"));
    }

    #[test]
    fn keeps_filtering_empty_and_unknown() {
        assert!(should_suppress_foreground_event(""));
        assert!(should_suppress_foreground_event("Unknown"));
    }

    #[test]
    fn passes_real_application_windows() {
        assert!(!should_suppress_foreground_event("Code.exe"));
        assert!(!should_suppress_foreground_event("notepad.exe"));
    }
}
