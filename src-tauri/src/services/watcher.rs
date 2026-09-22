//! RESEARCH.md bolum 4: SetWinEventHook tabanli foreground izleyici.
//! Olaylari frontend'e `active-window-changed` event'i ile iletir.

#[cfg(windows)]
pub fn start_foreground_watcher(app_handle: tauri::AppHandle) {
    std::thread::spawn(move || unsafe {
        use tauri::Emitter;
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
            WINEVENT_SKIPOWNPROCESS,
        };

        const EVENT_SYSTEM_FOREGROUND: u32 = 0x0003;

        static mut APP: Option<tauri::AppHandle> = None;
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
            if event == EVENT_SYSTEM_FOREGROUND {
                let exe = get_process_name_from_hwnd(hwnd);
                unsafe {
                    if let Some(app) = std::ptr::addr_of!(APP).as_ref().and_then(|o| o.clone()) {
                        let _ = app.emit("active-window-changed", exe);
                    }
                }
            }
        }

        fn get_process_name_from_hwnd(hwnd: HWND) -> String {
            unsafe {
                let mut pid = 0;
                GetWindowThreadProcessId(hwnd, Some(&mut pid));
                if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                    let mut buf = [0u16; 1024];
                    let mut size = buf.len() as u32;
                    if QueryFullProcessImageNameW(
                        handle,
                        PROCESS_NAME_FORMAT(0),
                        windows::core::PWSTR(buf.as_mut_ptr()),
                        &mut size,
                    )
                    .is_ok()
                    {
                        let full = String::from_utf16_lossy(&buf[..size as usize]);
                        return full.split('\\').last().unwrap_or("").to_string();
                    }
                }
                "Unknown".to_string()
            }
        }

        let hook = SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND,
            EVENT_SYSTEM_FOREGROUND,
            None,
            Some(win_event_proc),
            0,
            0,
            WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
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
