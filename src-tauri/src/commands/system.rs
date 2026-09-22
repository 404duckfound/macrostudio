/// Aktif calisan AHK PID'lerini dondur (teşhis icin).
#[tauri::command]
pub async fn system_active_pids(state: tauri::State<'_, crate::state::AppState>) -> Result<Vec<(String, u32)>, String> {
    Ok(state.ahk_manager.list())
}

/// Calisan sureclerin exe adlarini benzersiz + sirali dondur (hedef secimi icin).
#[cfg(windows)]
#[tauri::command]
pub async fn system_running_exes() -> Result<Vec<String>, String> {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, TH32CS_SNAPPROCESS,
        PROCESSENTRY32W,
    };

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0).map_err(|e| e.to_string())?;
        let mut entry = PROCESSENTRY32W::default();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        let mut set = std::collections::BTreeSet::new();
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                let len = entry
                    .szExeFile
                    .iter()
                    .position(|&c| c == 0)
                    .unwrap_or(entry.szExeFile.len());
                set.insert(String::from_utf16_lossy(&entry.szExeFile[..len]));
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
        Ok(set.into_iter().collect())
    }
}

#[cfg(not(windows))]
#[tauri::command]
pub async fn system_running_exes() -> Result<Vec<String>, String> {
    Ok(Vec::new())
}
