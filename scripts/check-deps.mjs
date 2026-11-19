// Dependency gate: every dependency is pinned to an exact version AND approved in docs/dependencies.md.
// Usage: node scripts/check-deps.mjs   (exit 1 on any problem)
import { readFileSync, existsSync } from "node:fs";

const ALLOWED_LICENSES = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC"];
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const depsPath = existsSync("docs/standards/dependencies.md")
  ? "docs/standards/dependencies.md"
  : "docs/dependencies.md";
const approved = new Map(
  readFileSync(depsPath, "utf8")
    .split("\n")
    .filter((l) => /^\| [@a-z0-9]/.test(l))
    .map((l) =>
      l
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim()),
    )
    .map(([name, version, license]) => [name, { version, license }]),
);

const problems = [];
for (const [name, range] of Object.entries(deps)) {
  const row = approved.get(name);
  if (!/^\d+\.\d+\.\d+$/.test(range)) problems.push(`${name}: "${range}" is not pinned to an exact version`);
  if (!row) problems.push(`${name}: not in docs/dependencies.md — a person must approve it first`);
  else {
    if (row.version !== range)
      problems.push(`${name}: package.json has ${range}, approved version is ${row.version}`);
    if (!ALLOWED_LICENSES.includes(row.license))
      problems.push(`${name}: license ${row.license} is not allowed`);
  }
}
if (!existsSync("package-lock.json"))
  console.error("warning: no package-lock.json — CI must use `npm ci` with a committed lockfile");

if (problems.length) {
  console.error(problems.map((p) => "✗ " + p).join("\n"));
  process.exit(1);
}
console.log(`deps ok: ${Object.keys(deps).length} pinned and approved`);
