#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliDir = join(__dirname, "..");
const distDir = join(cliDir, "dist");
const outFile = join(distDir, "index.mjs");

console.log("Building CLI with bun...");

// Build with bun (ESM format for proper import.meta support)
// Output as .mjs so Node always treats it as ESM regardless of package.json context
execSync("bun build src/index.ts --outfile dist/index.mjs --target node --format esm", {
  cwd: cliDir,
  stdio: "inherit",
});

// Clean up old index.js if it exists
const oldFile = join(distDir, "index.js");
if (existsSync(oldFile)) {
  unlinkSync(oldFile);
}

// Add shebang
const content = readFileSync(outFile, "utf-8");
writeFileSync(outFile, `#!/usr/bin/env node\n${content}`);

console.log("Build complete!");
