import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { projectCommand } from "./commands/project.js";
import { providerCommand } from "./commands/provider.js";
import { syncCommand } from "./commands/sync.js";
import { configCommand } from "./commands/config.js";
import { logoutCommand } from "./commands/logout.js";
import { hookStopCommand } from "./hooks/stop.js";
import { hookPostToolUseCommand } from "./hooks/post-tool-use.js";
import { hookNotificationCommand } from "./hooks/notification.js";

const program = new Command();

program
  .name("afterburn")
  .description("CLI for Afterburn - AI coding tool intelligence platform")
  .version("0.1.4");

// Main commands
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(projectCommand);
program.addCommand(providerCommand);
program.addCommand(syncCommand);
program.addCommand(configCommand);
program.addCommand(logoutCommand);

// Hook commands (called by AI coding tools)
const hookCommand = new Command("hook")
  .description("Hook handlers called by AI coding tools (internal use)");

hookCommand.addCommand(hookStopCommand);
hookCommand.addCommand(hookPostToolUseCommand);
hookCommand.addCommand(hookNotificationCommand);

program.addCommand(hookCommand);

program.parse();
