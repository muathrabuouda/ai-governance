/**
 * Governance Policy Engine
 * Evaluates gate execution results against declarative project policies.
 * Converts static hardcoded CLI logic into policy-driven invariant evaluation.
 * Supports dynamic profiles (strict, standard, lenient, or custom) and schema validation.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
 * Built-in governance profiles establishing calibrated thresholds.
 */
export const BUILTIN_PROFILES = {
  strict: {
    name: "strict",
    description: "Strict Production Policy — Zero tolerance, all 9 gates required, fail on warnings",
    fail_on_warning: true,
    gate_overrides: {
      spec_integrity: { required: true, on_missing: "fail", on_failure: "fail" },
      threat_modeling: { required: true, on_missing: "fail", on_failure: "fail" },
      secrets: { required: true, on_missing: "fail", on_failure: "fail" },
      git_audit: { required: true, on_missing: "fail", on_failure: "fail" },
      dependencies: { required: true, on_missing: "fail", on_failure: "fail" },
      formatting: { required: true, on_missing: "fail", on_failure: "fail" },
      static_analysis: { required: true, on_missing: "fail", on_failure: "fail" },
      test_suite: { required: true, on_missing: "fail", on_failure: "fail" },
      design_system: { required: true, on_missing: "fail", on_failure: "fail" },
    },
  },
  standard: {
    name: "standard",
    description: "Standard Development Policy — Core gates required, format and linter advise with warnings",
    fail_on_warning: false,
    gate_overrides: {
      spec_integrity: { required: true, on_missing: "fail", on_failure: "fail" },
      threat_modeling: { required: true, on_missing: "fail", on_failure: "fail" },
      secrets: { required: true, on_missing: "fail", on_failure: "fail" },
      git_audit: { required: true, on_missing: "fail", on_failure: "fail" },
      dependencies: { required: true, on_missing: "warn", on_failure: "fail" },
      formatting: { required: false, on_missing: "skip", on_failure: "warn" },
      static_analysis: { required: false, on_missing: "warn", on_failure: "warn" },
      test_suite: { required: true, on_missing: "fail", on_failure: "fail" },
      design_system: { required: false, on_missing: "skip", on_failure: "warn" },
    },
  },
  lenient: {
    name: "lenient",
    description: "Lenient Prototype Policy — Permissive spike mode, only spec and secrets are blocking",
    fail_on_warning: false,
    gate_overrides: {
      spec_integrity: { required: true, on_missing: "fail", on_failure: "fail" },
      threat_modeling: { required: false, on_missing: "skip", on_failure: "warn" },
      secrets: { required: true, on_missing: "fail", on_failure: "fail" },
      git_audit: { required: false, on_missing: "skip", on_failure: "warn" },
      dependencies: { required: false, on_missing: "skip", on_failure: "warn" },
      formatting: { required: false, on_missing: "skip", on_failure: "warn" },
      static_analysis: { required: false, on_missing: "skip", on_failure: "warn" },
      test_suite: { required: false, on_missing: "skip", on_failure: "warn" },
      design_system: { required: false, on_missing: "skip", on_failure: "warn" },
    },
  },
};

/**
 * Base fallback policy.
 */
export const DEFAULT_POLICY = {
  version: "1.0.0",
  profile: "standard",
  fail_on_warning: false,
  gates: {
    spec_integrity: {
      name: "Specification & Criteria Lock",
      required: true,
      on_missing: "fail",
      on_failure: "fail",
    },
    threat_modeling: {
      name: "Threat Model Coverage",
      required: true,
      on_missing: "fail",
      on_failure: "fail",
    },
    secrets: {
      name: "Secret Leaks & Token Scanning",
      required: true,
      on_missing: "fail",
      on_failure: "fail",
      enforce_gitleaks_in_ci: true,
    },
    git_audit: {
      name: "Conventional Commit & Git Hygiene",
      required: true,
      on_missing: "fail",
      on_failure: "fail",
    },
    dependencies: {
      name: "Dependency Version Pinning & Approval",
      required: true,
      on_missing: "fail",
      on_failure: "fail",
    },
    formatting: {
      name: "Code Formatting",
      required: false,
      on_missing: "skip",
      on_failure: "warn",
    },
    static_analysis: {
      name: "Static Analysis & Linting",
      required: false,
      on_missing: "warn",
      on_failure: "warn",
    },
    test_suite: {
      name: "Automated Test Suite",
      required: true,
      on_missing: "fail",
      on_failure: "fail",
    },
    design_system: {
      name: "UI Design Tokens & System Compliance",
      required: false,
      on_missing: "skip",
      on_failure: "warn",
    },
  },
};

/**
 * Validates policy schema structure and values.
 * @param {object} policy
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePolicy(policy) {
  const errors = [];
  if (!policy || typeof policy !== "object") {
    return { valid: false, errors: ["Policy must be a valid JSON object"] };
  }

  if (!policy.gates || typeof policy.gates !== "object") {
    errors.push("Policy must define a 'gates' mapping object");
  } else {
    for (const [gateKey, gateConfig] of Object.entries(policy.gates)) {
      if (typeof gateConfig !== "object" || !gateConfig) {
        errors.push(`Gate '${gateKey}' configuration must be an object`);
        continue;
      }
      if (gateConfig.required !== undefined && typeof gateConfig.required !== "boolean") {
        errors.push(`Gate '${gateKey}.required' must be a boolean`);
      }
      if (gateConfig.on_missing && !["fail", "warn", "skip"].includes(gateConfig.on_missing)) {
        errors.push(`Gate '${gateKey}.on_missing' must be 'fail', 'warn', or 'skip'`);
      }
      if (gateConfig.on_failure && !["fail", "warn"].includes(gateConfig.on_failure)) {
        errors.push(`Gate '${gateKey}.on_failure' must be 'fail' or 'warn'`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Loads project governance policy from .governance/policy.json with profile resolution.
 * Supports overriding profile via parameter (e.g. from --profile=strict).
 *
 * @param {string} [projectRoot]
 * @param {string} [profileOverride]
 * @returns {typeof DEFAULT_POLICY & { profileDescription: string }}
 */
