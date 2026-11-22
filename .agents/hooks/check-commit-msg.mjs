// Commit message validation hook.
// Validates commit message against Conventional Commits: <type>(<scope>): <summary>
import { readFileSync } from "node:fs";

export const ALLOWED_TYPES = ["feat", "fix", "refactor", "test", "docs", "chore", "perf", "build"];

export function validateCommitMessage(message) {
  const firstLine = message.trim().split("\n")[0].trim();
  const pattern = /^([a-z]+)(?:\(([a-z0-9_-]+)\))?:\s+(.+)$/;
  const match = firstLine.match(pattern);

  if (!match) {
    return {
      valid: false,
      error: `First line must follow Conventional Commits: '<type>(<scope>): <short summary>', got: "${firstLine}"`,
    };
  }

  const [, type, , summary] = match;

  if (!ALLOWED_TYPES.includes(type)) {
    return {
      valid: false,
      error: `Invalid commit type "${type}". Allowed: ${ALLOWED_TYPES.join(", ")}`,
    };
  }

  if (firstLine.length > 72) {
    return {
      valid: false,
      error: `First line is too long (${firstLine.length} chars). Maximum allowed is 72 chars.`,
    };
  }

  if (summary.endsWith(".")) {
    return {
      valid: false,
      error: "Summary line should not end with a trailing period.",
    };
  }

  return { valid: true };
}

// CLI entrypoint if executed directly with a commit message file
if (process.argv[1]?.endsWith("check-commit-msg.mjs") && process.argv[2]) {
  try {
    const raw = readFileSync(process.argv[2], "utf8");
    const result = validateCommitMessage(raw);
    if (!result.valid) {
      console.error(`[Governance Git Hook] ${result.error}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[Governance Git Hook] Could not read commit message file: ${err.message}`);
    process.exit(1);
  }
}
