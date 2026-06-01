import { defineConfig } from "tsup";

// Single bundled CLI entry → dist/cli.js with a shebang, so `npx govkit` and the
// PreToolUse hook both invoke one TRULY self-contained file. `noExternal` forces the
// one runtime dependency (yaml) to be bundled INTO dist/cli.js rather than left as an
// external `import … from "yaml"` — otherwise the shipped tarball needs `yaml` installed
// separately and fails with ERR_MODULE_NOT_FOUND on a bare `node dist/cli.js` (caught by
// the npm-pack offline proof). Bundling makes the artifact zero-runtime-dep: `npx govkit`
// ships one file, no transitive install — the literal zero-install invariant the README pins.
export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  noExternal: ["yaml"],
  // yaml's bundled build is CJS; esbuild emits ESM, so its internal `__require` shim
  // throws "Dynamic require of …" on yaml's `require("process")`. Defining a real
  // `require` via createRequire at module top makes that shim use it instead of throwing —
  // the canonical fix for bundling a CJS dep into an ESM single-file build.
  banner: {
    js: '#!/usr/bin/env node\nimport{createRequire as __cr}from"node:module";const require=__cr(import.meta.url);',
  },
});
