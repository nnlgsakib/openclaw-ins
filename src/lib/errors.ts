/**
 * Error infrastructure for ClawStation.
 * Maps technical errors to plain-language messages with suggested fixes.
 */

export interface AppError {
  message: string
  suggestion: string
}

/**
 * Human-readable error messages for common failure scenarios.
 * Maps error codes/patterns to user-friendly descriptions.
 */
export const errorMessages: Record<string, AppError> = {
  docker_unavailable: {
    message: "Docker is not available on this system.",
    suggestion: "Install Docker Desktop and make sure it's running. You can download it from docker.com.",
  },
  docker_not_installed: {
    message: "Docker is not installed on this system.",
    suggestion:
      "Download Docker Desktop from docker.com and install it. On Linux, you can also run: sudo apt install docker.io",
  },
  docker_daemon_not_running: {
    message: "Docker is installed but not running.",
    suggestion: "Start Docker Desktop (Windows) or run: sudo systemctl start docker (Linux)",
  },
  docker_desktop_not_running: {
    message: "Docker Desktop is not running.",
    suggestion:
      "Open Docker Desktop from the Start menu and wait for it to show 'Docker Desktop is running'.",
  },
  wsl_backend_not_ready: {
    message: "The WSL2 Docker backend is not ready.",
    suggestion:
      "Open Docker Desktop → Settings → Resources → WSL Integration and ensure your distro is enabled.",
  },
  installation_failed: {
    message: "Installation could not be completed.",
    suggestion: "Check that you have enough disk space and admin permissions, then try again.",
  },
  config_error: {
    message: "There's a problem with the configuration file.",
    suggestion: "The config file may be corrupted. Try resetting it from Settings, or check the file for syntax errors.",
  },
  unsupported_platform: {
    message: "Your operating system is not supported.",
    suggestion: "ClawStation supports Windows 10+ and Linux. macOS support is coming soon.",
  },
  network_error: {
    message: "Could not connect to the internet.",
    suggestion: "Check your network connection and try again. A firewall or proxy may be blocking access.",
  },
  openclaw_not_running: {
    message: "OpenClaw is not running.",
    suggestion: "Start OpenClaw from the Install page or via Docker: docker run openclaw",
  },
  api_unavailable: {
    message: "OpenClaw API is not responding.",
    suggestion: "OpenClaw may be starting up. Wait a moment and try refreshing.",
  },
  permission_denied: {
    message: "Permission was denied for this operation.",
    suggestion: "Try running the app as administrator (Windows) or with sudo (Linux).",
  },
  uninstall_failed: {
    message: "OpenClaw uninstall failed. {reason}",
    suggestion: "Some containers or files may still exist. Try removing them manually via Docker CLI or file manager.",
  },
  update_failed: {
    message: "OpenClaw update failed.",
    suggestion: "Check your internet connection and Docker access. For Docker installs, try: docker compose pull && docker compose up -d. For native installs, try: npm install -g openclaw@latest",
  },
  version_check_failed: {
    message: "Could not check for updates.",
    suggestion: "Check your internet connection. The GitHub releases API may be temporarily unavailable.",
  },
  unknown: {
    message: "Something went wrong. Try again, or check the details below for a fix.",
    suggestion: "An unexpected error occurred. Restart the app. If this keeps happening, check the logs.",
  },
}

/**
 * Formats an unknown error into a user-friendly AppError.
 * Handles Tauri command errors, JS errors, strings, and objects.
 */
export function formatError(error: unknown): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return error
  }

  // Tauri command error with error code
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: string }).code
    if (code in errorMessages) {
      return errorMessages[code]
    }
  }

  // Tauri serializes Rust Err(Enum) as { variantName: { fields... } }
  // e.g. { installationFailed: { reason: "...", suggestion: "..." } }
  if (typeof error === "object" && error !== null) {
    const tauriErr = extractTauriErrorFields(error)
    if (tauriErr) return tauriErr
  }

  // String error
  if (typeof error === "string") {
    const matched = matchErrorPattern(error)
    if (matched) return matched
    return { ...errorMessages.unknown, message: error }
  }

  // JS Error object
  if (error instanceof Error) {
    const matched = matchErrorPattern(error.message)
    if (matched) return matched
    return { message: error.message, suggestion: errorMessages.unknown.suggestion }
  }

  // Fallback
  return errorMessages.unknown
}

function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "suggestion" in error &&
    typeof (error as AppError).message === "string" &&
    typeof (error as AppError).suggestion === "string"
  )
}

function matchErrorPattern(message: string): AppError | null {
  const lower = message.toLowerCase()
  if (lower.includes("docker") && lower.includes("not installed")) return errorMessages.docker_not_installed
  if (lower.includes("docker") && lower.includes("daemon")) return errorMessages.docker_daemon_not_running
  if (lower.includes("docker desktop")) return errorMessages.docker_desktop_not_running
  if (lower.includes("wsl") || lower.includes("wsl2")) return errorMessages.wsl_backend_not_ready
  if (lower.includes("openclaw") && lower.includes("not running")) return errorMessages.openclaw_not_running
  if (lower.includes("openclaw") && lower.includes("api")) return errorMessages.api_unavailable
  if (lower.includes("update") && (lower.includes("failed") || lower.includes("pull"))) return errorMessages.update_failed
  if (lower.includes("version check") || lower.includes("releases")) return errorMessages.version_check_failed
  if (lower.includes("docker")) return errorMessages.docker_unavailable
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("connection"))
    return errorMessages.network_error
  if (lower.includes("permission") || lower.includes("access denied"))
    return errorMessages.permission_denied
  if (lower.includes("install") && lower.includes("uninstall")) return errorMessages.uninstall_failed
  if (lower.includes("uninstall")) return errorMessages.uninstall_failed
  if (lower.includes("install")) return errorMessages.installation_failed
  if (lower.includes("config") || lower.includes("yaml") || lower.includes("json"))
    return errorMessages.config_error
  return null
}

/**
 * Extract message + suggestion from Tauri's serialized Rust error format.
 *
 * Tauri returns Rust `Err(AppError::InstallationFailed{reason, suggestion})` as:
 *   `{ installationFailed: { reason: "...", suggestion: "..." } }`
 *
 * This function unwraps the single-key variant object and returns an AppError.
 */
function extractTauriErrorFields(error: object): AppError | null {
  const keys = Object.keys(error)
  if (keys.length !== 1) return null

  const inner = (error as Record<string, unknown>)[keys[0]]
  if (!inner || typeof inner !== "object") return null

  const fields = inner as Record<string, unknown>

  // Tauri error variants use different field names:
  //   InstallationFailed { reason, suggestion }
  //   Internal { message, suggestion }
  //   ConfigError { message, suggestion }
  //   DockerDaemonNotRunning { suggestion }
  //   etc.
  const message =
    (typeof fields.reason === "string" && fields.reason) ||
    (typeof fields.message === "string" && fields.message) ||
    (typeof fields.suggestion === "string" && fields.suggestion) ||
    null

  const suggestion =
    (typeof fields.suggestion === "string" && fields.suggestion) ||
    errorMessages.unknown.suggestion

  if (!message) return null

  // Try to match against known error patterns for better UX
  const matched = matchErrorPattern(message)
  if (matched) return matched

  return { message, suggestion }
}
