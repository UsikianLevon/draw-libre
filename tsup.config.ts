import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "iife"],
  treeshake: true,
  globalName: "DrawLibre",
  minify: true,
  dts: true,
  sourcemap: false,
  clean: true,
  shims: true,
  skipNodeModulesBundle: true,
});
