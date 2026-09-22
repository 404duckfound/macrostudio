use std::collections::HashMap;
use std::process::Command;
use std::sync::{Arc, Mutex};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Her profil ID'sini bir AHK PID'i ile eslestiren thread-safe yonetici.
#[derive(Default, Clone)]
pub struct AhkProcessManager {
    active_processes: Arc<Mutex<HashMap<String, u32>>>,
}

impl AhkProcessManager {
    pub fn start_profile(&self, profile_id: &str, script_path: &str) -> Result<u32, String> {
        let mut processes = self.active_processes.lock().map_err(|e| e.to_string())?;

        if let Some(&existing_pid) = processes.get(profile_id) {
            let _ = Self::stop_process_by_pid(existing_pid);
        }

        #[cfg(windows)]
        let child = Command::new("tools/AutoHotkey64.exe")
            .arg("/force")
            .arg(script_path)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("AHK baslatma hatasi: {e}"))?;

        #[cfg(not(windows))]
        let child = Command::new("AutoHotkey64")
            .arg(script_path)
            .spawn()
            .map_err(|e| format!("AHK baslatma hatasi: {e}"))?;

        let pid = child.id();
        std::mem::forget(child);
        processes.insert(profile_id.to_string(), pid);
        Ok(pid)
    }

    pub fn stop_profile(&self, profile_id: &str) -> Result<(), String> {
        let mut processes = self.active_processes.lock().map_err(|e| e.to_string())?;
        if let Some(pid) = processes.remove(profile_id) {
            Self::stop_process_by_pid(pid)?;
        }
        Ok(())
    }

    pub fn list(&self) -> Vec<(String, u32)> {
        self.active_processes
            .lock()
            .map(|m| m.iter().map(|(k, v)| (k.clone(), *v)).collect())
            .unwrap_or_default()
    }

    pub fn stop_process_by_pid(pid: u32) -> Result<(), String> {
        #[cfg(windows)]
        {
            let _ = Command::new("taskkill")
                .arg("/F")
                .arg("/PID")
                .arg(pid.to_string())
                .creation_flags(CREATE_NO_WINDOW)
                .output();
        }
        #[cfg(not(windows))]
        {
            let _ = Command::new("kill").arg(pid.to_string()).output();
        }
        Ok(())
    }
}
