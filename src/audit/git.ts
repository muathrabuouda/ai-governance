/**
 * Governance Git Audit Engine
 * Validates commit messages against Conventional Commits specification.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { execSync } from "node:child_process";

export const CONVENTIONAL_TYPES = [
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
] as const;

export type ConventionalType = (typeof CONVENTIONAL_TYPES)[number];

const COMMIT_REGEX = new RegExp(`^(${CONVENTIONAL_TYPES.join("|")})(\\([a-z0-9_-]+\\))?: [a-z0-9].{0,71}$`);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCommitMessage(message: string): ValidationResult {
  const errors: string[] = [];
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

export function runGitAudit(limit = 5): { passed: boolean; total: number; failed: number } {
  console.log(`Auditing last ${limit} commits for Conventional Commit compliance...\n`);

  let commitLog = "";
  try {
    commitLog = execSync(`git log -n ${limit} --pretty=format:"%h%x09%s"`, {
      encoding: "utf8",
    });
  } catch {
    console.warn("Notice: Not in a git repository or no commits found yet.");
    return { passed: true, total: 0, failed: 0 };
  }

  const commits = commitLog
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

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
    return { passed: true, total: commits.length, failed: 0 };
  } else {
    console.error(`Git Audit Failed: ${failedCount} of ${commits.length} commits violate standards.`);
    return { passed: false, total: commits.length, failed: failedCount };
  }
}
