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

#[cfg(windows)]
fn is_process_alive(pid: u32) -> bool {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        GetExitCodeProcess, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
    };

    const STILL_ACTIVE_CODE: u32 = 259;

    unsafe {
        let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
            return false;
        };
        let mut code = 0u32;
        let read_ok = GetExitCodeProcess(handle, &mut code).is_ok();
        let _ = CloseHandle(handle);
        read_ok && code == STILL_ACTIVE_CODE
    }
}

#[cfg(not(windows))]
fn is_process_alive(_pid: u32) -> bool {
    true
}

pub fn prune_dead<F: Fn(u32) -> bool>(processes: &mut HashMap<String, u32>, is_alive: F) -> usize {
    let before = processes.len();
    processes.retain(|_, pid| is_alive(*pid));
    before - processes.len()
}

/// Her profil ID'sini bir AHK PID'i ile eslestiren thread-safe yonetici.
#[derive(Default, Clone)]
pub struct AhkProcessManager {
    active_processes: Arc<Mutex<HashMap<String, u32>>>,
}

impl AhkProcessManager {
    pub fn start_profile(
        &self,
        profile_id: &str,
        script_path: &str,
        ahk_exe: &str,
    ) -> Result<u32, String> {
        let ahk_exe = Path::new(ahk_exe);
        if !ahk_exe.is_file() {
            return Err(format!("{} bulunamadi: {}", AHK_EXE_FILE, ahk_exe.display()));
        }

        let mut processes = self.active_processes.lock().map_err(|e| e.to_string())?;

        if let Some(&existing_pid) = processes.get(profile_id) {
            let _ = Self::stop_process_by_pid(existing_pid);
        }

        #[cfg(windows)]
        let child = Command::new(ahk_exe)
            .arg("/force")
            .arg(script_path)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("AHK baslatma hatasi: {e}"))?;

        #[cfg(not(windows))]
        let child = Command::new(ahk_exe)
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

    pub fn stop_all(&self) {
        self.stop_all_with(|pid| {
            let _ = Self::stop_process_by_pid(pid);
        });
    }

    /// Haritadaki her pid'i cikarip `kill`e gecirir. Gercek `taskkill` cagrisini
    /// testlerden ayirmak icin callback alir; `prune_dead` ile ayni desen.
    pub fn stop_all_with<F: FnMut(u32)>(&self, mut kill: F) {
        let Ok(mut processes) = self.active_processes.lock() else {
            return;
        };
        for (_, pid) in processes.drain() {
            kill(pid);
        }
    }

    pub fn list(&self) -> Vec<(String, u32)> {
        let mut processes = match self.active_processes.lock() {
            Ok(m) => m,
            Err(_) => return Vec::new(),
        };
        prune_dead(&mut processes, is_process_alive);
        processes.iter().map(|(k, v)| (k.clone(), *v)).collect()
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
        let dir = std::env::temp_dir().join("macro-studio-ahk-manager-tests-dir");
        std::fs::create_dir_all(&dir).unwrap();
        assert!(dir.is_dir());
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

    fn seeded() -> (AhkProcessManager, Vec<(&'static str, u32)>) {
        let mgr = AhkProcessManager::default();
        {
            let mut processes = mgr.active_processes.lock().unwrap();
            processes.insert("a".to_string(), 111);
            processes.insert("b".to_string(), 222);
        }
        (mgr, vec![("a", 111), ("b", 222)])
    }

    #[test]
    fn prune_dead_removes_stale_pids() {
        let (mgr, _) = seeded();
        let mut processes = mgr.active_processes.lock().unwrap();
        assert_eq!(prune_dead(&mut processes, |pid| pid == 111), 1);
        assert_eq!(processes.len(), 1);
        assert!(processes.contains_key("a"));
        assert!(!processes.contains_key("b"));
    }

    #[test]
    fn prune_dead_keeps_everything_when_all_alive() {
        let (mgr, _) = seeded();
        let mut processes = mgr.active_processes.lock().unwrap();
        assert_eq!(prune_dead(&mut processes, |_| true), 0);
        assert_eq!(processes.len(), 2);
    }

    #[test]
    fn list_drops_process_that_already_exited() {
        let mgr = AhkProcessManager::default();
        {
            let mut processes = mgr.active_processes.lock().unwrap();
            processes.insert("ghost".to_string(), 2147483632);
        }
        assert!(mgr.list().is_empty());
        let processes = mgr.active_processes.lock().unwrap();
        assert!(processes.is_empty());
    }

    #[test]
    fn stop_all_kills_every_pid_and_empties_map() {
        let (mgr, seeded_pids) = seeded();
        let mut killed = Vec::new();
        mgr.stop_all_with(|pid| killed.push(pid));
        killed.sort_unstable();
        let mut expected: Vec<u32> = seeded_pids.iter().map(|(_, pid)| *pid).collect();
        expected.sort_unstable();
        assert_eq!(killed, expected);
        assert!(mgr.active_processes.lock().unwrap().is_empty());
    }

    #[test]
    fn stop_all_on_empty_manager_is_a_noop() {
        let mgr = AhkProcessManager::default();
        let mut called = 0;
        mgr.stop_all_with(|_| called += 1);
        assert_eq!(called, 0);
    }
}
