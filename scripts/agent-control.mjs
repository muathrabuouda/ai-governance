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
    ".governance/keys/",
    "docs/standards/dependencies.md",
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
    arbitraryExecution: true,
  },
  enforceGateway: true,
  allowedCapabilities: [
    "feature_code_generation",
    "test_addition_only",
    "progress_tracking",
    "threat_model_scaffolding",
  ],
};

/**
 * Loads project agent contract from .governance/agent-contract.json or returns default.
 * Enforces Fail-Closed behavior: throws immediately on corrupt JSON or schema violations.
 *
 * @param {string} [projectRoot]
 * @returns {typeof DEFAULT_AGENT_CONTRACT}
 */
export function loadAgentContract(projectRoot = process.cwd()) {
  const contractPath = resolve(getGovernanceStateDir(projectRoot), "agent-contract.json");
  if (existsSync(contractPath)) {
    let rawContent = "";
    try {
      rawContent = readFileSync(contractPath, "utf8");
    } catch (err) {
      throw new Error(`[Fail-Closed] Unable to read Agent Contract at ${contractPath}: ${err.message}`);
    }

    let custom;
    try {
      custom = JSON.parse(rawContent);
    } catch (err) {
      throw new Error(
        `[Fail-Closed] Agent Contract at ${contractPath} is corrupted or invalid JSON: ${err.message}. Agent execution halted.`,
      );
    }

    if (!custom || typeof custom !== "object" || Array.isArray(custom)) {
      throw new Error(`[Fail-Closed] Agent Contract at ${contractPath} must be a valid JSON object.`);
    }

    if (custom.protectedPaths && !Array.isArray(custom.protectedPaths)) {
      throw new Error(`[Fail-Closed] Agent Contract: protectedPaths must be an array of string paths.`);
    }

    if (
      custom.forbiddenActions &&
      (typeof custom.forbiddenActions !== "object" || Array.isArray(custom.forbiddenActions))
    ) {
      throw new Error(`[Fail-Closed] Agent Contract: forbiddenActions must be an object.`);
    }

    return {
      ...DEFAULT_AGENT_CONTRACT,
      ...custom,
      protectedPaths: [
        ...new Set([...DEFAULT_AGENT_CONTRACT.protectedPaths, ...(custom.protectedPaths || [])]),
      ],
      forbiddenActions: {
        ...DEFAULT_AGENT_CONTRACT.forbiddenActions,
        ...(custom.forbiddenActions || {}),
      },
    };
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
    console.log(
      `[WARN] Agent contract already exists at .governance/agent-contract.json. Use --force to overwrite.`,
    );
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
export function auditAgentChanges(projectRoot = process.cwd(), _options = {}) {
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

    // 4. Check Unapproved Dependency Additions on package.json modification
    if (
      contract.forbiddenActions.unapprovedDependencyAdditions &&
      (filePath === "package.json" || filePath.endsWith("/package.json"))
    ) {
      try {
        const fullPkgPath = resolve(projectRoot, filePath);
        if (existsSync(fullPkgPath)) {
          const pkg = JSON.parse(readFileSync(fullPkgPath, "utf8"));
          const currentDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
          const approved = loadApprovedDependencyNames(projectRoot);
          const unapproved = currentDeps.filter((d) => !approved.has(d));
          if (unapproved.length > 0) {
            violations.push(
              `[FORBIDDEN ACTION] Agent added unapproved dependency (${unapproved.join(", ")}). All packages must be pre-approved in docs/standards/dependencies.md.`,
            );
          }
        }
      } catch {
        // Fallback
      }
    }

    // 5. Enforce Gateway Execution Layer (Fail-closed on unlogged bypass)
    if (contract.enforceGateway && (statusCode === "M" || statusCode === "A" || statusCode === "??")) {
      const logFile = resolve(projectRoot, ".governance", "evidence", "agent-execution.log");
      let isLogged = false;
      if (existsSync(logFile)) {
        try {
          const logContent = readFileSync(logFile, "utf8");
          const normFile = normalizeRelPath(filePath);
          isLogged =
            logContent.includes(`target=${normFile}`) ||
            logContent.includes(`target=${filePath}`) ||
            logContent.includes("status=ALLOWED") ||
            logContent.includes("action=shell_exec");
        } catch {
          // Unreadable log
        }
      }
      if (!isLogged && contract.strictMode) {
        warnings.push(
          `[GATEWAY NOTICE] Modification to "${filePath}" was performed without recorded gateway action. Ensure modifications route through 'governance exec'.`,
        );
      }
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
 * Reads approved dependencies from docs/standards/dependencies.md or docs/dependencies.md.
 * @param {string} [projectRoot]
 * @returns {Set<string>}
 */
export function loadApprovedDependencyNames(projectRoot = process.cwd()) {
  const standardDepsPath = resolve(projectRoot, "docs/standards/dependencies.md");
  const legacyDepsPath = resolve(projectRoot, "docs/dependencies.md");
  const depsPath = existsSync(standardDepsPath) ? standardDepsPath : legacyDepsPath;

  if (!existsSync(depsPath)) {
    return new Set();
  }

  try {
    let content = "";
    // Root-of-trust check: if docs/standards/dependencies.md has uncommitted modifications,
    // prevent agent from self-authorizing new dependencies! Load authoritative content from HEAD.
    try {
      const relPath = normalizeRelPath(depsPath.replace(resolve(projectRoot), ""));
      const isModified =
        execSync(`git status --porcelain -- "${relPath}"`, {
          cwd: projectRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim().length > 0;

      if (isModified) {
        content = execSync(`git show HEAD:"${relPath}"`, {
          cwd: projectRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
      } else {
        content = readFileSync(depsPath, "utf8");
      }
    } catch {
      content = readFileSync(depsPath, "utf8");
    }

    const names = content
      .split("\n")
      .filter((l) => /^\|\s*[@a-z0-9]/.test(l))
      .map((l) => l.split("|")[1]?.trim())
      .filter(Boolean);
    return new Set(names);
  } catch {
    return new Set();
  }
}

/**
 * Pre-execution permission check to determine if an action by an agent on a target path is permitted.
 * Can be invoked prior to writing, modifying, or deleting files or running dependency commands.
 *
 * @param {string} action - Action type: "write" | "modify" | "delete" | "add_dependency"
 * @param {string} targetPath - Relative target path or package identifier
 * @param {object} [context] - Context details (e.g. { projectRoot })
 * @returns {{ allowed: boolean, reason: string|null, rule: string|null }}
 */
export function canAgentExecuteAction(action, targetPath, context = {}) {
  const projectRoot = context.projectRoot || process.cwd();
  const contract = loadAgentContract(projectRoot);

  // 1. Check Protected Paths
  if (action === "write" || action === "modify" || action === "delete") {
    const protectedMatch = isPathProtected(targetPath, contract.protectedPaths);
    if (protectedMatch) {
      return {
        allowed: false,
        reason: `Target path "${targetPath}" is protected under rule "${protectedMatch}". Direct agent alteration requires human authorization.`,
        rule: `protectedPaths:${protectedMatch}`,
      };
    }
  }

  // 2. Check Test Deletions
  if (action === "delete" && contract.forbiddenActions.deleteTestFiles) {
    const norm = normalizeRelPath(targetPath);
    if (
      norm.startsWith("test/") ||
      norm.startsWith("tests/") ||
      norm.includes(".test.") ||
      norm.includes(".spec.")
    ) {
      return {
        allowed: false,
        reason: `Deleting test file "${targetPath}" is strictly prohibited by agent contract.`,
        rule: "forbiddenActions:deleteTestFiles",
      };
    }
  }

  // 3. Check ADR modifications
  if (action === "modify" && contract.forbiddenActions.modifyExistingAdrs) {
    const norm = normalizeRelPath(targetPath);
    if (norm.startsWith("docs/foundation/adr/")) {
      return {
        allowed: false,
        reason: `Modifying existing Architecture Decision Record "${targetPath}" is prohibited. Create a new superseding ADR instead.`,
        rule: "forbiddenActions:modifyExistingAdrs",
      };
    }
  }

  // 4. Check Unapproved Dependency Additions
  if (action === "add_dependency" && contract.forbiddenActions.unapprovedDependencyAdditions) {
    const approved = loadApprovedDependencyNames(projectRoot);
    if (!approved.has(targetPath)) {
      return {
        allowed: false,
        reason: `Package "${targetPath}" is not approved in docs/standards/dependencies.md. Unapproved dependency additions are prohibited.`,
        rule: "forbiddenActions:unapprovedDependencyAdditions",
      };
    }
  }

  // 5. Check Shell Execution Boundaries & Safety Invariants
  if (action === "exec") {
    const cmd = (context.command || targetPath || "").trim();

    // 5a. Mutating or targeting protected paths via shell commands
    for (const p of contract.protectedPaths) {
      const normP = p.replace(/\\/g, "/");
      const isReferenced = cmd.includes(normP) || cmd.includes(p);
      if (
        isReferenced &&
        /(?:>|>>|rm\b|del\b|rimraf\b|mv\b|move\b|git\s+checkout\b|git\s+reset\b|sed\b)/i.test(cmd)
      ) {
        return {
          allowed: false,
          reason: `Command attempts to mutate protected path "${normP}". Execution blocked by agent contract.`,
          rule: "protectedPaths",
        };
      }
    }

    // 5b. Destructive Git operations (force push, hard reset, unverified clean)
    if (/git\s+push\s+.*(?:--force|-f\b)/i.test(cmd)) {
      return {
        allowed: false,
        reason: "Force pushing to git remotes is strictly prohibited for autonomous agents.",
        rule: "forbiddenActions:destructiveGit",
      };
    }
    if (/git\s+reset\s+--hard/i.test(cmd)) {
      return {
        allowed: false,
        reason: "Hard git resets destroy uncommitted work and are prohibited for autonomous agents.",
        rule: "forbiddenActions:destructiveGit",
      };
    }

    // 5c. Privilege alteration or permission escalation
    if (/(?:chmod|chown|attrib|takeown|sudo)\b/i.test(cmd)) {
      return {
        allowed: false,
        reason: "Modifying file permissions or executing with elevated privileges is prohibited.",
        rule: "forbiddenActions:privilegeTampering",
      };
    }

    // 5d. Remote pipeline execution (curl | sh, wget | bash, netcat)
    if (
      /(?:curl|wget)\s+.*\|\s*(?:sh|bash|zsh|powershell|cmd)/i.test(cmd) ||
      /\b(?:nc|netcat|ncat)\b/i.test(cmd)
    ) {
      return {
        allowed: false,
        reason: "Piping remote network responses directly into a shell interpreter is strictly prohibited.",
        rule: "forbiddenActions:remotePipelineExecution",
      };
    }

    // 5e. Arbitrary execution policy check in strict mode
    if (contract.forbiddenActions.arbitraryExecution && contract.strictMode) {
      const baseCmd = cmd
        .split(/[\s;&|]+/)[0]
        .toLowerCase()
        .replace(/^[.\\/]+/, "");
      const allowedBinaries = new Set([
        "git",
        "node",
        "npm",
        "npx",
        "pnpm",
        "yarn",
        "scribe",
        "prettier",
        "eslint",
        "test",
        "echo",
        "cat",
        "dir",
        "ls",
        "mkdir",
        "cp",
        "copy",
        "mv",
        "move",
        "type",
        "grep",
        "find",
      ]);

      if (baseCmd && !allowedBinaries.has(baseCmd)) {
        return {
          allowed: false,
          reason: `Binary or command "${baseCmd}" is not permitted under strict agent contract execution policies.`,
          rule: "forbiddenActions:arbitraryExecution",
        };
      }
    }
  }

  return {
    allowed: true,
    reason: null,
    rule: null,
  };
}

/**
 * Installs Git pre-commit hook in .git/hooks/pre-commit for real-time agent boundary enforcement.
 * @param {string} [projectRoot]
 * @returns {boolean}
 */
export function installAgentPreCommitHook(projectRoot = process.cwd()) {
  const hooksDir = resolve(projectRoot, ".git", "hooks");
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }
  const hookFile = resolve(hooksDir, "pre-commit");
  const scriptContent = `#!/bin/sh\n# AI Governance Agent Pre-Commit Hook\nnode bin/governance.mjs agent:audit || {\n  echo "[FAIL] Pre-commit agent boundary enforcement failed!"\n  exit 1\n}\n`;
  writeFileSync(hookFile, scriptContent, { mode: 0o755 });
  return true;
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
