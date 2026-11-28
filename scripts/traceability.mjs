/**
 * Requirement-to-Code & Test Traceability Engine
 * Maps user stories and acceptance criteria from 02-spec.md to implementation files,
 * unit/integration tests, and STRIDE threat models.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { extractCriteriaBlocks, loadGovernanceState } from "./state-guardian.mjs";
import { getEvidenceDir } from "./verdict-engine.mjs";

/**
 * Acceptance criteria verification lifecycle states.
 * @readonly
 * @enum {string}
 */
export const CriteriaLifecycle = {
  PENDING: "PENDING",
  REFERENCED: "REFERENCED",
  BOUND: "BOUND",
  TESTED: "TESTED",
  PASSED: "PASSED",
  FAILED: "FAILED",
};

/**
 * Parses test run reports into a normalized list of test executions.
 * Supports Node.js test runner (JSON/events), Jest/Vitest, Pest/PHPUnit, and generic schemas.
 *
 * @param {string|object} rawReport
 * @returns {Array<{ name: string, status: "passed"|"failed"|"skipped", duration?: number }>}
 */
export function parseTestReport(rawReport) {
  if (!rawReport) return [];
  let data = rawReport;
  if (typeof rawReport === "string") {
    try {
      data = JSON.parse(rawReport);
    } catch {
      // Check if line-delimited JSON events (Node.js test runner)
      const lines = rawReport
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const events = [];
      for (const line of lines) {
        try {
          events.push(JSON.parse(line));
        } catch {
          // Skip non-json line
        }
      }
      if (events.length > 0) {
        return parseTestEvents(events);
      }
      return [];
    }
  }

  // Case 1: Normalized { tests: [ { name, status } ] }
  if (Array.isArray(data.tests)) {
    return data.tests.map((t) => ({
      name: t.name || t.title || t.test || "",
      status:
        t.status === "pass" || t.status === "passed" || t.passed === true
          ? "passed"
          : t.status === "fail" || t.status === "failed" || t.passed === false
            ? "failed"
            : "skipped",
      duration: t.duration || t.time || 0,
    }));
  }

  // Case 2: Jest / Vitest { testResults: [ { assertionResults: [...] } ] }
  if (Array.isArray(data.testResults)) {
    const list = [];
    for (const suite of data.testResults) {
      if (Array.isArray(suite.assertionResults)) {
        for (const test of suite.assertionResults) {
          list.push({
            name: `${suite.name ? basename(suite.name) + " > " : ""}${test.title || test.fullName || ""}`,
            status: test.status === "passed" ? "passed" : test.status === "failed" ? "failed" : "skipped",
            duration: test.duration || 0,
          });
        }
      }
    }
    return list;
  }

  // Case 3: Simple array of results
  if (Array.isArray(data)) {
    return parseTestEvents(data);
  }

  return [];
}

/**
 * Normalizes test event payloads from event streams or array outputs.
 * @param {any[]} events
 * @returns {Array<{ name: string, status: "passed"|"failed"|"skipped", duration?: number }>}
 */
function parseTestEvents(events) {
  const list = [];
  for (const ev of events) {
    if (ev.type === "test:pass" || ev.type === "test:fail") {
      list.push({
        name: ev.data?.name || "",
        status: ev.type === "test:pass" ? "passed" : "failed",
        duration: ev.data?.details?.duration_ms || 0,
      });
    } else if (ev.name && (ev.status || ev.passed !== undefined)) {
      list.push({
        name: ev.name,
        status: ev.status === "passed" || ev.status === "pass" || ev.passed === true ? "passed" : "failed",
        duration: ev.duration || 0,
      });
    }
  }
  return list;
}

/**
 * Loads test execution results from .governance/evidence/test-results.json or custom path.
 * @param {string} [projectRoot]
 * @param {string} [customPath]
 * @returns {Array<{ name: string, status: "passed"|"failed"|"skipped", duration?: number }>}
 */
export function loadExecutionTestReport(projectRoot = process.cwd(), customPath = null) {
  const evidenceDir = getEvidenceDir(projectRoot);
  const targetPath = customPath
    ? resolve(projectRoot, customPath)
    : resolve(evidenceDir, "test-results.json");
  if (!existsSync(targetPath)) return [];
  try {
    const content = readFileSync(targetPath, "utf8");
    return parseTestReport(content);
  } catch {
    return [];
  }
}

/**
 * Recursively scans directory for files matching target patterns.
 * @param {string} dir
 * @param {string[]} extensions
 * @param {string[]} ignoreDirs
 * @returns {string[]}
 */
