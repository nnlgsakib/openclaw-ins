use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tokio::io::AsyncBufReadExt;

use super::silent::{run_with_timeout, silent_cmd, QUICK_TIMEOUT};

/// Node.js installation and version info.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeJsInfo {
    pub installed: bool,
    pub version: Option<String>,
    pub meets_minimum: bool,
    pub meets_recommended: bool,
}

/// OpenClaw installation status.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenClawInfo {
    pub installed: bool,
    pub version: Option<String>,
}

/// Combined prerequisites check result.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrerequisitesInfo {
    pub nodejs: NodeJsInfo,
    pub openclaw: OpenClawInfo,
}

/// Check if Node.js is installed and meets version requirements.
///
/// Minimum: 22.14.0, Recommended: 24.0.0
#[tauri::command]
pub async fn check_nodejs() -> Result<NodeJsInfo, String> {
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = silent_cmd("cmd");
        c.args(["/c", "node", "--version"]);
        c
    } else {
        let mut c = silent_cmd("node");
        c.arg("--version");
        c
    };

    match run_with_timeout(&mut cmd, QUICK_TIMEOUT).await {
        Ok(out) if out.status.success() => {
            let version_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let version_clean = version_str.trim_start_matches('v');
            let (meets_minimum, meets_recommended) = parse_node_version(version_clean);

            Ok(NodeJsInfo {
                installed: true,
                version: Some(version_str),
                meets_minimum,
                meets_recommended,
            })
        }
        _ => Ok(NodeJsInfo {
            installed: false,
            version: None,
            meets_minimum: false,
            meets_recommended: false,
        }),
    }
}

/// Check if OpenClaw is installed.
///
/// Tries multiple methods:
/// 1. `openclaw --version` (global install)
/// 2. `npx openclaw --version` (npx fallback)
/// 3. Filesystem search for openclaw binary
#[tauri::command]
pub async fn check_openclaw() -> Result<OpenClawInfo, String> {
    let attempts: Vec<(&str, Vec<&str>)> = if cfg!(target_os = "windows") {
        vec![
            ("cmd", vec!["/c", "openclaw", "--version"]),
            ("cmd", vec!["/c", "npx", "openclaw", "--version"]),
        ]
    } else {
        vec![
            ("openclaw", vec!["--version"]),
            ("npx", vec!["openclaw", "--version"]),
        ]
    };

    for (cmd_name, args) in &attempts {
        let mut cmd = silent_cmd(cmd_name);
        cmd.args(args);
        if let Ok(out) = run_with_timeout(&mut cmd, QUICK_TIMEOUT).await {
            if out.status.success() {
                let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !version.is_empty() {
                    return Ok(OpenClawInfo {
                        installed: true,
                        version: Some(version),
                    });
                }
            }
        }
    }

    // Fallback: direct filesystem search for the openclaw binary
    if let Some(binary_path) = find_openclaw_binary() {
        let mut cmd = silent_cmd(&binary_path);
        cmd.arg("--version");
        if let Ok(out) = run_with_timeout(&mut cmd, QUICK_TIMEOUT).await {
            if out.status.success() {
                let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !version.is_empty() {
                    return Ok(OpenClawInfo {
                        installed: true,
                        version: Some(version),
                    });
                }
            }
        }
    }

    Ok(OpenClawInfo {
        installed: false,
        version: None,
    })
}

/// Check all prerequisites (Node.js + OpenClaw).
#[tauri::command]
pub async fn check_prerequisites() -> Result<PrerequisitesInfo, String> {
    let nodejs = check_nodejs().await?;
    let openclaw = check_openclaw().await?;
    Ok(PrerequisitesInfo { nodejs, openclaw })
}

/// Detect all available package managers.
/// On Windows: npm first (most reliable), then pnpm, then yarn.
/// On Linux/macOS: pnpm > yarn > npm (community preference).
async fn detect_package_managers() -> Vec<String> {
    let managers: &[&str] = if cfg!(target_os = "windows") {
        &["npm", "pnpm", "yarn"]
    } else {
        &["pnpm", "yarn", "npm"]
    };
    let mut available = Vec::new();

    for mgr in managers {
        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = silent_cmd("cmd");
            c.args(["/c", mgr, "--version"]);
            c
        } else {
            let mut c = silent_cmd(mgr);
            c.arg("--version");
            c
        };

        if let Ok(out) = run_with_timeout(&mut cmd, QUICK_TIMEOUT).await {
            if out.status.success() {
                available.push(mgr.to_string());
            }
        }
    }

    available
}

