#!/usr/bin/env node
import { readFileSync, writeFileSync, renameSync, existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliDir = join(__dirname, "..");
const distDir = join(cliDir, "dist");
const tempFile = join(distDir, "index.js");
const outFile = join(distDir, "index.cjs");

console.log("Building CLI with bun...");

// Build with bun
execSync("bun build src/index.ts --outdir dist --target node --format cjs", {
  cwd: cliDir,
  stdio: "inherit",
});

// Rename index.js to index.cjs
if (existsSync(tempFile)) {
  if (existsSync(outFile)) {
    unlinkSync(outFile);
  }
  renameSync(tempFile, outFile);
}

// Add shebang
const content = readFileSync(outFile, "utf-8");
writeFileSync(outFile, `#!/usr/bin/env node\n${content}`);

console.log("Build complete!");
