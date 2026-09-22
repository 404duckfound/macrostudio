use crate::services::ahk_manager::AhkProcessManager;

/// Uygulama yasam dongusu boyunca korunan paylasimli durum.
#[derive(Default, Clone)]
pub struct AppState {
    pub ahk_manager: AhkProcessManager,
}
