import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { projectCommand } from "./commands/project.js";
import { providerCommand } from "./commands/provider.js";
import { patternsCommand } from "./commands/patterns.js";
import { syncCommand } from "./commands/sync.js";
import { configCommand } from "./commands/config.js";
import { logoutCommand } from "./commands/logout.js";
import { logsCommand } from "./commands/logs.js";
import { hookStopCommand } from "./hooks/stop.js";
import { hookPostToolUseCommand } from "./hooks/post-tool-use.js";
import { hookNotificationCommand } from "./hooks/notification.js";
import { hookUserPromptSubmitCommand } from "./hooks/user-prompt-submit.js";

const program = new Command();

program
  .name("codeusage")
  .description("CLI for Codeusage - AI coding tool intelligence platform")
  .version("0.1.30");

// Main commands
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(projectCommand);
program.addCommand(providerCommand);
program.addCommand(patternsCommand);
program.addCommand(syncCommand);
program.addCommand(configCommand);
program.addCommand(logoutCommand);
program.addCommand(logsCommand);

// Hook commands (called by AI coding tools)
const hookCommand = new Command("hook")
  .description("Hook handlers called by AI coding tools (internal use)");

hookCommand.addCommand(hookStopCommand);
hookCommand.addCommand(hookPostToolUseCommand);
hookCommand.addCommand(hookNotificationCommand);
hookCommand.addCommand(hookUserPromptSubmitCommand);

program.addCommand(hookCommand);

program.parse();
