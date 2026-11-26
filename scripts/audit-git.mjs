/**
 * Governance Git Governance & Conventional Commit Auditor
 * Validates commit messages and git repository hygiene against strict engineering standards.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GateStatus } from "./policy-engine.mjs";

const CONVENTIONAL_TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

const COMMIT_REGEX = new RegExp(`^(${CONVENTIONAL_TYPES.join("|")})(\\([a-z0-9_-]+\\))?: [a-z0-9].{0,71}$`);

/**
 * Validates a single commit message.
 * @param {string} message Commit subject line
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCommitMessage(message) {
  const errors = [];
  const trimmed = message.trim();

  if (!trimmed) {
    errors.push("Commit message cannot be empty.");
    return { valid: false, errors };
  }

  const [subject] = trimmed.split("\n");

  if (subject.length > 72) {
    errors.push(`Subject line is ${subject.length} characters (maximum allowed is 72).`);
  }

  if (subject.endsWith(".")) {
    errors.push("Subject line must not end with a period.");
  }

  if (!COMMIT_REGEX.test(subject)) {
    errors.push(
      `Subject does not match Conventional Commits format "<type>(<scope>): <description>". Allowed types: ${CONVENTIONAL_TYPES.join(", ")}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Runs Git audit across commits and repository state.
 * Audits feature branch commits against main/master, or recent commits on the current branch.
 * Accurately reports SKIPPED when outside a git repository or when zero commits exist.
 * @param {string} [targetDir]
 * @param {number} [fallbackLimit]
 * @returns {{ passed: boolean, status: string, total: number, failed: number, message: string }}
 */
export function runGitAudit(targetDir = process.cwd(), fallbackLimit = 10) {
  let inGitRepo = false;
  try {
    execSync("git rev-parse --is-inside-work-tree", { cwd: targetDir, stdio: "ignore" });
    inGitRepo = true;
  } catch {
    inGitRepo = false;
  }

  if (!inGitRepo) {
    console.log("[INFO] SKIPPED: Git repository not detected in target workspace.");
    return {
      passed: true,
      status: GateStatus.NOT_CONFIGURED,
      total: 0,
      failed: 0,
      message: "Git repository not detected",
    };
  }

  let gitArgs = "";
  let auditScope = "";

  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: targetDir,
      encoding: "utf8",
    }).trim();

    let baseRef = null;
    try {
      execSync("git rev-parse --verify origin/main", { cwd: targetDir, stdio: "ignore" });
      baseRef = "origin/main";
    } catch {
      try {
        execSync("git rev-parse --verify origin/master", { cwd: targetDir, stdio: "ignore" });
        baseRef = "origin/master";
      } catch {
        // base not found
      }
    }

    if (baseRef && branch !== "main" && branch !== "master" && branch !== "HEAD") {
      gitArgs = `${baseRef}..HEAD`;
      auditScope = `branch "${branch}" commits against ${baseRef}`;
    } else {
      gitArgs = `-n ${fallbackLimit}`;
      auditScope = `last ${fallbackLimit} commits on branch "${branch}"`;
    }
  } catch {
    gitArgs = `-n ${fallbackLimit}`;
    auditScope = `last ${fallbackLimit} commits`;
  }

  console.log(`Auditing ${auditScope} for Conventional Commit compliance...\n`);

  let commitLog = "";
  try {
    commitLog = execSync(`git log ${gitArgs} --pretty=format:"%h%x09%s"`, {
      cwd: targetDir,
      encoding: "utf8",
    });
  } catch {
    console.log("[INFO] SKIPPED: No git commits found in target workspace.");
    return {
      passed: true,
      status: GateStatus.SKIPPED,
      total: 0,
      failed: 0,
      message: "Zero commits found in audited range",
    };
  }

  const commits = commitLog
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (commits.length === 0) {
    console.log("[INFO] SKIPPED: Zero commits found in the audited range.");
    return {
      passed: true,
      status: GateStatus.SKIPPED,
      total: 0,
      failed: 0,
      message: "Zero commits found in audited range",
    };
  }

  let failedCount = 0;

  for (const line of commits) {
    const [hash, ...rest] = line.split("\t");
    const subject = rest.join("\t");

    const result = validateCommitMessage(subject);
    if (result.valid) {
      console.log(`[PASS] ${hash} — ${subject}`);
    } else {
      failedCount++;
      console.error(`[FAIL] ${hash} — ${subject}`);
      for (const err of result.errors) {
        console.error(`       -> ${err}`);
      }
    }
  }

  console.log("\n------------------------------------------------");
  if (failedCount === 0) {
    console.log(`Git Audit Passed: ${commits.length} commits verified.`);
    return {
      passed: true,
      status: GateStatus.PASSED,
      total: commits.length,
      failed: 0,
      message: `${commits.length} commits verified against Conventional Commits`,
    };
  } else {
    console.error(`Git Audit Failed: ${failedCount} of ${commits.length} commits violate standards.`);
    return {
      passed: false,
      status: GateStatus.FAILED,
      total: commits.length,
      failed: failedCount,
      message: `${failedCount} of ${commits.length} commits violate Conventional Commit standards`,
    };
  }
}

// CLI Execution entry
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const targetDir = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
  const result = runGitAudit(targetDir);
  process.exit(result.status === GateStatus.FAILED ? 1 : 0);
}
