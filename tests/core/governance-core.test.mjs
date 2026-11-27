/**
 * Governance Core Engine Integration & Invariant Tests
 * Verifies Policy Engine, State Guardian Hash-Chaining, Story Lifecycle, and Multi-Stack detection.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { describe } from "node:test";

import {
  BUILTIN_PROFILES,
  DEFAULT_POLICY,
  GateStatus,
  evaluateGate,
  loadPolicy,
  validatePolicy,
} from "../../scripts/policy-engine.mjs";

import {
  approveSpec,
  rebaselineSpec,
  calculateBlockHash,
  deprecateStory,
  getGitAttestation,
  getGovernanceStateDir,
  hashText,
  isKeyFingerprintAuthorized,
  loadGovernanceState,
  normalizeKey,
  resolveStrictEnforcement,
  saveGovernanceState,
  verifyAuditChain,
  verifyCriteriaIntegrity,
  verifyThreatModelCoverage,
} from "../../scripts/state-guardian.mjs";

import { detectStacks, isExecutableAvailable, runStage } from "../../scripts/stack-runner.mjs";
import { generateVerdict, getGateBadge, loadLatestVerdict } from "../../scripts/verdict-engine.mjs";
import { buildTraceabilityMatrix } from "../../scripts/traceability.mjs";
import {
  canAgentExecuteAction,
  initAgentContract,
  isPathProtected,
  loadAgentContract,
} from "../../scripts/agent-control.mjs";

describe("Governance Core Integration Tests", () => {
  describe("Policy Engine", () => {
    test("evaluates passed gate as non-blocking passed", () => {
      const res = evaluateGate("test_gate", { status: GateStatus.PASSED, message: "OK" });
      assert.equal(res.passed, true);
      assert.equal(res.blocking, false);
      assert.equal(res.status, GateStatus.PASSED);
    });

    test("evaluates failed gate as blocking if required", () => {
      const policy = {
        ...DEFAULT_POLICY,
        gates: {
          test_required: { name: "Required Gate", required: true, on_failure: "fail" },
        },
      };
      const res = evaluateGate("test_required", { status: GateStatus.FAILED, message: "Error" }, policy);
      assert.equal(res.passed, false);
      assert.equal(res.blocking, true);
      assert.equal(res.status, GateStatus.FAILED);
    });

    test("evaluates failed gate as non-blocking warning if optional", () => {
      const policy = {
        ...DEFAULT_POLICY,
        gates: {
          test_optional: { name: "Optional Gate", required: false, on_failure: "warn" },
        },
      };
      const res = evaluateGate("test_optional", { status: GateStatus.FAILED, message: "Minor lint" }, policy);
      assert.equal(res.passed, true);
      assert.equal(res.blocking, false);
      assert.equal(res.status, GateStatus.REQUIRES_REVIEW);
      assert.match(res.message, /\[WARN\]/);
    });

    test("handles skipped gate based on on_missing policy", () => {
      const policyFail = {
        ...DEFAULT_POLICY,
        gates: {
          gate_fail: { name: "Gate Fail", required: true, on_missing: "fail" },
          gate_warn: { name: "Gate Warn", required: true, on_missing: "warn" },
        },
      };

      const resFail = evaluateGate("gate_fail", { status: GateStatus.NOT_CONFIGURED }, policyFail);
      assert.equal(resFail.passed, false);
      assert.equal(resFail.blocking, true);

      const resWarn = evaluateGate("gate_warn", { status: GateStatus.NOT_CONFIGURED }, policyFail);
      assert.equal(resWarn.passed, true);
      assert.equal(resWarn.blocking, false);
      assert.equal(resWarn.status, GateStatus.SKIPPED);
    });

    test("loads strict profile and overrides all gates to required", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-policy-test-"));
      try {
        const policy = loadPolicy(tempDir, "strict");
        assert.equal(policy.profile, "strict");
        assert.equal(policy.fail_on_warning, true);
        assert.equal(policy.gates.formatting.required, true);
        assert.equal(policy.gates.test_suite.on_missing, "fail");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("validates policy schema correctly", () => {
      const valid = validatePolicy(DEFAULT_POLICY);
      assert.equal(valid.valid, true);

      const invalid = validatePolicy({ gates: { bad_gate: { required: "yes" } } });
      assert.equal(invalid.valid, false);
      assert.ok(invalid.errors.length > 0);
    });

    test("fails closed when policy.json contains invalid or corrupted JSON", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-policy-corrupt-"));
      try {
        const govDir = join(tempDir, ".governance");
        mkdirSync(govDir, { recursive: true });
        writeFileSync(join(govDir, "policy.json"), "{ invalid: json, corrupted content", "utf8");

        assert.throws(
          () => loadPolicy(tempDir),
          /Failed to parse \.governance\/policy\.json.*Fail-Closed/i,
          "loadPolicy must fail closed when policy file contains malformed JSON",
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("fails closed when requested policy profile is unknown", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-policy-unknown-"));
      try {
        assert.throws(
          () => loadPolicy(tempDir, "non_existent_profile"),
          /Unknown policy profile "non_existent_profile".*Fail-Closed/i,
          "loadPolicy must fail closed when an unrecognized profile is requested",
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("fails closed when policy configuration violates schema validation", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-policy-schema-"));
      try {
        const govDir = join(tempDir, ".governance");
        mkdirSync(govDir, { recursive: true });
        writeFileSync(
          join(govDir, "policy.json"),
          JSON.stringify({
            version: "1.0.0",
            gates: {
              invalid_gate: {
                required: "not_a_boolean",
              },
            },
          }),
          "utf8",
        );

        assert.throws(
          () => loadPolicy(tempDir),
          /Policy validation failed/i,
          "loadPolicy must fail closed when schema validation encounters invalid gate types",
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("State Guardian & Cryptographic Hash Chain", () => {
    test("detects tampering when audit log block hash is manipulated", () => {
      const state = {
        version: "1.0.0",
        storyHashes: {},
        auditLog: [
          {
            index: 0,
            timestamp: new Date().toISOString(),
            action: "APPROVE_SPEC",
            author: "Tester",
            previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
            details: { note: "genesis" },
          },
        ],
      };
      state.auditLog[0].hash = calculateBlockHash(state.auditLog[0]);

      // Valid chain
      const initialCheck = verifyAuditChain(state);
      assert.equal(initialCheck.ok, true);

      // Tampered data
      state.auditLog[0].details.note = "tampered note";
      const tamperedCheck = verifyAuditChain(state);
      assert.equal(tamperedCheck.ok, false);
      assert.ok(tamperedCheck.violations.some((v) => /tampered with/i.test(v)));
    });

    test("detects broken hash chain continuity", () => {
      const block0 = {
        index: 0,
        timestamp: new Date().toISOString(),
        action: "APPROVE_SPEC",
        author: "Tester",
        previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
        details: {},
      };
      block0.hash = calculateBlockHash(block0);

      const block1 = {
        index: 1,
        timestamp: new Date().toISOString(),
        action: "APPROVE_SPEC",
        author: "Tester",
        previousHash: "invalid_previous_hash_value",
        details: {},
      };
      block1.hash = calculateBlockHash(block1);

      const state = {
        version: "1.0.0",
        storyHashes: {},
        auditLog: [block0, block1],
      };

      const chainCheck = verifyAuditChain(state);
      assert.equal(chainCheck.ok, false);
      assert.ok(chainCheck.violations.some((v) => /hash chain broken/i.test(v)));
    });

    test("manages story lifecycle and deprecation without false violations", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-story-test-"));
      try {
        const govDir = getGovernanceStateDir(tempDir);
        const state = {
          version: "1.0.0",
          specVersion: "1.0.0",
          storyHashes: {
            "1": hashText("Acceptance criteria 1"),
          },
          deprecatedStories: {},
          auditLog: [],
        };
        saveGovernanceState(state, tempDir);

        // Deprecate story 1
        const depResult = deprecateStory(1, "Superseded by story 2", "Test Author", tempDir, {
          supersededBy: "2",
        });
        assert.equal(depResult, true);

        const loaded = loadGovernanceState(tempDir);
        assert.equal(loaded.storyHashes["1"], undefined);
        assert.ok(loaded.deprecatedStories["1"]);
        assert.equal(loaded.deprecatedStories["1"].supersededBy, "2");
        assert.equal(loaded.auditLog.length, 1);
        assert.equal(loaded.auditLog[0].action, "DEPRECATE_STORY");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("retrieves valid git attestation with non-zero tree hash and signature status", () => {
      const gitMeta = getGitAttestation(process.cwd());
      assert.equal(gitMeta.isGit, true);
      assert.ok(gitMeta.commitSha.length === 40);
      assert.notEqual(gitMeta.commitSha, "0000000000000000000000000000000000000000");
      // Tree hash must be real 40-char hex, NOT the Windows failure default
      assert.ok(gitMeta.treeHash.length === 40);
      assert.notEqual(gitMeta.treeHash, "0000000000000000000000000000000000000000");
      assert.ok(typeof gitMeta.signatureStatus === "string");
    });

    test("captures full acceptance criteria tables and detects cell mutation or row deletion", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-criteria-test-"));
      try {
        const docsDir = join(tempDir, "docs", "foundation");
        mkdirSync(docsDir, { recursive: true });

        const initialSpec = `# Specification
### Story 1: View Slots
| ID  | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 1.1 | 5 slots free | User views page | 5 slots displayed |
| 1.2 | Clinic closed | User views Friday | 0 slots displayed |

---

### Story 2: Book Slot
| ID  | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 2.1 | Slot is free | User books | Appointment created |
`;
        writeFileSync(join(docsDir, "02-spec.md"), initialSpec, "utf8");

        // 1. Approve initial specification
        const approved = approveSpec("Tester", {}, tempDir);
        assert.equal(approved, true);

        // 2. Initial verification must pass
        const check1 = verifyCriteriaIntegrity(tempDir);
        assert.equal(check1.ok, true);
        assert.equal(check1.violations.length, 0);

        // 3. Mutate a single cell in Story 1 (e.g. 5 slots -> 6 slots)
        const mutatedSpec = initialSpec.replace("5 slots displayed", "6 slots displayed");
        writeFileSync(join(docsDir, "02-spec.md"), mutatedSpec, "utf8");

        const check2 = verifyCriteriaIntegrity(tempDir);
        assert.equal(check2.ok, false);
        assert.ok(check2.violations.some((v) => v.includes("Story 1") && v.includes("modified or weakened")));

        // 4. Delete row 1.2 from Story 1
        const rowDeletedSpec = `# Specification
### Story 1: View Slots
| ID  | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 1.1 | 5 slots free | User views page | 5 slots displayed |

---

### Story 2: Book Slot
| ID  | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 2.1 | Slot is free | User books | Appointment created |
`;
        writeFileSync(join(docsDir, "02-spec.md"), rowDeletedSpec, "utf8");

        const check3 = verifyCriteriaIntegrity(tempDir);
        assert.equal(check3.ok, false);
        assert.ok(check3.violations.some((v) => v.includes("Story 1") && v.includes("modified or weakened")));

        // 5. Delete entire criteria table without formal deprecation
        const criteriaDeletedSpec = `# Specification
### Story 1: View Slots
Some descriptive text without any table.

---

### Story 2: Book Slot
| ID  | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 2.1 | Slot is free | User books | Appointment created |
`;
        writeFileSync(join(docsDir, "02-spec.md"), criteriaDeletedSpec, "utf8");

        const check4 = verifyCriteriaIntegrity(tempDir);
        assert.equal(check4.ok, false);
        assert.ok(check4.violations.some((v) => v.includes("Story 1") && v.includes("deleted")));
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("blocks agent impersonation and unauthorized approvals when strict key enforcement is active", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-attack-test-"));
      try {
        const docsDir = join(tempDir, "docs", "foundation");
        const govDir = join(tempDir, ".governance");
        mkdirSync(docsDir, { recursive: true });
        mkdirSync(govDir, { recursive: true });

        // 1. Setup policy and authorized approvers with strict key enforcement
        writeFileSync(
          join(govDir, "authorized-approvers.json"),
          JSON.stringify({
            strictKeyEnforcement: true,
            allowedKeyFingerprints: ["4A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B"],
            allowedSigners: ["Muath R Abu Ouda <muathrabuouda@hotmail.com>"],
          }),
          "utf8",
        );

        const specContent = `# Specification
### Story 1: Critical Core Feature
| ID  | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 1.1 | Strict condition | Action executed | Deterministic outcome verified |
`;
        writeFileSync(join(docsDir, "02-spec.md"), specContent, "utf8");

        // 2. Attack Simulation: An agent alters criteria and attempts to self-approve with forged name/email
        // Since tempDir has no signed Git commit (%G? is not 'G' or not a git repo), it MUST be rejected
        const attackResult = approveSpec("Muath R Abu Ouda", {}, tempDir);
        assert.equal(attackResult, false, "Approval must fail when cryptographic key signature is missing");

        // 3. Ensure no state file was generated or modified
        assert.equal(existsSync(join(govDir, "state.json")), false, "state.json must not be created on failed approval");

        // 4. Verify that verifyCriteriaIntegrity correctly identifies unapproved specification
        const integrityCheck = verifyCriteriaIntegrity(tempDir);
        assert.equal(integrityCheck.ok, false);
        assert.ok(integrityCheck.violations.some((v) => v.includes("has NOT been approved")));
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("accurately normalizes and matches full 40-char fingerprints, primary fingerprints, and key IDs", () => {
      const fullFingerprint = "4A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B";
      const keyId = "9A0B1C2D3E4F5A6B"; // 16-hex key ID suffix

      // 1. Direct match with full 40-char fingerprint
      assert.equal(
        isKeyFingerprintAuthorized({ signerFingerprint: fullFingerprint }, [fullFingerprint]),
        true,
      );

      // 2. Formatted with spaces or colons (e.g. gpg output "4A8B 9C0D ...")
      const formattedFingerprint = "4A8B 9C0D 1E2F 3A4B 5C6D  7E8F 9A0B 1C2D 3E4F 5A6B";
      assert.equal(
        isKeyFingerprintAuthorized({ signerFingerprint: fullFingerprint }, [formattedFingerprint]),
        true,
      );

      // 3. Allowed list has full 40-char fingerprint, git log returned 16-char key ID
      assert.equal(
        isKeyFingerprintAuthorized({ signerKeyId: keyId }, [fullFingerprint]),
        true,
      );

      // 4. Allowed list has 16-char key ID, git log returned full 40-char fingerprint
      assert.equal(
        isKeyFingerprintAuthorized({ signerFingerprint: fullFingerprint }, [keyId]),
        true,
      );

      // 5. Allowed list has primary fingerprint matching %GP
      assert.equal(
        isKeyFingerprintAuthorized({ primaryFingerprint: fullFingerprint }, [fullFingerprint]),
        true,
      );

      // 6. Non-matching key fingerprint must be rejected
      assert.equal(
        isKeyFingerprintAuthorized({ signerFingerprint: fullFingerprint }, ["FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"]),
        false,
      );
    });

    test("rejects short 32-bit key IDs (< 16 hex chars) to prevent Evil32 collision attacks", () => {
      const fullFingerprint = "4A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B";
      const short32BitId = "3E4F5A6B"; // Only 8 hex chars (32-bit) - vulnerable to Evil32 collision

      // Candidate provides only 8-char short key ID - MUST be rejected
      assert.equal(
        isKeyFingerprintAuthorized({ signerKeyId: short32BitId }, [fullFingerprint]),
        false,
        "32-bit short key IDs must never be accepted to prevent Evil32 collision attacks",
      );

      // Allowed list contains only 8-char short key ID - MUST be rejected
      assert.equal(
        isKeyFingerprintAuthorized({ signerFingerprint: fullFingerprint }, [short32BitId]),
        false,
        "Allowed list with 32-bit short key IDs must be ignored to prevent collision attacks",
      );

      // 64-bit Long Key ID (16 hex chars) is accepted
      const long64BitId = "9A0B1C2D3E4F5A6B";
      assert.equal(
        isKeyFingerprintAuthorized({ signerKeyId: long64BitId }, [fullFingerprint]),
        true,
        "64-bit Long Key ID (16 hex chars) is cryptographically safe and accepted",
      );
    });

    test("treats empty allowedKeyFingerprints as blocking rejection in strict mode", () => {
      const candidateKey = {
        signerFingerprint: "173E65E275BE3CD344241ECC0F2E74E6E851065E",
        signerKeyId: "0F2E74E6E851065E",
      };

      // 1. isKeyFingerprintAuthorized must never authorize when allowedKeys is empty, null, or non-array
      assert.equal(isKeyFingerprintAuthorized(candidateKey, []), false);
      assert.equal(isKeyFingerprintAuthorized(candidateKey, null), false);
      assert.equal(isKeyFingerprintAuthorized(candidateKey, undefined), false);

      // 2. Reject rogue key when authorized list has a specific key
      const rogueKey = {
        signerFingerprint: "E9289A7C191137B4AABBCCDDEEFF001122334455",
        signerKeyId: "E9289A7C191137B4",
      };
      assert.equal(
        isKeyFingerprintAuthorized(rogueKey, ["173E65E275BE3CD344241ECC0F2E74E6E851065E"]),
        false,
        "Rogue key with valid format must be blocked when not in allowed list",
      );

      // 3. verifyAuditChain in strict mode must report a violation if allowedKeyFingerprints is empty
      const tempDir = mkdtempSync(join(tmpdir(), "gov-empty-keys-"));
      try {
        const govDir = join(tempDir, ".governance");
        mkdirSync(govDir, { recursive: true });
        writeFileSync(
          join(govDir, "authorized-approvers.json"),
          JSON.stringify({ allowedKeyFingerprints: [] }),
          "utf8",
        );
        const dummyState = {
          auditLog: [
            {
              index: 0,
              timestamp: new Date().toISOString(),
              action: "APPROVE_SPEC",
              author: "Tester",
              previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
              details: {},
              attestation: {
                commitSha: "1111111111111111111111111111111111111111",
                treeHash: "2222222222222222222222222222222222222222",
                signatureStatus: "G",
              },
              hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            },
          ],
        };
        const res = verifyAuditChain(dummyState, tempDir, { strict: true });
        assert.equal(res.ok, false);
        assert.ok(
          res.violations.some((v) => v.includes("allowedKeyFingerprints") || v.includes("cannot be empty")),
          "Must report violation for empty allowedKeyFingerprints in strict mode",
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("detects tampering when headAnchor is deleted or missing in strict mode", () => {
      const block0 = {
        index: 0,
        timestamp: new Date().toISOString(),
        action: "APPROVE_SPEC",
        author: "Tester",
        previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
        details: {},
        attestation: {
          commitSha: "1111111111111111111111111111111111111111",
          treeHash: "2222222222222222222222222222222222222222",
          signatureStatus: "G",
        },
      };
      block0.hash = calculateBlockHash(block0);

      // State without headAnchor
      const stateWithoutAnchor = {
        version: "1.0.0",
        storyHashes: {},
        auditLog: [block0],
      };

      // In non-strict mode without git repo, it passes basic chain check
      const nonStrictCheck = verifyAuditChain(stateWithoutAnchor, null, { strict: false });
      assert.equal(nonStrictCheck.ok, true);

      // In strict mode, missing headAnchor MUST fail immediately
      const strictCheck = verifyAuditChain(stateWithoutAnchor, null, { strict: true });
      assert.equal(strictCheck.ok, false);
      assert.ok(strictCheck.violations.some((v) => v.includes('Missing "headAnchor"')));

      // Tampered headAnchor MUST also fail
      const stateWithWrongAnchor = {
        ...stateWithoutAnchor,
        headAnchor: "invalid_anchor_hash_value",
      };
      const mismatchCheck = verifyAuditChain(stateWithWrongAnchor, null, { strict: true });
      assert.equal(mismatchCheck.ok, false);
      assert.ok(mismatchCheck.violations.some((v) => v.includes("head anchor mismatch")));
    });

    test("validates github.actor against allowedGitHubActors during spec approval", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-actor-test-"));
      try {
        const docsDir = join(tempDir, "docs", "foundation");
        const govDir = join(tempDir, ".governance");
        mkdirSync(docsDir, { recursive: true });
        mkdirSync(govDir, { recursive: true });

        writeFileSync(
          join(docsDir, "02-spec.md"),
          `# Specification\n### Story 1: Actor Test\n| ID | Given | When | Then |\n| :-- | :--- | :--- | :--- |\n| 1.1 | Valid actor | Approves | Passes |\n`,
          "utf8",
        );

        writeFileSync(
          join(govDir, "authorized-approvers.json"),
          JSON.stringify({
            allowedGitHubActors: ["muathrabuouda"],
            allowedSigners: ["Muath R Abu Ouda <muathrabuouda@hotmail.com>"],
          }),
          "utf8",
        );

        // Unauthorized actor MUST be rejected
        const unauthorizedResult = approveSpec("Attacker", { actor: "unauthorized-hacker" }, tempDir);
        assert.equal(unauthorizedResult, false, "Unauthorized GitHub actor must be rejected");

        // Authorized actor is accepted in non-strict mode
        const authorizedResult = approveSpec("Muath R Abu Ouda <muathrabuouda@hotmail.com>", { actor: "muathrabuouda" }, tempDir);
        assert.equal(authorizedResult, true, "Authorized GitHub actor must be accepted");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("unifies strict resolution consistently across policy and authorized approvers", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-strict-res-test-"));
      try {
        const govDir = join(tempDir, ".governance");
        mkdirSync(govDir, { recursive: true });

        // Default empty directory resolves to false
        assert.equal(resolveStrictEnforcement(tempDir), false);

        // When authorized-approvers.json defines strictKeyEnforcement: true, it resolves to true
        writeFileSync(
          join(govDir, "authorized-approvers.json"),
          JSON.stringify({
            strictKeyEnforcement: true,
            allowedKeyFingerprints: ["4A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B"],
          }),
          "utf8",
        );
        assert.equal(resolveStrictEnforcement(tempDir), true);

        // When policy.json defines profile: "strict", it resolves to true
        writeFileSync(
          join(govDir, "authorized-approvers.json"),
          JSON.stringify({
            allowedKeyFingerprints: ["4A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B"],
          }),
          "utf8",
        );
        writeFileSync(
          join(govDir, "policy.json"),
          JSON.stringify({ profile: "strict" }),
          "utf8",
        );
        assert.equal(resolveStrictEnforcement(tempDir), true);

        // Explicit option override takes precedence
        assert.equal(resolveStrictEnforcement(tempDir, { strict: false }), false);
        assert.equal(resolveStrictEnforcement(tempDir, { strict: true }), true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("blocks uncommitted working tree modifications to state or spec in strict mode", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-dirty-test-"));
      try {
        const docsDir = join(tempDir, "docs", "foundation");
        const govDir = join(tempDir, ".governance");
        mkdirSync(docsDir, { recursive: true });
        mkdirSync(govDir, { recursive: true });

        // Initialize git repository
        const execOptions = { cwd: tempDir, stdio: "ignore" };
        execSync("git init", execOptions);
        execSync('git config user.name "Tester"', execOptions);
        execSync('git config user.email "test@example.com"', execOptions);

        const specFile = join(docsDir, "02-spec.md");
        writeFileSync(specFile, "# Specification\n### Story 1: Test\n| ID | Given | When | Then |\n| :-- | :--- | :--- | :--- |\n| 1.1 | A | B | C |\n", "utf8");

        const stateFile = join(govDir, "state.json");
        const state = {
          version: "1.0.0",
          specVersion: "1.0.0",
          storyHashes: { "1": hashText("| ID | Given | When | Then |\n| :-- | :--- | :--- | :--- |\n| 1.1 | A | B | C |") },
          auditLog: [{
            index: 0,
            timestamp: new Date().toISOString(),
            action: "APPROVE_SPEC",
            author: "Tester",
            previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
            hash: "placeholder",
            attestation: {
              commitSha: "1111111111111111111111111111111111111111",
              treeHash: "2222222222222222222222222222222222222222",
              signatureStatus: "G",
            },
            details: {},
          }],
        };
        state.auditLog[0].hash = calculateBlockHash(state.auditLog[0]);
        state.headAnchor = hashText(`${state.auditLog[0].hash}:${state.auditLog[0].attestation.commitSha}:${state.auditLog[0].attestation.treeHash}`);
        writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");

        // Initial commit
        execSync("git add .", execOptions);
        execSync('git commit -m "chore: initial commit"', execOptions);

        // Tag anchor
        execSync(`git tag -a "governance/spec-v0" -m "Spec Lock" HEAD`, execOptions);

        // Tamper: modify state.json in working tree WITHOUT committing
        state.auditLog[0].details = { tampered: true };
        writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");

        // Running verifyAuditChain in strict mode MUST fail with uncommitted working tree violation
        const checkResult = verifyAuditChain(state, tempDir, { strict: true });
        assert.equal(checkResult.ok, false);
        assert.ok(
          checkResult.violations.some((v) => v.includes("Uncommitted working tree modifications")),
          "Must reject uncommitted working tree modifications in strict mode",
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("rejects approver identifiers containing command injection characters", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-injection-test-"));
      try {
        const docsDir = join(tempDir, "docs", "foundation");
        mkdirSync(docsDir, { recursive: true });
        writeFileSync(
          join(docsDir, "02-spec.md"),
          `# Specification\n### Story 1: Test\n| ID | Given | When | Then |\n| :-- | :--- | :--- | :--- |\n| 1.1 | A | B | C |\n`,
          "utf8",
        );

        // Attempt injection payloads
        assert.equal(approveSpec('Muath"; rm -rf / #', {}, tempDir), false);
        assert.equal(approveSpec("Muath && whoami", {}, tempDir), false);
        assert.equal(approveSpec("Muath | cat /etc/passwd", {}, tempDir), false);
        assert.equal(approveSpec("Muath$(id)", {}, tempDir), false);
        assert.equal(approveSpec("Muath`id`", {}, tempDir), false);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("Multi-Stack Runner", () => {
    test("detects Node stack when package.json is present", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-stack-test-"));
      try {
        writeFileSync(
          join(tempDir, "package.json"),
          JSON.stringify({ name: "test-app", scripts: { test: "echo ok" } }),
          "utf8",
        );
        const stacks = detectStacks(tempDir);
        assert.ok(stacks.some((s) => s.type === "node"));
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("detects command availability correctly", () => {
      assert.equal(isExecutableAvailable("node"), true);
      assert.equal(isExecutableAvailable("non_existent_executable_12345"), false);
    });
  });

  describe("Verdict & Traceability Engine", () => {
    test("generates cryptographic verdict.json and report.md evidence", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-verdict-test-"));
      try {
        const gateResults = [
          {
            key: "spec_integrity",
            name: "Spec Lock",
            required: true,
            status: GateStatus.PASSED,
            passed: true,
            blocking: false,
          },
          {
            key: "test_suite",
            name: "Test Suite",
            required: true,
            status: GateStatus.PASSED,
            passed: true,
            blocking: false,
          },
        ];
        const policy = { profile: "strict", fail_on_warning: true };
        const stacks = [{ name: "Node.js", type: "node", hasInstalledDeps: true }];

        const verdict = generateVerdict(
          { gateResults, policy, stacks, startTime: Date.now() - 100 },
          tempDir,
        );

        assert.equal(verdict.verdict, "APPROVED");
        assert.ok(verdict.signature);
        assert.equal(verdict.signature.length, 64);
        assert.equal(verdict.gates.length, 2);

        const loaded = loadLatestVerdict(tempDir);
        assert.ok(loaded);
        assert.equal(loaded.signature, verdict.signature);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("sets verdict to REJECTED when required gate fails", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-verdict-fail-"));
      try {
        const gateResults = [
          {
            key: "secrets",
            name: "Secret Scan",
            required: true,
            status: GateStatus.FAILED,
            passed: false,
            blocking: true,
          },
        ];
        const verdict = generateVerdict(
          { gateResults, policy: { profile: "standard" }, stacks: [], startTime: Date.now() },
          tempDir,
        );
        assert.equal(verdict.verdict, "REJECTED");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("renders truthful status badges for all gate states in report.md", () => {
      // 1. Verify getGateBadge helper directly
      assert.equal(getGateBadge({ status: GateStatus.PASSED, passed: true }), "[PASS]");
      assert.equal(getGateBadge({ status: GateStatus.FAILED, passed: false }), "[FAIL]");
      assert.equal(getGateBadge({ status: GateStatus.SKIPPED, passed: true }), "[SKIP]");
      assert.equal(getGateBadge({ status: GateStatus.NOT_CONFIGURED, passed: true }), "[NOT CONFIGURED]");
      assert.equal(getGateBadge({ status: GateStatus.NOT_CONFIGURED, passed: false }), "[FAIL]");
      assert.equal(getGateBadge({ status: GateStatus.REQUIRES_REVIEW, passed: true }), "[WARN]");

      // 2. Verify full verdict report generation with skipped gate
      const tempDir = mkdtempSync(join(tmpdir(), "gov-report-badge-test-"));
      try {
        const gateResults = [
          {
            key: "secrets",
            name: "Secrets Scan",
            required: true,
            status: GateStatus.PASSED,
            passed: true,
            blocking: false,
            message: "No secret leaks detected",
          },
          {
            key: "formatting",
            name: "Formatting",
            required: false,
            status: GateStatus.SKIPPED,
            passed: true,
            blocking: false,
            message: "Skipped optional formatting check",
          },
        ];

        const verdict = generateVerdict(
          { gateResults, policy: { profile: "standard" }, stacks: [], startTime: Date.now() },
          tempDir,
        );

        const reportContent = readFileSync(join(tempDir, ".governance/evidence/report.md"), "utf8");
        // Must contain truthful [SKIP] for formatting, NEVER [PASS] Formatting
        assert.ok(reportContent.includes("[SKIP] Formatting"));
        assert.ok(!reportContent.includes("[PASS] Formatting"));
        assert.ok(reportContent.includes("[PASS] Secrets Scan"));
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("builds traceability matrix mapping stories to evidence", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-trace-test-"));
      try {
        const matrix = buildTraceabilityMatrix(tempDir);
        assert.ok(typeof matrix === "object");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("separates content digest from digital issuer proof in verdict payload", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-verdict-proof-"));
      try {
        const dummyGateResults = [
          { key: "spec_integrity", name: "Spec Lock", required: true, passed: true, status: GateStatus.PASSED },
        ];
        const policy = { profile: "standard", fail_on_warning: false };
        const verdict = generateVerdict(
          { gateResults: dummyGateResults, policy, stacks: [], startTime: Date.now() },
          tempDir,
        );

        // 1. Must define contentDigest object with sha256 algorithm and hash
        assert.ok(verdict.contentDigest);
        assert.equal(verdict.contentDigest.algorithm, "sha256");
        assert.match(verdict.contentDigest.value, /^[a-f0-9]{64}$/);

        // 2. Must define digitalProof object separating identity from hash
        assert.ok(verdict.digitalProof);
        assert.ok("type" in verdict.digitalProof);
        assert.ok("verified" in verdict.digitalProof);

        // 3. Backward-compatible signature alias preserved
        assert.equal(verdict.signature, verdict.contentDigest.value);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("performs semantic criteria verification in traceability matrix", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-semantic-test-"));
      try {
        const docsDir = join(tempDir, "docs", "foundation");
        const testsDir = join(tempDir, "tests");
        mkdirSync(docsDir, { recursive: true });
        mkdirSync(testsDir, { recursive: true });

        // Specification with Story 1 having criteria 1.1 and 1.2
        const specContent = `# Specification
### Story 1: Authentication Core
| ID  | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 1.1 | Valid token | Login called | Session created |
| 1.2 | Invalid token | Login called | Error returned |
`;
        writeFileSync(join(docsDir, "02-spec.md"), specContent, "utf8");

        // Test file referencing criteria 1.1 and 1.2
        const testContent = `// Story 1: tests
// Verifies criteria 1.1 and 1.2
test("verifies criteria 1.1 and 1.2", () => {});
`;
        writeFileSync(join(testsDir, "story1.test.ts"), testContent, "utf8");

        const matrix = buildTraceabilityMatrix(tempDir);
        assert.ok(matrix["1"]);
        assert.ok(matrix["1"].semanticVerification);
        assert.equal(matrix["1"].semanticVerification.totalCriteria, 2);
        assert.equal(matrix["1"].semanticVerification.coveragePercent, 100);
        assert.equal(matrix["1"].semanticVerification.fullyVerified, true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("Agent Control & Governance Contract", () => {
    test("identifies protected paths according to contract", () => {
      assert.ok(isPathProtected(".governance/state.json"));
      assert.ok(isPathProtected(".governance/policy.json"));
      assert.ok(isPathProtected("docs/foundation/adr/001-test.md"));
      assert.ok(isPathProtected("LICENSE.md"));

      assert.equal(isPathProtected("src/components/button.ts"), null);
      assert.equal(isPathProtected("tests/feature.test.ts"), null);
    });

    test("initializes and loads agent contract file", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-contract-test-"));
      try {
        const initRes = initAgentContract(tempDir);
        assert.equal(initRes, true);

        const contract = loadAgentContract(tempDir);
        assert.equal(contract.strictMode, true);
        assert.ok(contract.protectedPaths.includes(".governance/state.json"));
        assert.equal(contract.forbiddenActions.deleteTestFiles, true);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("enforces pre-execution permissions via canAgentExecuteAction", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-perm-test-"));
      try {
        const context = { projectRoot: tempDir };

        // 1. Modifying protected path must be blocked
        const checkProtected = canAgentExecuteAction("write", ".governance/state.json", context);
        assert.equal(checkProtected.allowed, false);
        assert.match(checkProtected.reason, /protected/i);

        // 2. Deleting test files must be blocked
        const checkDeleteTest = canAgentExecuteAction("delete", "tests/feature.test.ts", context);
        assert.equal(checkDeleteTest.allowed, false);
        assert.match(checkDeleteTest.reason, /prohibited/i);

        // 3. Modifying ADR must be blocked
        const checkModifyAdr = canAgentExecuteAction("modify", "docs/foundation/adr/001-test.md", context);
        assert.equal(checkModifyAdr.allowed, false);
        assert.match(checkModifyAdr.reason, /protected|Architecture Decision Record/i);

        // 4. Adding unapproved dependency must be blocked
        const checkUnapprovedDep = canAgentExecuteAction("add_dependency", "malicious-package", context);
        assert.equal(checkUnapprovedDep.allowed, false);
        assert.match(checkUnapprovedDep.reason, /not approved/i);

        // 5. Allowed action on normal source code must pass
        const checkNormalWrite = canAgentExecuteAction("write", "src/features/billing.ts", context);
        assert.equal(checkNormalWrite.allowed, true);
        assert.equal(checkNormalWrite.reason, null);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("enforces fail-closed behavior when agent contract JSON is corrupted or malformed", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-agent-failclosed-"));
      try {
        const govDir = join(tempDir, ".governance");
        mkdirSync(govDir, { recursive: true });

        // 1. Corrupted JSON file must throw Fail-Closed error
        writeFileSync(join(govDir, "agent-contract.json"), "{ corrupted_json: true,", "utf8");
        assert.throws(
          () => loadAgentContract(tempDir),
          /Fail-Closed.*corrupted or invalid JSON/i,
          "loadAgentContract must fail closed on malformed JSON",
        );

        // 2. Invalid schema (non-object) must throw Fail-Closed error
        writeFileSync(join(govDir, "agent-contract.json"), JSON.stringify(["not", "an", "object"]), "utf8");
        assert.throws(
          () => loadAgentContract(tempDir),
          /Fail-Closed.*must be a valid JSON object/i,
          "loadAgentContract must fail closed on array root",
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("establishes migration baseline anchor to verify legacy specifications", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-baseline-test-"));
      try {
        const docsDir = join(tempDir, "docs", "foundation");
        const govDir = join(tempDir, ".governance");
        mkdirSync(docsDir, { recursive: true });
        mkdirSync(govDir, { recursive: true });

        const specContent = `# Specification
### Story 1: Foundation
| ID  | Given | When | Then |
| :-- | :--- | :--- | :--- |
| 1.1 | Initial setup | Initialized | Works |
`;
        writeFileSync(join(docsDir, "02-spec.md"), specContent, "utf8");

        // Rebaseline spec
        const res = rebaselineSpec(
          "Muath R Abu Ouda <muathrabuouda@hotmail.com>",
          "Migration baseline for tests",
          {},
          tempDir,
        );
        assert.equal(res, true);

        const state = JSON.parse(readFileSync(join(govDir, "state.json"), "utf8"));
        assert.ok(state.baseline);
        assert.equal(state.baseline.blockIndex, 0);
        assert.equal(state.auditLog[0].action, "RE_BASELINE");
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
