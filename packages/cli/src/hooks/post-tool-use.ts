import { Command } from "commander";

// PostToolUse hook - reserved for future tool accumulation
// Currently a no-op as session log parsing captures all tool usage

export const hookPostToolUseCommand = new Command("post-tool-use")
  .description("Handle Claude Code post-tool-use hook (internal)")
  .action(async () => {
    // No-op for now
    // Future: could accumulate tools_used array in real-time
  });
