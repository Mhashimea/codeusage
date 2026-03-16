import { Command } from "commander";

// Notification hook - reserved for future use
// Could be used for real-time alerts or notifications

export const hookNotificationCommand = new Command("notification")
  .description("Handle Claude Code notification hook (internal)")
  .action(async () => {
    // No-op for now
    // Future: could handle notifications from Claude Code
  });
