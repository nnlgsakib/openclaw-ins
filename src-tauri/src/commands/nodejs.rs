use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tokio::io::AsyncBufReadExt;

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
    let output = if cfg!(target_os = "windows") {
        tokio::process::Command::new("cmd")
            .args(["/c", "node", "--version"])
            .output()
            .await
    } else {
        tokio::process::Command::new("node")
            .arg("--version")
            .output()
            .await
    };

    match output {
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

/// Check if OpenClaw is installed by running `openclaw --version`.
///
/// Tries multiple methods:
/// 1. `openclaw --version` (global install)
/// 2. `npx openclaw --version` (npx fallback)
/// 3. `pnpm exec openclaw --version` (pnpm global)
#[tauri::command]
pub async fn check_openclaw() -> Result<OpenClawInfo, String> {
    let attempts: Vec<(&str, Vec<&str>)> = if cfg!(target_os = "windows") {
        vec![
            ("cmd", vec!["/c", "openclaw", "--version"]),
            ("cmd", vec!["/c", "npx", "openclaw", "--version"]),
            ("cmd", vec!["/c", "pnpm", "exec", "openclaw", "--version"]),
        ]
    } else {
        vec![
            ("openclaw", vec!["--version"]),
            ("npx", vec!["openclaw", "--version"]),
            ("pnpm", vec!["exec", "openclaw", "--version"]),
        ]
    };

    for (cmd, args) in &attempts {
        if let Ok(out) = tokio::process::Command::new(cmd).args(args).output().await {
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

/// Detect all available package managers in priority order: pnpm > yarn > npm.
async fn detect_package_managers() -> Vec<String> {
    let managers = ["pnpm", "yarn", "npm"];
    let mut available = Vec::new();

    for mgr in &managers {
        let output = if cfg!(target_os = "windows") {
            tokio::process::Command::new("cmd")
                .args(["/c", mgr, "--version"])
                .output()
                .await
        } else {
            tokio::process::Command::new(mgr)
                .arg("--version")
                .output()
                .await
        };

        if let Ok(out) = output {
            if out.status.success() {
                available.push(mgr.to_string());
            }
        }
    }

    available
}

/// Install OpenClaw using package managers with fallback.
///
/// Tries pnpm first, then yarn, then npm.
/// If one fails, automatically falls back to the next.
/// Streams output as "install-output" Tauri events.
#[tauri::command]
pub async fn install_openclaw_script(app: tauri::AppHandle) -> Result<String, String> {
    let managers = detect_package_managers().await;

    if managers.is_empty() {
        return Err("No package manager found (pnpm, yarn, or npm required)".to_string());
    }

    let _ = app.emit(
        "install-output",
        format!("Available package managers: {}", managers.join(", ")),
    );

    for pkg_manager in &managers {
        let _ = app.emit("install-output", format!("Trying {pkg_manager}..."));

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
            tokio::process::Command::new("cmd")
                .args(&args)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
        } else {
            tokio::process::Command::new(pkg_manager)
                .args(&install_args)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
        };

        let mut child = match child {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit(
                    "install-output",
                    format!("[warn] Failed to start {pkg_manager}: {e}, trying next..."),
                );
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

        let app_stderr = app.clone();
        let stderr_task = tokio::spawn(async move {
            let reader = tokio::io::BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if !line.trim().is_empty() {
                    let _ = app_stderr.emit("install-output", format!("[warn] {line}"));
                }
            }
        });

        let status = child.wait().await;
        let _ = tokio::join!(stdout_task, stderr_task);

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
                } else {
                    let _ = app.emit(
                        "install-output",
                        format!("[warn] {pkg_manager} reported success but openclaw not found, trying next..."),
                    );
                    continue;
                }
            }
            Ok(s) => {
                let exit_code = s.code().unwrap_or(-1);
                let _ = app.emit(
                    "install-output",
                    format!(
                        "[warn] {pkg_manager} failed with exit code {exit_code}, trying next..."
                    ),
                );
                continue;
            }
            Err(e) => {
                let _ = app.emit(
                    "install-output",
                    format!("[warn] {pkg_manager} process error: {e}, trying next..."),
                );
                continue;
            }
        }
    }

    Err("All package managers failed to install OpenClaw. Try running 'pnpm add -g openclaw@latest' or 'npm install -g openclaw@latest' manually.".to_string())
}

/// Uninstall OpenClaw, then reinstall a clean copy.
///
/// Tries each package manager to remove, then reinstalls.
#[tauri::command]
pub async fn reinstall_openclaw(app: tauri::AppHandle) -> Result<String, String> {
    let managers = detect_package_managers().await;

    if managers.is_empty() {
        return Err("No package manager found (pnpm, yarn, or npm required)".to_string());
    }

    let _ = app.emit(
        "install-output",
        "Removing existing OpenClaw installation...".to_string(),
    );

    // Try to uninstall with each available manager
    for pkg_manager in &managers {
        let uninstall_args: Vec<&str> = match pkg_manager.as_str() {
            "pnpm" => vec!["remove", "-g", "openclaw"],
            "yarn" => vec!["global", "remove", "openclaw"],
            "npm" => vec!["uninstall", "-g", "openclaw"],
            _ => continue,
        };

        let _ = app.emit(
            "install-output",
            format!("Trying: {pkg_manager} {}", uninstall_args.join(" ")),
        );

        let child = if cfg!(target_os = "windows") {
            let mut args = vec!["/c", pkg_manager.as_str()];
            args.extend(&uninstall_args);
            tokio::process::Command::new("cmd")
                .args(&args)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
        } else {
            tokio::process::Command::new(pkg_manager)
                .args(&uninstall_args)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
        };

        if let Ok(mut child) = child {
            let stdout = child.stdout.take();
            let stderr = child.stderr.take();
            let app_clone = app.clone();

            if let Some(stdout) = stdout {
                let app_c = app_clone.clone();
                tokio::spawn(async move {
                    let reader = tokio::io::BufReader::new(stdout);
                    let mut lines = reader.lines();
                    while let Ok(Some(line)) = lines.next_line().await {
                        if !line.trim().is_empty() {
                            let _ = app_c.emit("install-output", &line);
                        }
                    }
                });
            }
            if let Some(stderr) = stderr {
                tokio::spawn(async move {
                    let reader = tokio::io::BufReader::new(stderr);
                    let mut lines = reader.lines();
                    while let Ok(Some(line)) = lines.next_line().await {
                        if !line.trim().is_empty() {
                            let _ = app_clone.emit("install-output", format!("[warn] {line}"));
                        }
                    }
                });
            }

            let _ = child.wait().await;
            // Uninstall attempt done — even if it fails, try reinstall
        }
    }

    let _ = app.emit(
        "install-output",
        "Uninstall complete. Installing fresh copy...".to_string(),
    );

    // Now do a clean install
    install_openclaw_script(app).await
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
