// Secret scanner gate: fails if anything that looks like a credential is in tracked text files.
// Usage: node scripts/scan-secrets.mjs [dir]
// Integrates with gitleaks if available, falls back to enhanced internal regex pattern scanner.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const targetDir = process.argv[2] ?? process.cwd();

// Load documented secret allowlist if present
const allowlistPath = join(targetDir, ".governance", "secret-allowlist.json");
let allowlistPatterns = [];
if (existsSync(allowlistPath)) {
  try {
    const list = JSON.parse(readFileSync(allowlistPath, "utf8"));
    if (Array.isArray(list)) allowlistPatterns = list.map((p) => new RegExp(p));
  } catch {
    // fallback
  }
}

// 1. Check if Gitleaks is installed in system PATH
try {
  const gitleaksCheck = spawnSync("gitleaks", ["version"], { stdio: "ignore" });
  if (gitleaksCheck.status === 0) {
    console.log(`[INFO] Gitleaks detected. Executing deep security scanner in "${targetDir}"...`);
    const gitleaksRun = spawnSync("gitleaks", ["dir", targetDir, "--no-banner", "--verbose"], {
      stdio: "inherit",
    });
    if (gitleaksRun.status === 0) {
      console.log("[PASS] Gitleaks secret scan passed. Zero secrets detected.");
      process.exit(0);
    } else {
      console.error("[FAIL] Gitleaks detected exposed secrets or credentials!");
      process.exit(1);
    }
  }
} catch {
  // Gitleaks not found in path, proceed to internal scanner
}

// 2. Enhanced Internal Secret Scanner
const RULES = [
  ["private key", /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["Anthropic API key", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenAI API key", /sk-(?:live|proj)?[A-Za-z0-9_-]{20,}/],
  ["AWS access key ID", /AKIA[0-9A-Z]{16}/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{36,}/],
  ["GitLab personal access token", /glpat-[A-Za-z0-9_-]{20,}/],
  ["Slack token", /xox[baprs]-[0-9]{10,}-[A-Za-z0-9]+/],
  ["Generic credential assignment", /(password|passwd|secret|api_?key|auth_token)\s*[:=]\s*["'][^"'\s]{8,}["']/i],
  ["Database connection URI with credentials", /(postgres|mysql|mongodb|redis):\/\/[^:\s]+:[^@\s]+@/i],
];

const SKIP = new Set(["node_modules", ".git", "dist", "coverage", ".governance"]);
const ALLOW = /scan-secrets|\.test\.ts$/; // the scanner and its fixtures may contain patterns

function* files(dir) {
  try {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) yield* files(p);
      else if (/\.(ts|js|mjs|json|md|ya?ml|env|sh|txt|php|blade\.php|vue|kt|gradle)$/.test(name) || name.startsWith(".env")) yield p;
    }
  } catch {
    // Directory might be inaccessible
  }
}

const findings = [];
for (const f of files(targetDir)) {
  if (/(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".env.example")) {
    findings.push(`${f}: .env file must not be committed to repository`);
    continue;
  }
  if (ALLOW.test(f)) continue;
  try {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (allowlistPatterns.some((pattern) => pattern.test(line))) return;
        for (const [name, re] of RULES) {
          if (re.test(line)) {
            findings.push(`${f}:${i + 1}: ${name}`);
          }
        }
      });
  } catch {
    // Binary or unreadable file
  }
}

if (findings.length) {
  console.error(findings.map((x) => "[FAIL] " + x).join("\n"));
  process.exit(1);
}

console.log("secrets ok");
