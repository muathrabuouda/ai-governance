/**
 * Ugarit Tagging & Versioning Manager
 * Enforces the unified Ugarit xx.xx.xx versioning standard: v[MAJOR].[MINOR].[PATCH]
 * Automatically increments version tags per commit based on Conventional Commit semantics:
 * - Breaking changes: increments MAJOR, resets MINOR and PATCH to 00 (v(M+1).00.00)
 * - Feature commits (feat): increments MINOR, resets PATCH to 00 (vM.(m+1).00)
 * - Fix/Chore/Test/Style/Docs commits: increments PATCH by 1 (vM.m.(p+1))
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { execSync } from "node:child_process";
import { resolveGpgBinary } from "./verdict-engine.mjs";

/**
 * Standard regular expression for Ugarit xx.xx.xx version tags.
 * Requires mandatory two-digit formatting for minor and patch segments.
 */
export const UGARIT_TAG_REGEX = /^v?(\d+)\.(\d{2})\.(\d{2})$/;

/**
 * Parses an Ugarit version string into numeric parts.
 *
 * @param {string} versionStr - e.g. "v1.01.02" or "1.01.02"
 * @returns {{ valid: boolean, major: number, minor: number, patch: number, raw: string } | null}
 */
export function parseUgaritVersion(versionStr) {
  if (!versionStr || typeof versionStr !== "string") return null;
  const match = versionStr.trim().match(UGARIT_TAG_REGEX);
  if (!match) return null;

  return {
    valid: true,
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: versionStr.trim(),
  };
}

/**
 * Formats numeric version components into official Ugarit tag format (vXX.XX.XX).
 *
 * @param {number} major
 * @param {number} minor
 * @param {number} patch
 * @returns {string} e.g. "v1.01.02"
 */
export function formatUgaritVersion(major, minor, patch) {
  const mStr = String(minor).padStart(2, "0");
  const pStr = String(patch).padStart(2, "0");
  return `v${major}.${mStr}.${pStr}`;
}

/**
 * Classifies the semantic bump required for a commit based on Conventional Commit message.
 *
 * @param {string} commitSubject - First line of commit message
 * @param {string} [commitBody] - Optional body content for BREAKING CHANGE footers
 * @returns {"major" | "minor" | "patch"}
 */
export function classifyCommitBump(commitSubject, commitBody = "") {
  const text = `${commitSubject || ""}\n${commitBody || ""}`;

  // 1. Major Bump: Breaking changes
  if (/\bBREAKING[- ]CHANGE\b/i.test(text) || /^[a-z]+(\([a-z0-9_-]+\))?!:/i.test(commitSubject || "")) {
    return "major";
  }

  // 2. Minor Bump: New feature capability
  if (/^feat(\([a-z0-9_-]+\))?:/i.test(commitSubject || "")) {
    return "minor";
  }

  // 3. Patch Bump: Bug fixes, chores, refactors, tests, styles, docs
  return "patch";
}

/**
 * Computes the next version tag given a current tag and a commit message.
 * Strictly enforces the zeroing law:
 * - Minor bump resets patch to 00
 * - Major bump resets minor and patch to 00
 *
 * @param {string} currentTag - Current base version, e.g. "v1.01.02"
 * @param {string} commitSubject - Commit message
 * @param {string} [commitBody]
 * @returns {string} Next formatted tag, e.g. "v1.02.00"
 */
export function computeNextTag(currentTag, commitSubject, commitBody = "") {
  const parsed = parseUgaritVersion(currentTag);
  if (!parsed) {
    throw new Error(
      `[Fail-Closed] Current tag "${currentTag}" does not conform to Ugarit xx.xx.xx standard (e.g. v1.00.00).`,
    );
  }

  const bump = classifyCommitBump(commitSubject, commitBody);

  if (bump === "major") {
    return formatUgaritVersion(parsed.major + 1, 0, 0);
  }

  if (bump === "minor") {
    return formatUgaritVersion(parsed.major, parsed.minor + 1, 0);
  }

  return formatUgaritVersion(parsed.major, parsed.minor, parsed.patch + 1);
}

/**
 * Retrieves all git tags from local repository.
 *
 * @param {string} [projectRoot]
 * @returns {string[]}
 */
export function getAllGitTags(projectRoot = process.cwd()) {
  try {
    const output = execSync("git tag -l", {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Audits repository tags for strict Ugarit standard compliance.
 * Identifies non-compliant legacy tags (e.g. v1.1.0, v1.1.2) that violate the xx.xx.xx standard.
 *
 * @param {string} [projectRoot]
 * @returns {{ compliant: string[], nonCompliant: string[], special: string[] }}
 */
export function auditRepositoryTags(projectRoot = process.cwd()) {
  const allTags = getAllGitTags(projectRoot);
  const compliant = [];
  const nonCompliant = [];
  const special = [];

  for (const tag of allTags) {
    if (tag.startsWith("governance/spec-")) {
      special.push(tag);
      continue;
    }

    if (UGARIT_TAG_REGEX.test(tag)) {
      compliant.push(tag);
    } else {
      nonCompliant.push(tag);
    }
  }

  return { compliant, nonCompliant, special };
}

/**
 * Creates a cryptographically signed Git tag for a target commit.
 * Enforces fail-closed: fails if GPG signing fails.
 *
 * @param {string} tagName - Formatted tag (e.g. v1.01.02)
 * @param {string} commitSha - Target commit hash
 * @param {string} tagMessage - Annotated tag message
 * @param {string} [projectRoot]
 * @returns {{ success: boolean, tag: string, error?: string }}
 */
export function createSignedUgaritTag(tagName, commitSha, tagMessage, projectRoot = process.cwd()) {
  if (!UGARIT_TAG_REGEX.test(tagName)) {
    throw new Error(
      `[Fail-Closed] Tag "${tagName}" rejected: must follow Ugarit xx.xx.xx standard (e.g. v1.01.02).`,
    );
  }

  const gpgBin = resolveGpgBinary(projectRoot);
  const escapedMessage = tagMessage.replace(/"/g, '\\"');

  try {
    execSync(`git -c gpg.program=${gpgBin} tag -s -f "${tagName}" "${commitSha}" -m "${escapedMessage}"`, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    return { success: true, tag: tagName };
  } catch (err) {
    return { success: false, tag: tagName, error: err.message };
  }
}

/**
 * Prunes non-compliant legacy tags (such as v1.1.0, v1.1.2) from repository.
 *
 * @param {string} [projectRoot]
 * @returns {{ deleted: string[], errors: string[] }}
 */
export function pruneLegacyTags(projectRoot = process.cwd()) {
  const audit = auditRepositoryTags(projectRoot);
  const deleted = [];
  const errors = [];

  for (const badTag of audit.nonCompliant) {
    try {
      execSync(`git tag -d "${badTag}"`, {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
      });
      deleted.push(badTag);
    } catch (err) {
      errors.push(`Failed to delete tag ${badTag}: ${err.message}`);
    }
  }

  return { deleted, errors };
}
