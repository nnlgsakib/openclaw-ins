// OpenClaw Desktop — Tauri v2 application

mod commands;
mod docker;
mod error;
mod install;
mod state;

use state::AppState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::init())
        .plugin(tauri_plugin_notification::init())
        .manage(Mutex::new(AppState::default()))
        .invoke_handler(tauri::generate_handler![
            commands::platform::get_platform_info,
            commands::docker::check_docker_health,
            commands::docker::get_docker_info,
            commands::docker::detect_docker,
            commands::system_check::run_system_check,
            commands::install::install_openclaw,
            commands::verify_installation::verify_installation,
            commands::config::read_config,
            commands::config::write_config,
            commands::config::validate_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
