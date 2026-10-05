use crate::services::ahk_manager::AhkProcessManager;

#[derive(Default, Clone)]
pub struct AppState {
    pub ahk_manager: AhkProcessManager,
}
