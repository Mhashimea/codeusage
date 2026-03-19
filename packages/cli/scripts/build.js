#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliDir = join(__dirname, "..");
const distDir = join(cliDir, "dist");
const outFile = join(distDir, "index.js");

console.log("Building CLI with bun...");

// Build with bun
execSync("bun build src/index.ts --outdir dist --target node --format esm", {
  cwd: cliDir,
  stdio: "inherit",
});

// Add shebang
const content = readFileSync(outFile, "utf-8");
writeFileSync(outFile, `#!/usr/bin/env node\n${content}`);

console.log("Build complete!");
