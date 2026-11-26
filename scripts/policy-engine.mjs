/**
 * Governance Policy Engine
 * Evaluates gate execution results against declarative project policies.
 * Converts static hardcoded CLI logic into policy-driven invariant evaluation.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Gate outcome statuses taxonomy.
 * @readonly
 * @enum {string}
 */
export const GateStatus = {
  PASSED: "PASSED",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
  NOT_CONFIGURED: "NOT_CONFIGURED",
  REQUIRES_REVIEW: "REQUIRES_REVIEW",
};

/**
 * Default strict governance policy.
 * "No code without proof" invariant baseline.
 */
export const DEFAULT_POLICY = {
  version: "1.0.0",
  profile: "strict",
  gates: {
    spec_integrity: {
      name: "Specification & Criteria Lock",
      required: true,
      on_missing: "fail",
    },
    threat_modeling: {
      name: "Threat Model Coverage",
      required: true,
      on_missing: "fail",
    },
    secrets: {
      name: "Secret Leaks & Token Scanning",
      required: true,
      on_missing: "fail",
      enforce_gitleaks_in_ci: true,
    },
    git_audit: {
      name: "Conventional Commit & Git Hygiene",
      required: true,
      on_missing: "fail",
    },
    dependencies: {
      name: "Dependency Version Pinning & Approval",
      required: true,
      on_missing: "fail",
    },
    formatting: {
      name: "Code Formatting",
      required: false,
      on_missing: "skip",
    },
    static_analysis: {
      name: "Static Analysis & Linting",
      required: false,
      on_missing: "warn",
    },
    test_suite: {
      name: "Automated Test Suite",
      required: true,
      on_missing: "fail",
    },
    design_system: {
      name: "UI Design Tokens & System Compliance",
      required: false,
      on_missing: "skip",
    },
  },
};

/**
 * Loads project governance policy from .governance/policy.json or returns default strict policy.
 * @param {string} [projectRoot]
 * @returns {typeof DEFAULT_POLICY}
 */
export function loadPolicy(projectRoot = process.cwd()) {
  const policyFile = resolve(projectRoot, ".governance", "policy.json");
  if (existsSync(policyFile)) {
    try {
      const custom = JSON.parse(readFileSync(policyFile, "utf8"));
      return {
        ...DEFAULT_POLICY,
        ...custom,
        gates: {
          ...DEFAULT_POLICY.gates,
          ...(custom.gates || {}),
        },
      };
    } catch {
      // fallback to default
    }
  }
  return DEFAULT_POLICY;
}

/**
 * Evaluates an individual gate outcome against project policy rules.
 * @param {string} gateKey
 * @param {{ status: string, message?: string }} result
 * @param {typeof DEFAULT_POLICY} [policy]
 * @returns {{ passed: boolean, blocking: boolean, status: string, message: string }}
 */
export function evaluateGate(gateKey, result, policy = DEFAULT_POLICY) {
  const gateConfig = policy.gates[gateKey] || {
    name: gateKey,
    required: false,
    on_missing: "skip",
  };

  const status = result.status || GateStatus.FAILED;

  if (status === GateStatus.PASSED) {
    return {
      passed: true,
      blocking: false,
      status: GateStatus.PASSED,
      message: result.message || `[PASS] ${gateConfig.name} passed`,
    };
  }

  if (status === GateStatus.FAILED) {
    return {
      passed: false,
      blocking: true,
      status: GateStatus.FAILED,
      message: result.message || `[FAIL] ${gateConfig.name} failed verification`,
    };
  }

  if (status === GateStatus.SKIPPED || status === GateStatus.NOT_CONFIGURED) {
    if (gateConfig.required && gateConfig.on_missing === "fail") {
      return {
        passed: false,
        blocking: true,
        status: GateStatus.FAILED,
        message: `[FAIL] ${gateConfig.name} is REQUIRED by policy but was ${status.toLowerCase()}! (Reason: ${result.message || "Not configured"})`,
      };
    }

    if (gateConfig.on_missing === "warn") {
      return {
        passed: true,
        blocking: false,
        status: GateStatus.SKIPPED,
        message: `[WARN] ${gateConfig.name} is not configured: ${result.message || "Skipped by policy"}`,
      };
    }

    return {
      passed: true,
      blocking: false,
      status: GateStatus.SKIPPED,
      message: `[INFO] ${gateConfig.name} skipped: ${result.message || "Not configured"}`,
    };
  }

  if (status === GateStatus.REQUIRES_REVIEW) {
    const isBlocking = gateConfig.required;
    return {
      passed: !isBlocking,
      blocking: isBlocking,
      status: GateStatus.REQUIRES_REVIEW,
      message: `[WARN] ${gateConfig.name} requires human review: ${result.message || "Review required"}`,
    };
  }

  return {
    passed: false,
    blocking: true,
    status: GateStatus.FAILED,
    message: `[FAIL] Unknown outcome status for gate "${gateKey}"`,
  };
}

/**
 * Initializes default policy file in target project if not present.
 * @param {string} [projectRoot]
 */
export function initPolicy(projectRoot = process.cwd()) {
  const govDir = resolve(projectRoot, ".governance");
  if (!existsSync(govDir)) {
    mkdirSync(govDir, { recursive: true });
  }
  const policyFile = resolve(govDir, "policy.json");
  if (!existsSync(policyFile)) {
    writeFileSync(policyFile, JSON.stringify(DEFAULT_POLICY, null, 2), "utf8");
    console.log("[PASS] Initialized default governance policy at .governance/policy.json");
  }
}