/// Detect which package manager was used to install openclaw globally.
///
/// Checks each manager's global install directory for the openclaw package.
/// Returns the manager name if found, or None if detection fails.
async fn detect_install_manager() -> Option<String> {
    // Check npm global root
    let npm_root = {
        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = silent_cmd("cmd");
            c.args(["/c", "npm", "root", "-g"]);
            c
        } else {
            let mut c = silent_cmd("npm");
            c.args(["root", "-g"]);
            c
        };
        run_with_timeout(&mut cmd, QUICK_TIMEOUT)
            .await
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    };

    if let Some(root) = &npm_root {
        let openclaw_dir = std::path::PathBuf::from(root).join("openclaw");
        if openclaw_dir.exists() {
            return Some("npm".to_string());
        }
    }

    // Check pnpm global root
    let pnpm_root = {
        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = silent_cmd("cmd");
            c.args(["/c", "pnpm", "root", "-g"]);
            c
        } else {
            let mut c = silent_cmd("pnpm");
            c.args(["root", "-g"]);
            c
        };
        run_with_timeout(&mut cmd, QUICK_TIMEOUT)
            .await
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
    };

    if let Some(root) = &pnpm_root {
        let openclaw_dir = std::path::PathBuf::from(root).join("openclaw");
        if openclaw_dir.exists() {
            return Some("pnpm".to_string());
        }
    }

    None
}

/// Install OpenClaw using package managers with fallback.
///
/// On Windows, tries npm first (most reliable). Falls back to other managers silently.
/// Only shows errors if ALL managers fail.
/// Streams output as "install-output" Tauri events.
#[tauri::command]
pub async fn install_openclaw_script(app: tauri::AppHandle) -> Result<String, String> {
    let managers = detect_package_managers().await;

    if managers.is_empty() {
        return Err("No package manager found (pnpm, yarn, or npm required). Install Node.js from https://nodejs.org".to_string());
    }

    let _ = app.emit("install-output", "Installing OpenClaw...".to_string());

    // Track failures for final error message
    let mut failures: Vec<String> = Vec::new();

    for pkg_manager in &managers {
        let install_args: Vec<&str> = match pkg_manager.as_str() {
            "pnpm" => vec!["add", "-g", "openclaw@latest"],
            "yarn" => vec!["global", "add", "openclaw@latest"],
            "npm" => vec!["install", "-g", "openclaw@latest"],
            _ => continue,
        };

        let _ = app.emit(
            "install-output",
            format!("Running: {pkg_manager} {}", install_args.join(" ")),
        );

        let child = if cfg!(target_os = "windows") {
            let mut args = vec!["/c", pkg_manager.as_str()];
            args.extend(&install_args);
            silent_cmd("cmd")
                .args(&args)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
        } else {
            silent_cmd(pkg_manager)
                .args(&install_args)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
        };

        let mut child = match child {
            Ok(c) => c,
            Err(e) => {
                failures.push(format!("{pkg_manager}: failed to start ({e})"));
                continue;
            }
        };

        let stdout = match child.stdout.take() {
            Some(s) => s,
            None => continue,
        };
        let stderr = match child.stderr.take() {
            Some(s) => s,
            None => continue,
        };

        let app_stdout = app.clone();
        let stdout_task = tokio::spawn(async move {
            let reader = tokio::io::BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() {
                    let _ = app_stdout.emit("install-output", &line);
                }
            }
        });

        // Collect stderr silently — only surface on failure
        let stderr_task = tokio::spawn(async move {
            let mut collected = String::new();
            let reader = tokio::io::BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() {
                    collected.push_str(&line);
                    collected.push('\n');
                }
            }
            collected
        });

        let status = child.wait().await;
        let (_, stderr_output) = tokio::join!(stdout_task, stderr_task);
        let stderr_text = stderr_output.unwrap_or_default();

        match status {
            Ok(s) if s.success() => {
                let _ = app.emit(
                    "install-output",
                    format!("{pkg_manager} install completed, verifying..."),
                );

                let verify = check_openclaw().await?;
                if verify.installed {
                    let version = verify.version.unwrap_or_else(|| "unknown".to_string());
                    let _ = app.emit(
                        "install-output",
                        format!("OpenClaw {version} installed successfully via {pkg_manager}"),
                    );
                    return Ok(version);
                }
                // Reported success but binary not found
                failures.push(format!(
                    "{pkg_manager}: reported success but openclaw not found on PATH"
                ));
                continue;
            }
            Ok(s) => {
                let exit_code = s.code().unwrap_or(-1);
                // Check for known error patterns
                let reason = if stderr_text.contains("ENOENT") {
                    "corrupted package cache — try clearing cache".to_string()
                } else if stderr_text.contains("EACCES") || stderr_text.contains("permission denied")
                {
                    "permission denied — try running as administrator".to_string()
                } else if stderr_text.contains("packageManager") {
                    "packageManager field conflict in project config".to_string()
                } else {
                    format!("exit code {exit_code}")
                };
                failures.push(format!("{pkg_manager}: {reason}"));
                continue;
            }
            Err(e) => {
                failures.push(format!("{pkg_manager}: process error ({e})"));
                continue;
            }
        }
    }

    // All managers failed — build helpful error message
    let tried = managers.join(", ");
    let failure_details: String = failures
        .iter()
        .map(|f| format!("  - {f}"))
        .collect::<Vec<_>>()
        .join("\n");

    Err(format!(
        "Failed to install OpenClaw. Tried: {tried}\n\nFailure details:\n{failure_details}\n\nTry running manually: npm install -g openclaw@latest"
    ))
}

