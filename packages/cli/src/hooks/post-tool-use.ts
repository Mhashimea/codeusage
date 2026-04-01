import { Command } from "commander";

// PostToolUse hook - reserved for future tool accumulation
// Currently a no-op as session log parsing captures all tool usage

export const hookPostToolUseCommand = new Command("post-tool-use")
  .description("Handle AI coding tool post-tool-use hook (internal)")
  .option("--provider <provider>", "Provider ID (claude_code or codex)")
  .action(async () => {
    // No-op for now
    // Future: could accumulate tools_used array in real-time
  });
