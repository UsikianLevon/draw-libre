import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: { resolve: ["@maplibre/maplibre-gl-style-spec"], banner: '/// <reference types="geojson" />' },
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
