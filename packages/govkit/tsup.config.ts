import { defineConfig } from "tsup";

// Single bundled CLI entry → dist/cli.js with a shebang, so `npx govkit` and the
// PreToolUse hook both invoke one self-contained file (no runtime relative imports).
export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});