export function loadPolicy(projectRoot = process.cwd(), profileOverride) {
  let custom = {};
  const policyFile = resolve(projectRoot, ".governance", "policy.json");

  if (existsSync(policyFile)) {
    try {
      custom = JSON.parse(readFileSync(policyFile, "utf8"));
    } catch (err) {
      throw new Error(
        `Failed to parse .governance/policy.json: ${err.message}. Policy file is corrupted or contains invalid JSON (Fail-Closed).`,
      );
    }
  }

  // Determine active profile name
  const requestedProfile = (profileOverride || custom.profile || "standard").toLowerCase();

  // Find profile definition (built-in or custom user-defined in policy.profiles)
  const profileDef =
    BUILTIN_PROFILES[requestedProfile] ||
    (custom.profiles && custom.profiles[requestedProfile]);

  if (!profileDef) {
    const available = [
      ...Object.keys(BUILTIN_PROFILES),
      ...(custom.profiles ? Object.keys(custom.profiles) : []),
    ];
    throw new Error(
      `Unknown policy profile "${requestedProfile}". Available profiles: ${available.join(", ")} (Fail-Closed).`,
    );
  }

  // Assemble gate configurations: Base -> Custom/Profile Overrides
  // If profile is explicitly specified via CLI, its overrides take precedence over project custom defaults.
  const isCliOverride = Boolean(profileOverride);
  const allGateKeys = new Set([
    ...Object.keys(DEFAULT_POLICY.gates),
    ...(custom.gates ? Object.keys(custom.gates) : []),
    ...(profileDef.gate_overrides ? Object.keys(profileDef.gate_overrides) : []),
  ]);
  const resolvedGates = {};
  for (const key of allGateKeys) {
    const baseConfig = DEFAULT_POLICY.gates[key] || {};
    const profileOverrideConfig = (profileDef.gate_overrides && profileDef.gate_overrides[key]) || {};
    const customConfig = (custom.gates && custom.gates[key]) || {};

    resolvedGates[key] = isCliOverride
      ? {
          ...baseConfig,
          ...customConfig,
          ...profileOverrideConfig,
        }
      : {
          ...baseConfig,
          ...profileOverrideConfig,
          ...customConfig,
        };
  }

  const resolvedPolicy = {
    version: custom.version || DEFAULT_POLICY.version,
    profile: requestedProfile,
    profileDescription: profileDef.description || `${requestedProfile} policy profile`,
    fail_on_warning:
      custom.fail_on_warning !== undefined
        ? Boolean(custom.fail_on_warning)
        : Boolean(profileDef.fail_on_warning),
    gates: resolvedGates,
  };

  const validation = validatePolicy(resolvedPolicy);
  if (!validation.valid) {
    throw new Error(
      `Policy validation failed in .governance/policy.json:\n${validation.errors.map((err) => "       - " + err).join("\n")} (Fail-Closed).`,
    );
  }

  return resolvedPolicy;
}

/**
 * Evaluates an individual gate outcome against project policy rules.
 * Correctly distinguishes between required gates (blocking on failure)
 * and optional gates (warning only unless on_failure is explicitly "fail").
 *
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
    on_failure: "warn",
  };

  const status = result.status || GateStatus.FAILED;

  // 1. Gate Passed
  if (status === GateStatus.PASSED) {
    return {
      passed: true,
      blocking: false,
      status: GateStatus.PASSED,
      message: result.message || `[PASS] ${gateConfig.name} passed`,
    };
  }

  // 2. Gate Failed: Distinguish between required and optional gates
  if (status === GateStatus.FAILED) {
    const isRequired = Boolean(gateConfig.required);
    const onFailure = gateConfig.on_failure || (isRequired ? "fail" : "warn");
    const isBlocking = isRequired || onFailure === "fail";

    if (!isBlocking) {
      return {
        passed: true,
        blocking: false,
        status: GateStatus.REQUIRES_REVIEW,
        message: result.message
          ? `[WARN] ${gateConfig.name} check failed (optional gate, non-blocking): ${result.message}`
          : `[WARN] ${gateConfig.name} check failed (optional gate, non-blocking)`,
      };
    }

    return {
      passed: false,
      blocking: true,
      status: GateStatus.FAILED,
      message: result.message || `[FAIL] ${gateConfig.name} failed verification`,
    };
  }

  // 3. Gate Skipped or Not Configured: Check on_missing policy
  if (status === GateStatus.SKIPPED || status === GateStatus.NOT_CONFIGURED) {
    const onMissing = gateConfig.on_missing || (gateConfig.required ? "fail" : "skip");

    if (gateConfig.required && onMissing === "fail") {
      return {
        passed: false,
        blocking: true,
        status: GateStatus.FAILED,
        message: `[FAIL] ${gateConfig.name} is REQUIRED by policy but was ${status.toLowerCase()}! (Reason: ${result.message || "Not configured"})`,
      };
    }

    if (onMissing === "warn") {
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

  // 4. Gate Requires Review
  if (status === GateStatus.REQUIRES_REVIEW) {
    const isBlocking = Boolean(gateConfig.required);
    return {
      passed: !isBlocking,
      blocking: isBlocking,
      status: GateStatus.REQUIRES_REVIEW,
      message: `[WARN] ${gateConfig.name} requires human review: ${result.message || "Review required"}`,
    };
  }

  // 5. Catch-all unexpected status
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
