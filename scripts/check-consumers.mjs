import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TSC = join(ROOT, "node_modules", ".bin", "tsc");
const ENGINE_IMPORT =
  /(from|import)\s*\(?\s*["'](maplibre-gl|mapbox-gl|@maplibre\/maplibre-gl-style-spec)(\/[^"']*)?["']|reference\s+types\s*=\s*["'](maplibre-gl|mapbox-gl|@maplibre\/maplibre-gl-style-spec)["']/;

const CONSUMERS = [
  { name: "maplibre-gl 6.9.1", packages: ["maplibre-gl@6.9.1"], files: ["consumer.ts", "maplibre.ts"] },
  { name: "maplibre-gl 5.24.0", packages: ["maplibre-gl@5.24.0"], files: ["consumer.ts", "maplibre.ts"] },
  {
    name: "mapbox-gl 3.30.0",
    packages: ["mapbox-gl@3.30.0", "@types/geojson@7946.0.16"],
    files: ["consumer.ts", "mapbox.ts"],
  },
];

const COMPILER_OPTIONS = {
  strict: true,
  noEmit: true,
  skipLibCheck: false,
  module: "esnext",
  moduleResolution: "bundler",
  target: "es2022",
  lib: ["DOM", "es2023"],
};

for (const file of ["dist/index.d.ts", "dist/index.js"]) {
  if (ENGINE_IMPORT.test(readFileSync(join(ROOT, file), "utf8"))) {
    console.log(`${file} imports an engine`);
    process.exit(1);
  }
}

const work = mkdtempSync(join(tmpdir(), "draw-libre-consumers-"));
const failed = [];

try {
  const packed = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", work], { cwd: ROOT, encoding: "utf8" }),
  );
  const tarball = join(work, packed[0].filename);

  for (const [index, consumer] of CONSUMERS.entries()) {
    const dir = join(work, `consumer-${index}`);
    mkdirSync(dir);
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: `consumer-${index}`, private: true }));
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({ compilerOptions: COMPILER_OPTIONS, files: consumer.files }),
    );
    for (const file of consumer.files) {
      copyFileSync(join(ROOT, "e2e", "consumer", file), join(dir, file));
    }
    execFileSync(
      "npm",
      [
        "install",
        "--no-audit",
        "--no-fund",
        "--ignore-scripts",
        "--prefer-offline",
        "--no-package-lock",
        tarball,
        ...consumer.packages,
      ],
      { cwd: dir, stdio: ["ignore", "ignore", "inherit"] },
    );
    try {
      execFileSync(TSC, ["-p", dir], { stdio: "inherit" });
      console.log(`types ok: ${consumer.name}`);
    } catch {
      failed.push(consumer.name);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failed.length > 0) {
  console.log(`types failed: ${failed.join(", ")}`);
  process.exit(1);
}
