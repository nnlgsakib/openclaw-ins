use std::process::Stdio;
use std::time::Duration;
use tokio::time::timeout;

/// Quick timeout for version checks and simple commands (30 seconds).
pub const QUICK_TIMEOUT: u64 = 30;

/// Longer timeout for install/update operations (120 seconds).
pub const INSTALL_TIMEOUT: u64 = 120;

/// Create a tokio Command that won't flash a console window on Windows.
///
/// On Windows, sets `CREATE_NO_WINDOW` (0x08000000) to suppress the console.
/// On other platforms, creates a plain `tokio::process::Command`.
/// Pipes stdout and stderr by default.
pub fn silent_cmd(program: &str) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(program);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd
}

/// Run a command with a timeout, returning a descriptive error on timeout.
pub async fn run_with_timeout(
    cmd: &mut tokio::process::Command,
    timeout_secs: u64,
) -> Result<std::process::Output, String> {
    match timeout(Duration::from_secs(timeout_secs), cmd.output()).await {
        Ok(Ok(output)) => Ok(output),
        Ok(Err(e)) => Err(format!("Command failed: {e}")),
        Err(_) => Err(format!("Command timed out after {timeout_secs}s")),
    }
}
