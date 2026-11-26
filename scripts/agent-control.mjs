/**
 * Agent Governance & Control Plane
 * Enforces permission boundaries, protected paths, and immutable test constraints
 * on autonomous AI agents collaborating within the codebase.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getGovernanceStateDir } from "./state-guardian.mjs";

/**
 * Default agent governance contract defining immutable boundaries.
 */
export const DEFAULT_AGENT_CONTRACT = {
  version: "1.0.0",
  strictMode: true,
  protectedPaths: [
    ".governance/state.json",
    ".governance/policy.json",
    ".governance/authorized-approvers.json",
    ".governance/agent-contract.json",
    "docs/foundation/adr/",
    "docs/foundation/01-ambiguity.md",
    "LICENSE",
    "LICENSE.md",
  ],
  forbiddenActions: {
    deleteTestFiles: true,
    modifyExistingAdrs: true,
    unapprovedDependencyAdditions: true,
    alterSpecWithoutHumanSignoff: true,
  },
  allowedCapabilities: [
    "feature_code_generation",
    "test_addition_only",
    "progress_tracking",
    "threat_model_scaffolding",
  ],
};

/**
 * Loads project agent contract from .governance/agent-contract.json or returns default.
 * @param {string} [projectRoot]
 * @returns {typeof DEFAULT_AGENT_CONTRACT}
 */
export function loadAgentContract(projectRoot = process.cwd()) {
  const contractPath = resolve(getGovernanceStateDir(projectRoot), "agent-contract.json");
  if (existsSync(contractPath)) {
    try {
      const custom = JSON.parse(readFileSync(contractPath, "utf8"));
      return {
        ...DEFAULT_AGENT_CONTRACT,
        ...custom,
        protectedPaths: [
          ...new Set([
            ...DEFAULT_AGENT_CONTRACT.protectedPaths,
            ...(custom.protectedPaths || []),
          ]),
        ],
        forbiddenActions: {
          ...DEFAULT_AGENT_CONTRACT.forbiddenActions,
          ...(custom.forbiddenActions || {}),
        },
      };
    } catch {
      // Fallback on parse failure
    }
  }
  return DEFAULT_AGENT_CONTRACT;
}

/**
 * Initializes default agent contract at .governance/agent-contract.json.
 * @param {string} [projectRoot]
 * @param {boolean} [force]
 * @returns {boolean}
 */
export function initAgentContract(projectRoot = process.cwd(), force = false) {
  const contractPath = resolve(getGovernanceStateDir(projectRoot), "agent-contract.json");
  if (existsSync(contractPath) && !force) {
    console.log(`[WARN] Agent contract already exists at .governance/agent-contract.json. Use --force to overwrite.`);
    return false;
  }
  writeFileSync(contractPath, JSON.stringify(DEFAULT_AGENT_CONTRACT, null, 2), "utf8");
  console.log(`[PASS] Initialized Agent Governance Contract at .governance/agent-contract.json`);
  return true;
}

/**
 * Normalizes a file path relative to project root.
 * @param {string} path
 * @returns {string}
 */
function normalizeRelPath(path) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

/**
 * Checks if a relative path matches any protected path or directory prefix.
 * @param {string} relPath
 * @param {string[]} protectedPaths
 * @returns {string|null} The matching protected path pattern, or null
 */
export function isPathProtected(relPath, protectedPaths = DEFAULT_AGENT_CONTRACT.protectedPaths) {
  const norm = normalizeRelPath(relPath);
  for (const pattern of protectedPaths) {
    const normPattern = normalizeRelPath(pattern);
    if (normPattern.endsWith("/")) {
      if (norm.startsWith(normPattern) || norm === normPattern.slice(0, -1)) {
        return pattern;
      }
    } else if (norm === normPattern) {
      return pattern;
    }
  }
  return null;
}

/**
 * Audits current workspace changes against Agent Governance Contract rules.
 * Inspects modified and deleted files from git status / diff.
 *
 * @param {string} [projectRoot]
 * @param {{ baseRef?: string }} [options]
 * @returns {{ passed: boolean, violations: string[], warnings: string[], auditedFiles: string[] }}
 */
export function auditAgentChanges(projectRoot = process.cwd(), options = {}) {
  const contract = loadAgentContract(projectRoot);
  const violations = [];
  const warnings = [];
  const auditedFiles = [];

  let gitStatusOutput = "";
  try {
    gitStatusOutput = execSync("git status --porcelain", {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    // Outside git or git error
    return {
      passed: true,
      violations: [],
      warnings: ["[WARN] Not in a git repository or git command unavailable."],
      auditedFiles: [],
    };
  }

  const lines = gitStatusOutput
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const statusCode = line.slice(0, 2).trim();
    const filePath = line.slice(2).trim();
    auditedFiles.push(filePath);

    // 1. Check Protected Paths Violation
    const protectedMatch = isPathProtected(filePath, contract.protectedPaths);
    if (protectedMatch) {
      violations.push(
        `[PROTECTED PATH] Agent attempted to modify protected file "${filePath}" (matches protected rule: "${protectedMatch}"). Human sign-off required.`,
      );
    }

    // 2. Check Test Deletions Violation
    if (contract.forbiddenActions.deleteTestFiles && (statusCode === "D" || statusCode === "MD")) {
      const isTestFile =
        filePath.startsWith("test/") ||
        filePath.startsWith("tests/") ||
        filePath.includes(".test.") ||
        filePath.includes(".spec.");

      if (isTestFile) {
        violations.push(
          `[FORBIDDEN ACTION] Agent attempted to delete test file "${filePath}". Deleting test coverage is strictly prohibited.`,
        );
      }
    }

    // 3. Check ADR modifications (Existing ADRs are immutable)
    if (
      contract.forbiddenActions.modifyExistingAdrs &&
      filePath.startsWith("docs/foundation/adr/") &&
      (statusCode === "M" || statusCode === "MM")
    ) {
      violations.push(
        `[FORBIDDEN ACTION] Agent attempted to modify existing ADR "${filePath}". Architecture Decision Records are immutable; record a new superseding ADR instead.`,
      );
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
    auditedFiles,
  };
}

/**
 * Formats a terminal summary of the agent audit.
 * @param {{ passed: boolean, violations: string[], warnings: string[], auditedFiles: string[] }} result
 * @returns {string}
 */
export function formatAgentAuditTerminal(result) {
  const lines = [
    `\n================================================================`,
    `   AGENT GOVERNANCE & CONTROL AUDIT`,
    `================================================================`,
  ];

  if (result.auditedFiles.length === 0) {
    lines.push(`[INFO] Working tree clean. Zero modified files to audit.`);
  } else {
    lines.push(`Audited ${result.auditedFiles.length} modified file(s) against agent permission contract:\n`);
    for (const f of result.auditedFiles) {
      const isProt = isPathProtected(f);
      const tag = isProt ? "[BLOCKED: PROTECTED]" : "[ALLOWED]";
      lines.push(`  ${tag} ${f}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push("\nWarnings:");
    for (const w of result.warnings) {
      lines.push(`  ${w}`);
    }
  }

  lines.push(`\n------------------------------------------------`);
  if (result.passed) {
    lines.push(`[PASS] Agent Audit Passed: No permission or boundary violations detected.`);
  } else {
    lines.push(`[FAIL] Agent Audit Failed: ${result.violations.length} boundary violation(s) detected:`);
    for (const v of result.violations) {
      lines.push(`  - ${v}`);
    }
  }
  lines.push(`================================================================\n`);

  return lines.join("\n");
}
