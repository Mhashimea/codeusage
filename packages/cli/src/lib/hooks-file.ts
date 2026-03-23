import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  type ProviderId,
  getProviderById,
  isProviderActive,
  DEFAULT_PROVIDER,
} from "@afterburn/shared";

/**
 * Claude Code hook command definition
 */
interface ClaudeHookCommand {
  type: "command";
  command: string;
}

/**
 * Claude Code hook entry with matcher
 */
interface ClaudeHookEntry {
  matcher: string;
  hooks: ClaudeHookCommand[];
}

/**
 * Claude Code settings.json structure
 */
interface ClaudeSettings {
  hooks?: {
    Stop?: ClaudeHookEntry[];
    PostToolUse?: ClaudeHookEntry[];
    Notification?: ClaudeHookEntry[];
  };
  [key: string]: unknown;
}

/**
 * Codex hook command definition
 */
interface CodexHookCommand {
  type: "command";
  command: string;
  statusMessage?: string;
  timeout?: number;
}

/**
 * Codex hooks.json structure
 */
interface CodexSettings {
  hooks?: {
    Stop?: CodexHookCommand[];
    SessionStart?: CodexHookCommand[];
    AfterAgent?: CodexHookCommand[];
    AfterToolUse?: CodexHookCommand[];
  };
  [key: string]: unknown;
}

/**
 * Provider-specific hook configuration
 */
interface ProviderHookConfig {
  settingsPath: (scope: "global" | "project", cwd: string) => string;
  registerHooks: (settings: unknown) => unknown;
  unregisterHooks: (settings: unknown) => unknown;
  hasAfterburn: (settings: unknown) => boolean;
}

/**
 * Create Claude Code hook entry
 */
function createClaudeHookEntry(command: string): ClaudeHookEntry {
  return {
    matcher: "",
    hooks: [{ type: "command", command }],
  };
}

/**
 * Create Codex hook command
 */
function createCodexHookCommand(
  command: string,
  statusMessage: string
): CodexHookCommand {
  return {
    type: "command",
    command,
    statusMessage,
    timeout: 10,
  };
}

/**
 * Claude Code hook configuration
 */
const claudeCodeConfig: ProviderHookConfig = {
  settingsPath: (scope, cwd) => {
    if (scope === "global") {
      return path.join(os.homedir(), ".claude", "settings.json");
    }
    return path.join(cwd, ".claude", "settings.json");
  },
  registerHooks: (settings: unknown) => {
    const s = (settings || {}) as ClaudeSettings;
    s.hooks = s.hooks || {};

    // Stop hook - include --provider flag so hook knows source
    const stopHooks = s.hooks.Stop || [];
    const hasStopAfterburn = stopHooks.some((entry) =>
      entry.hooks?.some((h) => h.command.startsWith("afterburn"))
    );
    if (!hasStopAfterburn) {
      s.hooks.Stop = [...stopHooks, createClaudeHookEntry("afterburn hook stop --provider claude_code")];
    }

    // PostToolUse hook
    const postToolHooks = s.hooks.PostToolUse || [];
    const hasPostToolAfterburn = postToolHooks.some((entry) =>
      entry.hooks?.some((h) => h.command.startsWith("afterburn"))
    );
    if (!hasPostToolAfterburn) {
      s.hooks.PostToolUse = [
        ...postToolHooks,
        createClaudeHookEntry("afterburn hook post-tool-use --provider claude_code"),
      ];
    }

    // Notification hook
    const notifHooks = s.hooks.Notification || [];
    const hasNotifAfterburn = notifHooks.some((entry) =>
      entry.hooks?.some((h) => h.command.startsWith("afterburn"))
    );
    if (!hasNotifAfterburn) {
      s.hooks.Notification = [
        ...notifHooks,
        createClaudeHookEntry("afterburn hook notification --provider claude_code"),
      ];
    }

    return s;
  },
  unregisterHooks: (settings: unknown) => {
    const s = (settings || {}) as ClaudeSettings;
    if (!s.hooks) return s;

    if (s.hooks.Stop) {
      s.hooks.Stop = s.hooks.Stop.filter(
        (entry) => !entry.hooks?.some((h) => h.command.startsWith("afterburn"))
      );
    }
    if (s.hooks.PostToolUse) {
      s.hooks.PostToolUse = s.hooks.PostToolUse.filter(
        (entry) => !entry.hooks?.some((h) => h.command.startsWith("afterburn"))
      );
    }
    if (s.hooks.Notification) {
      s.hooks.Notification = s.hooks.Notification.filter(
        (entry) => !entry.hooks?.some((h) => h.command.startsWith("afterburn"))
      );
    }

    return s;
  },
  hasAfterburn: (settings: unknown) => {
    const s = settings as ClaudeSettings;
    if (!s?.hooks?.Stop) return false;
    return s.hooks.Stop.some((entry) =>
      entry.hooks?.some((h) => h.command.startsWith("afterburn"))
    );
  },
};

