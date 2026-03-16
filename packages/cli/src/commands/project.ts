import { Command } from "commander";
import chalk from "chalk";
import { getConfig, setConfig, getConfigValue } from "../lib/config.js";
import { detectProjectSlug } from "../lib/git.js";

export const projectCommand = new Command("project")
  .description("Manage project mappings for the current directory");

projectCommand
  .command("set <name>")
  .description("Set project name for current directory")
  .action(async (name: string) => {
    const cwd = process.cwd();
    const overrides = getConfigValue("project_overrides");

    overrides[cwd] = name;
    setConfig("project_overrides", overrides);

    console.log(chalk.green(`\n✓ Project set to: ${name}`));
    console.log(chalk.dim(`  Directory: ${cwd}\n`));
  });

projectCommand
  .command("list")
  .description("List all project mappings")
  .action(async () => {
    const config = getConfig();
    const overrides = config.project_overrides;
    const entries = Object.entries(overrides);

    console.log(chalk.bold("\nProject Mappings:\n"));

    if (entries.length === 0) {
      console.log(chalk.dim("  No custom mappings configured."));
      console.log(chalk.dim("  Projects are auto-detected from git remote.\n"));
      return;
    }

    for (const [dir, project] of entries) {
      if (project === "__ignored__") {
        console.log(chalk.yellow(`  ${dir}`));
        console.log(chalk.dim(`    → (ignored)\n`));
      } else {
        console.log(chalk.cyan(`  ${dir}`));
        console.log(chalk.dim(`    → ${project}\n`));
      }
    }

    if (config.default_project) {
      console.log(chalk.dim(`Default project: ${config.default_project}`));
    }
    console.log();
  });

projectCommand
  .command("ignore")
  .description("Ignore current directory (don't track tasks)")
  .action(async () => {
    const cwd = process.cwd();
    const overrides = getConfigValue("project_overrides");

    overrides[cwd] = "__ignored__";
    setConfig("project_overrides", overrides);

    console.log(chalk.yellow(`\n✓ Directory ignored: ${cwd}`));
    console.log(chalk.dim("  Tasks in this directory will not be tracked.\n"));
  });

projectCommand
  .command("unignore")
  .description("Remove ignore/override for current directory")
  .action(async () => {
    const cwd = process.cwd();
    const overrides = getConfigValue("project_overrides");

    if (overrides[cwd]) {
      delete overrides[cwd];
      setConfig("project_overrides", overrides);

      const detectedProject = await detectProjectSlug(cwd);
      console.log(chalk.green(`\n✓ Override removed for: ${cwd}`));
      console.log(chalk.dim(`  Will auto-detect as: ${detectedProject}\n`));
    } else {
      console.log(chalk.dim("\nNo override exists for this directory.\n"));
    }
  });

projectCommand
  .command("current")
  .description("Show project for current directory")
  .action(async () => {
    const cwd = process.cwd();
    const config = getConfig();

    console.log(chalk.bold("\nCurrent Directory:"));
    console.log(chalk.dim(`  ${cwd}\n`));

    if (config.project_overrides[cwd] === "__ignored__") {
      console.log(chalk.yellow("Project: (ignored)"));
      console.log(chalk.dim("Tasks in this directory are not tracked.\n"));
    } else if (config.project_overrides[cwd]) {
      console.log(chalk.cyan(`Project: ${config.project_overrides[cwd]} (override)`));
    } else {
      const detected = await detectProjectSlug(cwd);
      console.log(chalk.cyan(`Project: ${detected} (auto-detected)`));
    }
    console.log();
  });