export function scanFiles(
  dir,
  extensions = [".ts", ".js", ".mjs", ".php", ".py", ".kt", ".java"],
  ignoreDirs = ["node_modules", "vendor", ".git", ".governance", "dist", "build"],
) {
  if (!existsSync(dir)) return [];
  const results = [];

  function walk(currentDir) {
    let entries = [];
    try {
      entries = readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name)) {
          walk(join(currentDir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          results.push(join(currentDir, entry.name));
        }
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Parses individual criteria IDs from a story's criteria table text.
 * @param {string} criteriaTableText
 * @returns {string[]}
 */
export function parseStoryCriteriaIds(criteriaTableText) {
  if (!criteriaTableText) return [];
  const lines = criteriaTableText.split(/\r?\n/).map((l) => l.trim());
  const ids = [];
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cols = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cols.length >= 1) {
      const id = cols[0];
      if (/^id$/i.test(id) || /^:?-+:?$/.test(id)) continue;
      if (id) ids.push(id);
    }
  }
  return ids;
}

/**
 * Builds a complete traceability matrix for all stories in target project.
 * Implements the 5-stage Semantic Verification Lifecycle:
 * PENDING -> REFERENCED -> BOUND -> TESTED -> PASSED
 *
 * @param {string} [projectRoot]
 * @param {object} [options]
 * @returns {Record<string, object>}
 */
export function buildTraceabilityMatrix(projectRoot = process.cwd(), options = {}) {
  const blocks = extractCriteriaBlocks(projectRoot);
  const state = loadGovernanceState(projectRoot);
  const threatDir = resolve(projectRoot, "docs/lifecycle/threat-model");

  const codeFiles = scanFiles(projectRoot);
  const matrix = {};

  const testExecutions = options.testResults || loadExecutionTestReport(projectRoot, options.testResultsPath);

  // Collect all story numbers from spec, state, and deprecated
  const allStoryNums = new Set([
    ...Object.keys(blocks),
    ...Object.keys(state.storyHashes || {}),
    ...Object.keys(state.deprecatedStories || {}),
  ]);

  for (const storyNum of allStoryNums) {
    const isDeprecated = Boolean(state.deprecatedStories && state.deprecatedStories[storyNum]);
    const isApproved = Boolean(state.storyHashes && state.storyHashes[storyNum]);
    const hasSpec = Boolean(blocks[storyNum]);

    const threatFile = resolve(threatDir, `story-${storyNum}.md`);
    const hasThreatModel = existsSync(threatFile);

    const regexTags = [
      new RegExp(`@story\\s+${storyNum}\\b`, "i"),
      new RegExp(`Story\\s+${storyNum}\\b`, "i"),
    ];

    const implementations = [];
    const tests = [];

    for (const filePath of codeFiles) {
      const relPath = filePath.replace(projectRoot, "").replace(/^[\\/]/, "");
      const isTestFile =
        relPath.startsWith("test") ||
        relPath.startsWith("tests") ||
        relPath.includes(".test.") ||
        relPath.includes(".spec.") ||
        basename(filePath).toLowerCase().includes("test");

      const fileBase = basename(filePath);
      const matchesName =
        fileBase.toLowerCase().includes(`story${storyNum}`) ||
        fileBase.toLowerCase().includes(`story-${storyNum}`);

      let matchesContent = false;
      try {
        const content = readFileSync(filePath, "utf8");
        matchesContent = regexTags.some((r) => r.test(content));
      } catch {
        // Skip unreadable files
      }

      if (matchesName || matchesContent) {
        if (isTestFile) {
          tests.push(relPath);
        } else {
          implementations.push(relPath);
        }
      }
    }

    let status = "DRAFT";
    const criteriaTableText = blocks[storyNum] || "";
    const criteriaIds = parseStoryCriteriaIds(criteriaTableText);

    const referencedCriteria = [];
    const boundCriteria = [];
    const testedCriteria = [];
    const passedCriteria = [];
    const failedCriteria = [];
    const criteriaLifecycle = {};

    if (criteriaIds.length > 0 && tests.length > 0) {
      for (const cId of criteriaIds) {
        const escapedId = cId.replace(".", "\\.");
        const mentionRegex = new RegExp(`\\b${escapedId}\\b`, "i");
        const testBindingRegex = new RegExp(
          `(?:test|it|describe|context|suite|def\\s+test_)\\s*\\([\\s\\S]*?['"\`][\\s\\S]*?\\b(?:AC-)?${escapedId}\\b`,
          "i",
        );
        const tagRegex = new RegExp(`(?:\\[(?:AC-)?|@covers?\\s+|@criteria\\s+)${escapedId}\\b`, "i");

        let hasMention = false;
        let hasBinding = false;

        for (const testRelPath of tests) {
          try {
            const content = readFileSync(resolve(projectRoot, testRelPath), "utf8");
            if (testBindingRegex.test(content) || tagRegex.test(content)) {
              hasBinding = true;
              hasMention = true;
              break;
            } else if (mentionRegex.test(content)) {
              hasMention = true;
            }
          } catch {
            // Skip unreadable files
          }
        }

        let stage = CriteriaLifecycle.PENDING;
        let matchedTest = null;

        if (hasMention) {
          referencedCriteria.push(cId);
          stage = CriteriaLifecycle.REFERENCED;
        }
        if (hasBinding) {
          boundCriteria.push(cId);
          stage = CriteriaLifecycle.BOUND;
        }

        // Live test execution report inspection
        if (testExecutions.length > 0) {
          const runRegex = new RegExp(`(?:AC-)?${escapedId}\\b`, "i");
          const executed = testExecutions.find((t) => runRegex.test(t.name));
          if (executed) {
            matchedTest = executed.name;
            testedCriteria.push(cId);
            if (executed.status === "passed") {
              passedCriteria.push(cId);
              stage = CriteriaLifecycle.PASSED;
            } else if (executed.status === "failed") {
              failedCriteria.push(cId);
              stage = CriteriaLifecycle.FAILED;
            } else {
              stage = CriteriaLifecycle.TESTED;
            }
          }
        }

        criteriaLifecycle[cId] = {
          id: cId,
          stage,
          bound: hasBinding,
          referenced: hasMention,
          matchedTest,
        };
      }
    }

    const criteriaCount = criteriaIds.length;
    const refCoveragePercent =
      criteriaCount > 0 ? Math.round((referencedCriteria.length / criteriaCount) * 100) : 0;
    const boundCoveragePercent =
      criteriaCount > 0 ? Math.round((boundCriteria.length / criteriaCount) * 100) : 0;
    const lifecycleCoveragePercent =
      criteriaCount > 0 ? Math.round((passedCriteria.length / criteriaCount) * 100) : 0;

    if (isDeprecated) {
      status = "DEPRECATED";
    } else if (!hasSpec) {
      status = "ORPHANED_HASH";
    } else if (isApproved) {
      if (failedCriteria.length > 0) {
        status = "VERIFICATION_FAILED";
      } else if (testExecutions.length > 0) {
        if (criteriaCount > 0 && passedCriteria.length === criteriaCount && implementations.length > 0) {
          status = "VERIFIED";
        } else if (
          criteriaCount > 0 &&
          boundCriteria.length === criteriaCount &&
          implementations.length > 0
        ) {
          status = "BOUND";
        } else if (implementations.length > 0) {
          status = "PARTIALLY_VERIFIED";
        } else {
          status = "APPROVED";
        }
      } else {
        // When no test report has executed, verification cannot be claimed.
        // Static traceability can only establish BOUND or REFERENCED status.
        if (criteriaCount > 0 && boundCriteria.length === criteriaCount && implementations.length > 0) {
          status = "BOUND";
        } else if (
          criteriaCount > 0 &&
          referencedCriteria.length === criteriaCount &&
          implementations.length > 0
        ) {
          status = "REFERENCED";
        } else if (tests.length > 0 && implementations.length > 0) {
          status = "PARTIALLY_BOUND";
        } else if (implementations.length > 0) {
          status = "IMPLEMENTED";
        } else {
          status = "APPROVED";
        }
      }
    }

    const traceabilityDetails = {
      totalCriteria: criteriaCount,
      referencedCriteria,
      boundCriteria,
      testedCriteria,
      passedCriteria,
      failedCriteria,
      criteriaLifecycle,
      referenceCoveragePercent: refCoveragePercent,
      boundCoveragePercent,
      lifecycleCoveragePercent,
      fullyBound: criteriaCount > 0 && boundCriteria.length === criteriaCount,
      fullyReferenced: criteriaCount > 0 && referencedCriteria.length === criteriaCount,
      fullyPassed: criteriaCount > 0 && passedCriteria.length === criteriaCount,
      // Backward-compatible alias fields:
      coveragePercent: refCoveragePercent,
      // Strict Semantic Verification: fullyVerified requires executed passing tests for ALL criteria
      fullyVerified:
        criteriaCount > 0 && testExecutions.length > 0 && passedCriteria.length === criteriaCount,
    };

    matrix[storyNum] = {
      storyNumber: storyNum,
      status,
      hasSpec,
      isApproved,
      isDeprecated,
      deprecationReason: isDeprecated ? state.deprecatedStories[storyNum].reason : null,
      supersededBy: isDeprecated ? state.deprecatedStories[storyNum].supersededBy : null,
      hasThreatModel,
      threatModelPath: hasThreatModel ? `docs/lifecycle/threat-model/story-${storyNum}.md` : null,
      implementations,
      tests,
      criteriaHash: state.storyHashes[storyNum] || null,
      criteriaTraceability: traceabilityDetails,
      semanticVerification: traceabilityDetails,
    };
  }

  // Persist matrix to .governance/evidence/traceability.json
  const evidenceDir = getEvidenceDir(projectRoot);
  const outPath = resolve(evidenceDir, "traceability.json");
  writeFileSync(outPath, JSON.stringify(matrix, null, 2), "utf8");

  return matrix;
}

/**
 * Formats terminal summary of traceability matrix.
 * @param {Record<string, object>} matrix
 * @param {string} [filterStory]
 * @returns {string}
 */
export function formatTraceabilityTerminal(matrix, filterStory) {
  const storyKeys = Object.keys(matrix).sort((a, b) => Number(a) - Number(b));
  if (storyKeys.length === 0) {
    return "[INFO] No stories found in specifications or state ledger.";
  }

  const selectedKeys = filterStory ? storyKeys.filter((k) => k === String(filterStory)) : storyKeys;

  if (selectedKeys.length === 0) {
    return `[INFO] Story ${filterStory} not found in traceability matrix.`;
  }

  const lines = [
    `\n================================================================`,
    `   REQUIREMENT TRACEABILITY MATRIX`,
    `================================================================`,
  ];

  for (const key of selectedKeys) {
    const item = matrix[key];
    const statusTag = `[${item.status}]`;
    lines.push(`\nStory ${item.storyNumber} ${statusTag}`);
    lines.push(`  - Specification:  ${item.hasSpec ? "[PASS] Defined in 02-spec.md" : "[FAIL] Missing"}`);
    lines.push(
      `  - Criteria Lock:  ${item.isApproved ? `[PASS] Locked (${item.criteriaHash?.slice(0, 10)}...)` : "[WARN] Not approved"}`,
    );
    lines.push(
      `  - Threat Model:   ${item.hasThreatModel ? `[PASS] ${item.threatModelPath}` : item.isDeprecated ? "[INFO] Waived (deprecated)" : "[FAIL] Missing"}`,
    );

    if (item.implementations.length > 0) {
      lines.push(`  - Code Artifacts: ${item.implementations.join(", ")}`);
    } else {
      lines.push(`  - Code Artifacts: [INFO] None detected`);
    }

    if (item.tests.length > 0) {
      lines.push(`  - Test Suites:    ${item.tests.join(", ")}`);
    } else {
      lines.push(`  - Test Suites:    [WARN] None detected`);
    }

    const trace = item.criteriaTraceability || item.semanticVerification;
    if (trace && trace.totalCriteria > 0) {
      lines.push(
        `  - Criteria Reference Coverage: ${trace.referenceCoveragePercent ?? trace.coveragePercent}% (${trace.referencedCriteria?.length ?? trace.testedCriteria?.length}/${trace.totalCriteria})`,
      );
      if (trace.boundCriteria) {
        lines.push(
          `  - Semantic Test Bindings:      ${trace.boundCoveragePercent}% (${trace.boundCriteria.length}/${trace.totalCriteria} criteria bound to test cases)`,
        );
      }
      if (trace.passedCriteria && trace.passedCriteria.length > 0) {
        lines.push(
          `  - Execution Proof Lifecycle:   ${trace.lifecycleCoveragePercent}% (${trace.passedCriteria.length}/${trace.totalCriteria} PASSED in live test run)`,
        );
      }
    }

    if (item.isDeprecated) {
      lines.push(
        `  - Deprecation:    Reason: "${item.deprecationReason}" (Superseded by: ${item.supersededBy || "none"})`,
      );
    }
  }

  lines.push(`\nEvidence file: .governance/evidence/traceability.json`);
  lines.push(`================================================================\n`);

  return lines.join("\n");
}
