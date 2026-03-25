/**
 * Error infrastructure for OpenClaw Desktop.
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
    suggestion: "OpenClaw Desktop supports Windows 10+ and Linux. macOS support is coming soon.",
  },
  network_error: {
    message: "Could not connect to the internet.",
    suggestion: "Check your network connection and try again. A firewall or proxy may be blocking access.",
  },
  permission_denied: {
    message: "Permission was denied for this operation.",
    suggestion: "Try running the app as administrator (Windows) or with sudo (Linux).",
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
  if (lower.includes("docker")) return errorMessages.docker_unavailable
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("connection"))
    return errorMessages.network_error
  if (lower.includes("permission") || lower.includes("access denied"))
    return errorMessages.permission_denied
  if (lower.includes("install")) return errorMessages.installation_failed
  if (lower.includes("config") || lower.includes("yaml") || lower.includes("json"))
    return errorMessages.config_error
  return null
}