/**
 * Codex hook configuration
 */
const codexConfig: ProviderHookConfig = {
  settingsPath: (scope, _cwd) => {
    // Codex only supports global hooks config
    // Project-scoped hooks are not supported by Codex
    if (scope === "project") {
      // Fall back to global for Codex
      return path.join(os.homedir(), ".codex", "hooks.json");
    }
    return path.join(os.homedir(), ".codex", "hooks.json");
  },
  registerHooks: (settings: unknown) => {
    const s = (settings || {}) as CodexSettings;
    s.hooks = s.hooks || {};

    // Stop hook - include --provider flag so hook knows source
    const stopHooks = s.hooks.Stop || [];
    const hasStopAfterburn = stopHooks.some((h) =>
      h.command.startsWith("afterburn")
    );
    if (!hasStopAfterburn) {
      s.hooks.Stop = [
        ...stopHooks,
        createCodexHookCommand("afterburn hook stop --provider codex", "Syncing to Afterburn..."),
      ];
    }

    return s;
  },
  unregisterHooks: (settings: unknown) => {
    const s = (settings || {}) as CodexSettings;
    if (!s.hooks) return s;

    if (s.hooks.Stop) {
      s.hooks.Stop = s.hooks.Stop.filter(
        (h) => !h.command.startsWith("afterburn")
      );
    }

    return s;
  },
  hasAfterburn: (settings: unknown) => {
    const s = settings as CodexSettings;
    if (!s?.hooks?.Stop) return false;
    return s.hooks.Stop.some((h) => h.command.startsWith("afterburn"));
  },
};

/**
 * Provider hook configurations registry
 */
const PROVIDER_HOOK_CONFIGS: Record<ProviderId, ProviderHookConfig | null> = {
  claude_code: claudeCodeConfig,
  codex: codexConfig,
};

/**
 * Get hook config for a provider
 */
export function getProviderHookConfig(
  providerId: ProviderId
): ProviderHookConfig | null {
  const provider = getProviderById(providerId);
  if (!provider || !isProviderActive(providerId)) {
    return null;
  }
  return PROVIDER_HOOK_CONFIGS[providerId];
}

export function getSettingsPath(
  scope: "global" | "project",
  cwd: string,
  providerId: ProviderId = DEFAULT_PROVIDER
): string {
  const config = PROVIDER_HOOK_CONFIGS[providerId];
  if (!config) {
    throw new Error(`Provider ${providerId} does not support hooks`);
  }
  return config.settingsPath(scope, cwd);
}

export async function registerHooks(
  scope: "global" | "project",
  cwd: string,
  providerId: ProviderId = DEFAULT_PROVIDER
): Promise<void> {
  const config = getProviderHookConfig(providerId);
  if (!config) {
    throw new Error(
      `Provider ${providerId} does not support hooks or is not active`
    );
  }

  const filePath = config.settingsPath(scope, cwd);

  // Read existing file or start with empty object
  let settings: unknown = {};
  try {
    const content = await fs.readFile(filePath, "utf-8");
    settings = JSON.parse(content);
  } catch {
    // File doesn't exist, start fresh
  }

  // Register hooks
  settings = config.registerHooks(settings);

  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // Write back
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
}

export async function unregisterHooks(
  scope: "global" | "project",
  cwd: string,
  providerId: ProviderId = DEFAULT_PROVIDER
): Promise<void> {
  const config = getProviderHookConfig(providerId);
  if (!config) {
    return; // Provider doesn't support hooks, nothing to unregister
  }

  const filePath = config.settingsPath(scope, cwd);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    let settings: unknown = JSON.parse(content);

    settings = config.unregisterHooks(settings);

    await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
  } catch {
    // File doesn't exist, nothing to unregister
  }
}

export async function areHooksRegistered(
  scope: "global" | "project",
  cwd: string,
  providerId: ProviderId = DEFAULT_PROVIDER
): Promise<boolean> {
  const config = getProviderHookConfig(providerId);
  if (!config) {
    return false; // Provider doesn't support hooks
  }

  const filePath = config.settingsPath(scope, cwd);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const settings: unknown = JSON.parse(content);
    return config.hasAfterburn(settings);
  } catch {
    // File doesn't exist
  }

  return false;
}
