// Secret scanner gate: fails if anything that looks like a credential is in tracked text files.
// Usage: node scripts/scan-secrets.mjs [dir]   Real projects: add a maintained scanner (e.g. gitleaks) in CI too.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RULES = [
  ["private key", /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Anthropic key", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{36,}/],
  ["password or key assigned in code", /(password|passwd|secret|api_?key)\s*[:=]\s*["'][^"'\s]{8,}["']/i],
];
const SKIP = new Set(["node_modules", ".git", "dist", "coverage"]);
const ALLOW = /scan-secrets|\.test\.ts$/; // the scanner and its fixtures may contain patterns

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(ts|js|mjs|json|md|ya?ml|env|sh|txt)$/.test(name) || name.startsWith(".env")) yield p;
  }
}
const findings = [];
for (const f of files(process.argv[2] ?? ".")) {
  if (/(^|\/)\.env(\.|$)/.test(f)) {
    findings.push(`${f}: .env file must not be in the repository`);
    continue;
  }
  if (ALLOW.test(f)) continue;
  readFileSync(f, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const [name, re] of RULES) if (re.test(line)) findings.push(`${f}:${i + 1}: ${name}`);
    });
}
if (findings.length) {
  console.error(findings.map((x) => "✗ " + x).join("\n"));
  process.exit(1);
}
console.log("secrets ok");
