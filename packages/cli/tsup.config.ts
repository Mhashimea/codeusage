import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  dts: false,
  splitting: false,
  sourcemap: false,
  minify: false,
  shims: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Bundle @codeusage/shared for standalone distribution
  noExternal: ["@codeusage/shared"],
});
