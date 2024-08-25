import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs", "iife"],
  treeshake: true,
  globalName: "DrawLibre",
  minify: true,
  dts: true,
  sourcemap: false,
  clean: true,
  shims: true,
  skipNodeModulesBundle: true,
});