/// Uninstall OpenClaw, then reinstall a clean copy.
///
/// Detects which package manager installed openclaw and uses that for removal.
/// Falls back to trying all managers silently if detection fails.
#[tauri::command]
pub async fn reinstall_openclaw(app: tauri::AppHandle) -> Result<String, String> {
    let _ = app.emit(
        "install-output",
        "Removing existing OpenClaw installation...".to_string(),
    );

    // Try to detect which manager installed openclaw
    let detected = detect_install_manager().await;

    if let Some(ref manager) = detected {
        let _ = app.emit(
            "install-output",
            format!("Detected install via {manager}, removing..."),
        );
        let uninstall_args: Vec<&str> = match manager.as_str() {
            "pnpm" => vec!["remove", "-g", "openclaw"],
            "yarn" => vec!["global", "remove", "openclaw"],
            "npm" => vec!["uninstall", "-g", "openclaw"],
            _ => vec!["uninstall", "-g", "openclaw"],
        };

        let _ = run_package_manager(manager, &uninstall_args, &app, true).await;
    } else {
        // Detection failed — try all managers silently
        let managers = detect_package_managers().await;
        for manager in &managers {
            let uninstall_args: Vec<&str> = match manager.as_str() {
                "pnpm" => vec!["remove", "-g", "openclaw"],
                "yarn" => vec!["global", "remove", "openclaw"],
                "npm" => vec!["uninstall", "-g", "openclaw"],
                _ => continue,
            };

            // Silent — don't show errors for "not installed here" cases
            let _ = run_package_manager(manager, &uninstall_args, &app, true).await;
        }
    }

    let _ = app.emit(
        "install-output",
        "Uninstall complete. Installing fresh copy...".to_string(),
    );

    // Now do a clean install
    install_openclaw_script(app).await
}

/// Run a package manager command, optionally suppressing error output.
///
/// When `silent` is true, stderr is collected but not emitted to the frontend.
/// Returns Ok(output) on success, Err(reason) on failure.
async fn run_package_manager(
    manager: &str,
    args: &[&str],
    app: &tauri::AppHandle,
    silent: bool,
) -> Result<std::process::Output, String> {
    let child = if cfg!(target_os = "windows") {
        let mut cmd_args = vec!["/c", manager];
        cmd_args.extend(args);
        silent_cmd("cmd")
            .args(&cmd_args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
    } else {
        silent_cmd(manager)
            .args(args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
    };

    let mut child = child.map_err(|e| format!("Failed to start {manager}: {e}"))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let app_clone = app.clone();

    // Always capture stdout
    if let Some(stdout) = stdout {
        let app_c = app_clone.clone();
        tokio::spawn(async move {
            let reader = tokio::io::BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() && !silent {
                    let _ = app_c.emit("install-output", &line);
                }
            }
        });
    }

    // Capture stderr — emit only if not silent
    if let Some(stderr) = stderr {
        let app_c = app_clone;
        tokio::spawn(async move {
            let reader = tokio::io::BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() && !silent {
                    let _ = app_c.emit("install-output", format!("[warn] {line}"));
                }
            }
        });
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("{manager} process error: {e}"))?;

    // Build a minimal Output for status checking
    Ok(std::process::Output {
        status,
        stdout: Vec::new(),
        stderr: Vec::new(),
    })
}

