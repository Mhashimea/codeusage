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
 * Individual hook command definition
 */
interface HookCommand {
  type: "command";
  command: string;
}

/**
 * Hook entry with matcher and nested hooks array
 * This is the Claude Code settings.json structure
 */
interface HookEntry {
  matcher: string;
  hooks: HookCommand[];
}

interface ProviderSettings {
  hooks?: {
    Stop?: HookEntry[];
    PostToolUse?: HookEntry[];
    Notification?: HookEntry[];
  };
  [key: string]: unknown;
}

/**
 * Provider-specific hook configurations
 */
interface ProviderHookConfig {
  settingsPath: (scope: "global" | "project", cwd: string) => string;
  hooks: Record<string, HookEntry[]>;
}

/**
 * Helper to create a hook entry with the correct structure
 */
function createHookEntry(command: string): HookEntry {
  return {
    matcher: "",
    hooks: [{ type: "command", command }],
  };
}

const PROVIDER_HOOK_CONFIGS: Record<ProviderId, ProviderHookConfig | null> = {
  claude_code: {
    settingsPath: (scope, cwd) => {
      if (scope === "global") {
        return path.join(os.homedir(), ".claude", "settings.json");
      }
      return path.join(cwd, ".claude", "settings.json");
    },
    hooks: {
      Stop: [createHookEntry("afterburn hook stop")],
      PostToolUse: [createHookEntry("afterburn hook post-tool-use")],
      Notification: [createHookEntry("afterburn hook notification")],
    },
  },
  // Codex will be added when implemented
  codex: null,
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
  let settings: ProviderSettings = {};
  try {
    const content = await fs.readFile(filePath, "utf-8");
    settings = JSON.parse(content);
  } catch {
    // File doesn't exist, start fresh
  }

  // Merge hooks (don't overwrite existing hooks from other tools)
  settings.hooks = settings.hooks || {};

  for (const [hookType, hookDef] of Object.entries(config.hooks)) {
    const existingHooks =
      settings.hooks[hookType as keyof typeof settings.hooks] || [];

    // Check if any existing hook entry contains an afterburn command
    const hasAfterburn = existingHooks.some((entry) =>
      entry.hooks?.some((h) => h.command.startsWith("afterburn"))
    );

    if (!hasAfterburn) {
      settings.hooks[hookType as keyof typeof settings.hooks] = [
        ...existingHooks,
        ...hookDef,
      ];
    }
  }

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
    const settings: ProviderSettings = JSON.parse(content);

    if (settings.hooks) {
      for (const hookType of Object.keys(config.hooks) as Array<
        keyof typeof settings.hooks
      >) {
        if (settings.hooks[hookType]) {
          // Filter out hook entries that contain afterburn commands
          settings.hooks[hookType] = settings.hooks[hookType]!.filter(
            (entry) =>
              !entry.hooks?.some((h) => h.command.startsWith("afterburn"))
          );
        }
      }
    }

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
    const settings: ProviderSettings = JSON.parse(content);

    if (settings.hooks?.Stop) {
      // Check if any hook entry contains an afterburn command
      return settings.hooks.Stop.some((entry) =>
        entry.hooks?.some((h) => h.command.startsWith("afterburn"))
      );
    }
  } catch {
    // File doesn't exist
  }

  return false;
}
