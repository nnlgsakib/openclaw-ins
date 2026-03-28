use crate::commands::silent::{run_with_timeout, silent_cmd, QUICK_TIMEOUT};
use crate::error::AppError;

/// Poll the gateway /healthz and /readyz endpoints with exponential backoff.
///
/// Gives the gateway up to `timeout_secs` to become healthy. Starts with 2-second
/// intervals and backs off to avoid hammering a still-starting container.
pub async fn verify_gateway_health(timeout_secs: u64) -> Result<(), AppError> {
    let client = reqwest::Client::new();
    let deadline = tokio::time::Instant::now() + tokio::time::Duration::from_secs(timeout_secs);
    let mut attempt: u32 = 0;

    loop {
        if tokio::time::Instant::now() > deadline {
            return Err(AppError::VerificationFailed {
                reason: "Gateway did not become healthy within timeout".into(),
                suggestion: "Check Docker logs: docker compose logs openclaw-gateway. \
                     Run: openclaw doctor --fix"
                    .into(),
            });
        }

        // Liveness check — no auth required
        if let Ok(resp) = client.get("http://127.0.0.1:18789/healthz").send().await {
            if resp.status().is_success() {
                // Also check readiness
                if let Ok(ready) = client.get("http://127.0.0.1:18789/readyz").send().await {
                    if ready.status().is_success() {
                        return Ok(());
                    }
                }
            }
        }

        // Exponential-ish backoff: 2s, 2s, 3s, 4s, 5s cap
        let delay = std::cmp::min(2 + attempt, 5);
        tokio::time::sleep(tokio::time::Duration::from_secs(delay as u64)).await;
        attempt = attempt.saturating_add(1);
    }
}

/// Verify a native install by running `openclaw doctor --yes`.
///
/// Returns `Ok(())` if the doctor reports no issues, or `Err` with
/// the doctor's output as the failure reason.
pub async fn verify_native_install() -> Result<(), AppError> {
    let mut cmd = silent_cmd("openclaw");
    cmd.args(["doctor", "--yes"]);
    let output = run_with_timeout(&mut cmd, QUICK_TIMEOUT)
        .await
        .map_err(|e| AppError::VerificationFailed {
            reason: format!("Failed to run openclaw doctor: {e}"),
            suggestion: "Ensure OpenClaw is installed and on your PATH. Try: \
                         npm install -g openclaw@latest"
                .into(),
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::VerificationFailed {
            reason: format!("openclaw doctor reported issues: {stderr}"),
            suggestion: "Run 'openclaw doctor --fix' manually to diagnose and repair".into(),
        });
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn verify_gateway_health_returns_error_on_timeout() {
        // No server running on 18789 — should timeout quickly
        let result = verify_gateway_health(2).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::VerificationFailed { reason, .. } => {
                assert!(reason.contains("did not become healthy"));
            }
            other => panic!("Expected VerificationFailed, got: {other:?}"),
        }
    }
}
