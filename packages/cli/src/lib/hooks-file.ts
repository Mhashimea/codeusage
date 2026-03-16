import fs from "fs/promises";
import path from "path";
import os from "os";

interface ClaudeSettings {
  hooks?: {
    Stop?: { command: string }[];
    PostToolUse?: { command: string }[];
    Notification?: { command: string }[];
  };
  [key: string]: unknown;
}

const AFTERBURN_HOOKS = {
  Stop: [{ command: "afterburn hook stop" }],
  PostToolUse: [{ command: "afterburn hook post-tool-use" }],
  Notification: [{ command: "afterburn hook notification" }],
};

export function getSettingsPath(
  scope: "global" | "project",
  cwd: string
): string {
  if (scope === "global") {
    return path.join(os.homedir(), ".claude", "settings.json");
  }
  return path.join(cwd, ".claude", "settings.json");
}

export async function registerHooks(
  scope: "global" | "project",
  cwd: string
): Promise<void> {
  const filePath = getSettingsPath(scope, cwd);

  // Read existing file or start with empty object
  let settings: ClaudeSettings = {};
  try {
    const content = await fs.readFile(filePath, "utf-8");
    settings = JSON.parse(content);
  } catch {
    // File doesn't exist, start fresh
  }

  // Merge hooks (don't overwrite existing hooks from other tools)
  settings.hooks = settings.hooks || {};

  for (const [hookType, hookDef] of Object.entries(AFTERBURN_HOOKS)) {
    const existingHooks =
      settings.hooks[hookType as keyof typeof settings.hooks] || [];
    const hasAfterburn = existingHooks.some((h) =>
      h.command.startsWith("afterburn")
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
  cwd: string
): Promise<void> {
  const filePath = getSettingsPath(scope, cwd);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const settings: ClaudeSettings = JSON.parse(content);

    if (settings.hooks) {
      for (const hookType of ["Stop", "PostToolUse", "Notification"] as const) {
        if (settings.hooks[hookType]) {
          settings.hooks[hookType] = settings.hooks[hookType]!.filter(
            (h) => !h.command.startsWith("afterburn")
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
  cwd: string
): Promise<boolean> {
  const filePath = getSettingsPath(scope, cwd);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const settings: ClaudeSettings = JSON.parse(content);

    if (settings.hooks?.Stop) {
      return settings.hooks.Stop.some((h) =>
        h.command.startsWith("afterburn")
      );
    }
  } catch {
    // File doesn't exist
  }

  return false;
}
