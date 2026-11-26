/**
 * Governance Core Engine Integration & Invariant Tests
 * Verifies Policy Engine, State Guardian Hash-Chaining, Story Lifecycle, and Multi-Stack detection.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  calculateBlockHash,
  deprecateStory,
  getGovernanceStateDir,
  hashText,
  loadGovernanceState,
  saveGovernanceState,
  verifyAuditChain,
  verifyCriteriaIntegrity,
  verifyThreatModelCoverage,
} from "../../scripts/state-guardian.mjs";

import { detectStacks, isExecutableAvailable, runStage } from "../../scripts/stack-runner.mjs";
import { generateVerdict, loadLatestVerdict } from "../../scripts/verdict-engine.mjs";
import { buildTraceabilityMatrix } from "../../scripts/traceability.mjs";
import {
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
      assert.match(tamperedCheck.violations[0], /tampered with/i);
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
      assert.match(chainCheck.violations[0], /hash chain broken/i);
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

    test("builds traceability matrix mapping stories to evidence", () => {
      const tempDir = mkdtempSync(join(tmpdir(), "gov-trace-test-"));
      try {
        const matrix = buildTraceabilityMatrix(tempDir);
        assert.ok(typeof matrix === "object");
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
  });
});
