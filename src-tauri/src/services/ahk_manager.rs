use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub const AHK_EXE_FILE: &str = "AutoHotkey64.exe";

pub fn ahk_exe_candidates(resource_dir: &Path, exe_dir: &Path, cwd: &Path) -> Vec<PathBuf> {
    vec![
        resource_dir.join("tools").join(AHK_EXE_FILE),
        exe_dir.join("..").join("..").join("tools").join(AHK_EXE_FILE),
        cwd.join("tools").join(AHK_EXE_FILE),
    ]
}

pub fn resolve_ahk_exe(candidates: &[PathBuf]) -> Option<PathBuf> {
    candidates.iter().find(|p| p.is_file()).cloned()
}

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn tmp_file(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join("macro-studio-ahk-manager-tests");
        std::fs::create_dir_all(&dir).unwrap();
        let p = dir.join(name);
        std::fs::write(&p, b"x").unwrap();
        p
    }

    #[test]
    fn resolve_picks_first_existing_candidate() {
        let present = tmp_file("a-present.exe");
        let missing = std::env::temp_dir().join("macro-studio-ahk-manager-tests/nope.exe");
        let out = resolve_ahk_exe(&[missing.clone(), present.clone()]);
        assert_eq!(out, Some(present));
    }

    #[test]
    fn resolve_returns_none_when_nothing_exists() {
        let missing = std::env::temp_dir().join("macro-studio-ahk-manager-tests/absent.exe");
        assert_eq!(resolve_ahk_exe(&[missing]), None);
    }

    #[test]
    fn resolve_ignores_directories() {
        let dir = std::env::temp_dir().join("macro-studio-ahk-manager-tests");
        assert_eq!(resolve_ahk_exe(&[dir]), None);
    }

    #[test]
    fn candidates_cover_bundle_then_local_then_dev() {
        let out = ahk_exe_candidates(
            Path::new("C:/bundle"),
            Path::new("C:/app/bin"),
            Path::new("C:/repo"),
        );
        let names: Vec<String> = out
            .iter()
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .collect();
        assert_eq!(names[0], "C:/bundle/tools/AutoHotkey64.exe");
        assert_eq!(names[1], "C:/app/bin/../../tools/AutoHotkey64.exe");
        assert_eq!(names[2], "C:/repo/tools/AutoHotkey64.exe");
        assert_eq!(out.len(), 3);
    }
}