// ─── Private helpers ──────────────────────────────────────────────

fn parse_node_version(version: &str) -> (bool, bool) {
    let parts: Vec<u32> = version.split('.').filter_map(|s| s.parse().ok()).collect();

    if parts.len() < 2 {
        return (false, false);
    }

    let major = parts[0];
    let minor = parts[1];

    // Minimum: 22.14.0
    let meets_minimum = major > 22 || (major == 22 && minor >= 14);
    // Recommended: 24.0.0
    let meets_recommended = major >= 24;

    (meets_minimum, meets_recommended)
}

/// Search common installation directories for the `openclaw` binary.
///
/// This is a fallback for production builds where PATH augmentation alone
/// may not be enough (e.g., non-standard install locations).
/// Returns the full path to the binary if found.
pub fn find_openclaw_binary() -> Option<String> {
    let candidates: Vec<std::path::PathBuf> = if cfg!(target_os = "windows") {
        let mut paths = Vec::new();
        if let Ok(appdata) = std::env::var("APPDATA") {
            let base = std::path::PathBuf::from(&appdata);
            paths.push(base.join("npm").join("openclaw.cmd"));
            paths.push(base.join("npm").join("openclaw"));
            paths.push(base.join("nvm").join("openclaw.cmd"));
        }
        if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
            paths.push(
                std::path::PathBuf::from(&localappdata)
                    .join("pnpm")
                    .join("openclaw.cmd"),
            );
            paths.push(
                std::path::PathBuf::from(&localappdata)
                    .join("pnpm")
                    .join("openclaw"),
            );
        }
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            paths.push(
                std::path::PathBuf::from(&userprofile)
                    .join(".yarn")
                    .join("bin")
                    .join("openclaw.cmd"),
            );
        }
        if let Ok(program_files) = std::env::var("ProgramFiles") {
            paths.push(
                std::path::PathBuf::from(program_files)
                    .join("nodejs")
                    .join("openclaw.cmd"),
            );
        }
        // NVM_HOME — nvm-windows custom install
        if let Ok(nvm_home) = std::env::var("NVM_HOME") {
            paths.push(std::path::PathBuf::from(&nvm_home).join("openclaw.cmd"));
        }
        // Scan common non-standard nvm locations (e.g., D:\soft\nvm)
        for drive in &["C", "D", "E", "F"] {
            for base in &["soft", "tools", "dev", "opt", "programs"] {
                let nvm_root = format!("{drive}:\\{base}\\nvm");
                let nvm_path = std::path::PathBuf::from(&nvm_root);
                if nvm_path.exists() {
                    paths.push(nvm_path.join("nodejs").join("openclaw.cmd"));
                    let pnpm_global = nvm_path.join("pnpm-global");
                    if pnpm_global.exists() {
                        paths.push(pnpm_global.join("openclaw.cmd"));
                        paths.push(pnpm_global.join("openclaw"));
                    }
                }
            }
        }
        paths
    } else {
        let mut paths = Vec::new();
        if let Ok(home) = std::env::var("HOME") {
            let home_path = std::path::PathBuf::from(&home);
            paths.push(home_path.join(".local").join("bin").join("openclaw"));
            paths.push(home_path.join(".npm").join("bin").join("openclaw"));
            paths.push(home_path.join(".pnpm").join("openclaw"));
        }
        paths.push(std::path::PathBuf::from("/usr/local/bin/openclaw"));
        paths.push(std::path::PathBuf::from("/usr/bin/openclaw"));
        paths
    };

    for path in &candidates {
        if path.exists() {
            return Some(path.to_string_lossy().to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_node_version_detects_minimum() {
        assert!(parse_node_version("22.14.0").0);
        assert!(!parse_node_version("22.13.0").0);
    }

    #[test]
    fn parse_node_version_detects_recommended() {
        assert!(parse_node_version("24.0.0").1);
        assert!(!parse_node_version("23.9.9").1);
    }
}
