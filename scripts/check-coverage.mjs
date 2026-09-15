import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SPEC = "docs/superpowers/specs/2026-09-13-behavioral-test-suite-design.md";
const COVERAGE = "docs/superpowers/specs/2026-09-13-behavioral-test-suite-coverage.md";

const list = execFileSync("npx", ["playwright", "test", "--list"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n")
  .map((line) => line.trimEnd())
  .filter((line) => line.includes(" › "));
const spec = readFileSync(SPEC, "utf8");
const coverage = readFileSync(COVERAGE, "utf8");

const problems = [];
const rows = coverage.split("\n").filter((line) => /^\| (5\.\d+\.\d+|3\.1\.\d+) /.test(line));
const numberOf = (row) => row.split("|")[1].trim();

for (const row of rows) {
  const cells = row.split("|").map((cell) => cell.trim());
  const [, number, , file, title] = cells;
  if (title === "—") continue;
  const relative = file.replace(/`/g, "").replace(/^e2e\//, "");
  const found = list.some((line) => line.includes(` › ${relative}:`) && line.endsWith(` › ${title}`));
  if (!found) problems.push(`${number}: no test "${title}" in ${file}`);
}

const sections = spec.split("\n### ").filter((part) => /^5\.\d+\. /.test(part));
for (const section of sections) {
  const id = section.match(/^(5\.\d+)\./)[1];
  const body = section.split("\n## ")[0];
  const bullets = body.split("\n").filter((line) => line.startsWith("- ")).length;
  for (let k = 1; k <= bullets; k += 1) {
    if (!rows.some((row) => numberOf(row) === `${id}.${k}`)) problems.push(`${id}.${k}: no row`);
  }
}

const table = spec.slice(spec.indexOf("\n### 3.1."), spec.indexOf("\n## 4."));
const decisions = table.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| -")).length - 1;
for (let k = 1; k <= decisions; k += 1) {
  if (!rows.some((row) => numberOf(row) === `3.1.${k}`)) problems.push(`3.1.${k}: no row`);
}
for (const row of rows.filter((candidate) => numberOf(candidate).startsWith("3.1."))) {
  const k = Number(numberOf(row).slice(4));
  if (k > decisions) problems.push(`${numberOf(row)}: table 3.1 has only ${decisions} rows`);
}

if (problems.length > 0) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log(
  `coverage ok: ${rows.length} rows, ${sections.length} subsections of section 5, ${decisions} rows of table 3.1`,
);
