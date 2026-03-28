// ClawStation — Tauri v2 desktop manager for OpenClaw

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
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let icon_bytes = include_bytes!("../icons/128x128.png");
            let icon = tauri::image::Image::from_bytes(icon_bytes).unwrap();
            window.set_icon(icon).unwrap();
            Ok(())
        })
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
            commands::channels::get_contacts,
            commands::channels::update_contact_status,
            commands::channels::get_activity,
            // Gateway integration (Phase 12)
            commands::nodejs::check_nodejs,
            commands::nodejs::check_openclaw,
            commands::nodejs::check_prerequisites,
            commands::nodejs::install_openclaw_script,
            commands::nodejs::reinstall_openclaw,
            commands::gateway::start_gateway,
            commands::gateway::stop_gateway,
            commands::gateway::restart_gateway,
            commands::gateway::get_gateway_status,
            commands::gateway::kill_gateway_on_port,
            commands::gateway_ws::gateway_ws_connect,
            commands::gateway_ws::gateway_ws_call,
            commands::gateway_ws::gateway_ws_disconnect,
            commands::models::fetch_provider_models,
            commands::control_ui::open_control_ui,
            commands::control_ui::close_control_ui,
            commands::desktop_config::read_desktop_config,
            commands::desktop_config::write_desktop_config,
            commands::desktop_config::write_auth_profile,
            commands::desktop_config::write_env_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
