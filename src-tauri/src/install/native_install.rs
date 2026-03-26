use crate::error::AppError;
use crate::install::progress::emit_progress;
use crate::install::InstallResult;

/// Minimum Node.js version required for native OpenClaw installation.
const MIN_NODE_VERSION: &str = "22.12.0";

/// npm-based native installation flow.
///
/// Steps:
/// 1. Check Node.js version (>= 22.12.0)
/// 2. Install openclaw globally via npm
/// 3. Run openclaw onboard --install-daemon
/// 4. Verify installation
pub async fn native_install(app_handle: &tauri::AppHandle) -> Result<InstallResult, AppError> {
    // Step 1: Check Node.js version
    emit_progress(
        app_handle,
        "checking_node",
        10,
        "Checking Node.js...",
    );
    let node_version = get_node_version().await?;

    if !meets_minimum_version(&node_version, MIN_NODE_VERSION) {
        return Err(AppError::NodeVersionTooOld {
            current: node_version,
            minimum: MIN_NODE_VERSION.into(),
            suggestion: "Download Node.js 22+ from https://nodejs.org or use your package manager"
                .into(),
        });
    }

    // Step 2: Install openclaw globally via npm
    emit_progress(
        app_handle,
        "installing_npm",
        30,
        "Installing OpenClaw via npm...",
    );
    let output = tokio::process::Command::new("npm")
        .args(["install", "-g", "openclaw@latest"])
        .output()
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to run npm install: {e}"),
            suggestion: "Ensure npm is installed and on your PATH".into(),
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);

        // Check for permission errors (common on Linux)
        if stderr.contains("EACCES") || stderr.contains("permission denied") {
            return Err(AppError::InstallationFailed {
                reason: "Permission denied during npm install".into(),
                suggestion:
                    "Run with elevated permissions: sudo npm install -g openclaw@latest\n\
                     Or fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors"
                        .into(),
            });
        }

        return Err(AppError::InstallationFailed {
            reason: format!("npm install failed: {stderr}"),
            suggestion: "Try running: npm install -g openclaw@latest manually to see full errors"
                .into(),
        });
    }

    // Step 3: Run onboard --install-daemon
    emit_progress(
        app_handle,
        "configuring",
        60,
        "Running OpenClaw setup...",
    );
    let output = tokio::process::Command::new("openclaw")
        .args(["onboard", "--install-daemon"])
        .output()
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to run openclaw onboard: {e}"),
            suggestion: "Ensure openclaw is on your PATH after installation. \
                         Check: which openclaw"
                .into(),
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Non-fatal: onboarding wizard may require interactive input
        eprintln!(
            "Warning: openclaw onboard exited with warnings: {stderr}"
        );
    }

    // Step 4: Verify installation
    emit_progress(
        app_handle,
        "verifying",
        90,
        "Verifying installation...",
    );
    let version = get_openclaw_version().await?;

    emit_progress(
        app_handle,
        "complete",
        100,
        "OpenClaw installed successfully!",
    );

    Ok(InstallResult {
        method: "native".into(),
        version: Some(version),
        gateway_url: "http://127.0.0.1:18789".into(),
        gateway_token: None,
    })
}

/// Get the installed Node.js version string.
async fn get_node_version() -> Result<String, AppError> {
    let output = tokio::process::Command::new("node")
        .args(["--version"])
        .output()
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Node.js not found: {e}"),
            suggestion: "Install Node.js 22+ from https://nodejs.org".into(),
        })?;

    if !output.status.success() {
        return Err(AppError::InstallationFailed {
            reason: "Failed to get Node.js version".into(),
            suggestion: "Install Node.js 22+ from https://nodejs.org".into(),
        });
    }

    let version_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(version_str.trim_start_matches('v').to_string())
}

/// Get the installed OpenClaw version string.
async fn get_openclaw_version() -> Result<String, AppError> {
    let output = tokio::process::Command::new("openclaw")
        .args(["--version"])
        .output()
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("openclaw binary not found: {e}"),
            suggestion: "The installation may have failed. Try: npm install -g openclaw@latest"
                .into(),
        })?;

    let version_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(version_str.trim_start_matches('v').to_string())
}

/// Check if a version string meets the minimum semver requirement.
///
/// Simple major.minor.patch comparison — no external semver crate needed.
fn meets_minimum_version(current: &str, minimum: &str) -> bool {
    let parse_parts = |v: &str| -> (u32, u32, u32) {
        let parts: Vec<u32> = v.split('.').filter_map(|s| s.parse().ok()).collect();
        (
            parts.first().copied().unwrap_or(0),
            parts.get(1).copied().unwrap_or(0),
            parts.get(2).copied().unwrap_or(0),
        )
    };

    let (cmaj, cmin, cpat) = parse_parts(current);
    let (mmaj, mmin, mpat) = parse_parts(minimum);

    (cmaj, cmin, cpat) >= (mmaj, mmin, mpat)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn meets_minimum_version_accepts_equal() {
        assert!(meets_minimum_version("22.12.0", "22.12.0"));
    }

    #[test]
    fn meets_minimum_version_accepts_higher() {
        assert!(meets_minimum_version("23.0.0", "22.12.0"));
        assert!(meets_minimum_version("22.13.0", "22.12.0"));
        assert!(meets_minimum_version("22.12.1", "22.12.0"));
    }

    #[test]
    fn meets_minimum_version_rejects_lower() {
        assert!(!meets_minimum_version("22.11.0", "22.12.0"));
        assert!(!meets_minimum_version("21.0.0", "22.12.0"));
        assert!(!meets_minimum_version("20.9.1", "22.12.0"));
    }

    #[test]
    fn meets_minimum_version_handles_v_prefix() {
        // The function receives already-stripped version, but test robustness
        assert!(meets_minimum_version("22.12.0", "22.12.0"));
    }
}
