// Dependency gate: every dependency is pinned to an exact version AND approved in docs/dependencies.md.
// Usage: node scripts/check-deps.mjs [targetDir]   (exit 1 on any problem)
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const targetDir = process.argv[2] ?? process.cwd();
const pkgPath = resolve(targetDir, "package.json");

if (!existsSync(pkgPath)) {
  console.log(`deps: No package.json found in "${targetDir}" (skipped).`);
  process.exit(0);
}

const ALLOWED_LICENSES = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC"];
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

const standardDepsPath = resolve(targetDir, "docs/standards/dependencies.md");
const legacyDepsPath = resolve(targetDir, "docs/dependencies.md");
const depsPath = existsSync(standardDepsPath) ? standardDepsPath : legacyDepsPath;

if (!existsSync(depsPath)) {
  console.log(`deps: No docs/dependencies.md found in "${targetDir}" (skipped).`);
  process.exit(0);
}

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
if (!existsSync(resolve(targetDir, "package-lock.json")))
  console.error("warning: no package-lock.json — CI must use `npm ci` with a committed lockfile");

if (problems.length) {
  console.error(problems.map((p) => "[FAIL] " + p).join("\n"));
  process.exit(1);
}
console.log(`deps ok: ${Object.keys(deps).length} pinned and approved`);
