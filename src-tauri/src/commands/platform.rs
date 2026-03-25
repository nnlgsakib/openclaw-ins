use crate::state::AppState;

/// Returns the detected platform string (e.g. "windows", "linux").
#[tauri::command]
pub fn get_platform_info(state: tauri::State<'_, std::sync::Mutex<AppState>>) -> String {
    let platform = std::env::consts::OS.to_string();
    if let Ok(mut s) = state.lock() {
        s.platform = platform.clone();
    }
    platform
}
