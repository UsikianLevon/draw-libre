import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  treeshake: true,
  platform: "browser",
  outExtension() {
    return {
      js: ".js",
    };
  },
});
