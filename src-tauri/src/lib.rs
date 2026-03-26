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
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(Mutex::new(AppState::default()))
        .invoke_handler(tauri::generate_handler![
            commands::platform::get_platform_info,
            commands::docker::check_docker_health,
            commands::docker::get_docker_info,
            commands::docker::detect_docker,
            commands::system_check::run_system_check,
            commands::install::install_openclaw,
            commands::install::clean_install_dir,
            commands::install::cancel_install,
            commands::verify_installation::verify_installation,
            commands::config::read_config,
            commands::config::write_config,
            commands::config::validate_config,
            commands::monitoring::get_openclaw_status,
            commands::monitoring::get_agent_sessions,
            commands::monitoring::get_sandbox_containers,
            commands::monitoring::get_container_logs,
            commands::uninstall::uninstall_openclaw,
            commands::update::check_openclaw_update,
            commands::update::update_openclaw,
            commands::channels::get_channels,
            commands::channels::disconnect_channel,
            commands::channels::connect_channel,
            commands::channels::get_whatsapp_qr,
            commands::channels::validate_telegram_token,
            commands::channels::validate_discord_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
