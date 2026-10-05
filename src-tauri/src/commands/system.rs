#[tauri::command]
pub async fn system_active_pids(state: tauri::State<'_, crate::state::AppState>) -> Result<Vec<(String, u32)>, String> {
    Ok(state.ahk_manager.list())
}

#[cfg(windows)]
#[tauri::command]
pub async fn system_visible_window_exes() -> Result<Vec<String>, String> {
    use windows::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM};
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowTextLengthW, GetWindowThreadProcessId, IsWindowVisible,
    };

    unsafe extern "system" fn collect(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let out = &mut *(lparam.0 as *mut Vec<HWND>);
        out.push(hwnd);
        BOOL(1)
    }

    fn exe_of_window(hwnd: HWND) -> Option<String> {
        unsafe {
            if !IsWindowVisible(hwnd).as_bool() {
                return None;
            }
            if GetWindowTextLengthW(hwnd) == 0 {
                return None;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            if pid == 0 {
                return None;
            }
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
            let mut buf = [0u16; 1024];
            let mut size = buf.len() as u32;
            let exe = if QueryFullProcessImageNameW(
                handle,
                PROCESS_NAME_FORMAT(0),
                windows::core::PWSTR(buf.as_mut_ptr()),
                &mut size,
            )
            .is_ok()
            {
                let full = String::from_utf16_lossy(&buf[..size as usize]);
                full.rsplit(['\\', '/']).next().filter(|s| !s.is_empty()).map(str::to_string)
            } else {
                None
            };
            let _ = CloseHandle(handle);
            exe
        }
    }

    unsafe {
        let mut hwnds: Vec<HWND> = Vec::new();
        EnumWindows(Some(collect), LPARAM(&mut hwnds as *mut Vec<HWND> as isize))
            .map_err(|e| e.to_string())?;

        let mut set = std::collections::BTreeSet::new();
        for hwnd in hwnds {
            if let Some(exe) = exe_of_window(hwnd) {
                set.insert(exe);
            }
        }
        Ok(set.into_iter().collect())
    }
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn system_visible_window_exes() -> Result<Vec<String>, String> {
    Ok(Vec::new())
}
