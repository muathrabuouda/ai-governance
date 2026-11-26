/**
 * Requirement-to-Code & Test Traceability Engine
 * Maps user stories and acceptance criteria from 02-spec.md to implementation files,
 * unit/integration tests, and STRIDE threat models.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { extractCriteriaBlocks, loadGovernanceState } from "./state-guardian.mjs";
import { getEvidenceDir } from "./verdict-engine.mjs";

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
 * Builds a complete traceability matrix for all stories in target project.
 * @param {string} [projectRoot]
 * @returns {Record<string, object>}
 */
export function buildTraceabilityMatrix(projectRoot = process.cwd()) {
  const blocks = extractCriteriaBlocks(projectRoot);
  const state = loadGovernanceState(projectRoot);
  const threatDir = resolve(projectRoot, "docs/lifecycle/threat-model");

  const codeFiles = scanFiles(projectRoot);
  const matrix = {};

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
    if (isDeprecated) {
      status = "DEPRECATED";
    } else if (!hasSpec) {
      status = "ORPHANED_HASH";
    } else if (isApproved) {
      if (tests.length > 0 && implementations.length > 0) {
        status = "VERIFIED";
      } else if (implementations.length > 0) {
        status = "IMPLEMENTED";
      } else {
        status = "APPROVED";
      }
    }

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
    lines.push(`  - Criteria Lock:  ${item.isApproved ? `[PASS] Locked (${item.criteriaHash?.slice(0, 10)}...)` : "[WARN] Not approved"}`);
    lines.push(`  - Threat Model:   ${item.hasThreatModel ? `[PASS] ${item.threatModelPath}` : item.isDeprecated ? "[INFO] Waived (deprecated)" : "[FAIL] Missing"}`);

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

    if (item.isDeprecated) {
      lines.push(`  - Deprecation:    Reason: "${item.deprecationReason}" (Superseded by: ${item.supersededBy || "none"})`);
    }
  }

  lines.push(`\nEvidence file: .governance/evidence/traceability.json`);
  lines.push(`================================================================\n`);

  return lines.join("\n");
}
