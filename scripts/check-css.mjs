import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../dist/index.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/url\(("[^"]*"|'[^']*'|[^)]*)\)/g, "url()");

const leaks = [...css.matchAll(/([^{}]+)\{/g)]
  .flatMap((rule) => rule[1].split(","))
  .map((selector) => selector.trim())
  .filter((selector) => {
    if (selector.startsWith("@")) return false;
    const classes = [...selector.matchAll(/\.([\w-]+)/g)].map((match) => match[1]);
    return (
      !classes.some((name) => name.startsWith("mdl-")) ||
      classes.some((name) => !/^(mdl|maplibregl|mapboxgl)-/.test(name))
    );
  });

if (leaks.length > 0) {
  console.log(`dist/index.css has selectors that reach outside the control:\n  ${leaks.join("\n  ")}`);
  process.exit(1);
}
