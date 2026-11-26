/**
 * Governance Invariant & State Guardian
 * Maintains cryptographic hashes of acceptance criteria and enforces threat model gate transitions.
 * Prevents AI agents from silently weakening criteria or skipping security stages.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Returns path to .governance state directory in target project.
 * @param {string} projectRoot
 * @returns {string}
 */
export function getGovernanceStateDir(projectRoot = process.cwd()) {
  const stateDir = resolve(projectRoot, ".governance");
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  return stateDir;
}

/**
 * Loads current governance state file.
 * @param {string} projectRoot
 * @returns {{ version: string, storyHashes: Record<string, string>, lastVerifiedAt: string }}
 */
export function loadGovernanceState(projectRoot = process.cwd()) {
  const stateFile = resolve(getGovernanceStateDir(projectRoot), "state.json");
  if (existsSync(stateFile)) {
    try {
      return JSON.parse(readFileSync(stateFile, "utf8"));
    } catch {
      // fallback
    }
  }
  return {
    version: "1.0.0",
    storyHashes: {},
    lastVerifiedAt: new Date().toISOString(),
  };
}

/**
 * Saves governance state file.
 * @param {object} state
 * @param {string} projectRoot
 */
export function saveGovernanceState(state, projectRoot = process.cwd()) {
  const stateFile = resolve(getGovernanceStateDir(projectRoot), "state.json");
  state.lastVerifiedAt = new Date().toISOString();
  writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");
}

/**
 * Computes sha256 hash of text.
 * @param {string} text
 * @returns {string}
 */
export function hashText(text) {
  return createHash("sha256").update(text.trim()).digest("hex");
}

/**
 * Extracts all stories and their Acceptance Criteria blocks from 02-spec.md.
 * @param {string} projectRoot
 * @returns {Record<string, string>}
 */
export function extractCriteriaBlocks(projectRoot = process.cwd()) {
  const specPath = resolve(projectRoot, "docs/foundation/02-spec.md");
  if (!existsSync(specPath)) return {};

  const content = readFileSync(specPath, "utf8");
  const storyBlocks = content.split(/^###\s+Story\s+/im).slice(1);
  const result = {};

  for (const block of storyBlocks) {
    const numMatch = block.match(/^([0-9]+)[:\s]/);
    if (!numMatch) continue;
    const storyNum = numMatch[1];
    const criteriaMatch = block.match(/####\s+Acceptance\s+Criteria[\s\S]*?(?=(?:---|$))/i);
    if (criteriaMatch) {
      result[storyNum] = criteriaMatch[0].trim();
    }
  }

  return result;
}

/**
 * Locks current Acceptance Criteria into .governance/state.json.
 * @param {string} projectRoot
 */
export function lockCriteria(projectRoot = process.cwd()) {
  const blocks = extractCriteriaBlocks(projectRoot);
  const state = loadGovernanceState(projectRoot);

  for (const [storyNum, criteriaText] of Object.entries(blocks)) {
    if (!state.storyHashes[storyNum]) {
      state.storyHashes[storyNum] = hashText(criteriaText);
    }
  }

  saveGovernanceState(state, projectRoot);
}

/**
 * Verifies that no existing locked story criteria has been tampered with or weakened.
 * @param {string} projectRoot
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function verifyCriteriaIntegrity(projectRoot = process.cwd()) {
  const blocks = extractCriteriaBlocks(projectRoot);
  const state = loadGovernanceState(projectRoot);
  const violations = [];

  for (const [storyNum, expectedHash] of Object.entries(state.storyHashes)) {
    const currentBlock = blocks[storyNum];
    if (!currentBlock) {
      violations.push(`Story ${storyNum}: Acceptance Criteria was deleted from docs/foundation/02-spec.md!`);
      continue;
    }
    const currentHash = hashText(currentBlock);
    if (currentHash !== expectedHash) {
      violations.push(
        `Story ${storyNum}: Acceptance Criteria was modified or weakened! Original criteria is locked by Governance.`,
      );
    }
  }

  // Register any newly added stories
  for (const [storyNum, text] of Object.entries(blocks)) {
    if (!state.storyHashes[storyNum]) {
      state.storyHashes[storyNum] = hashText(text);
      saveGovernanceState(state, projectRoot);
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}

/**
 * Verifies that active stories in progress have an associated threat model.
 * @param {string} projectRoot
 * @returns {{ ok: boolean, warnings: string[] }}
 */
export function verifyThreatModelCoverage(projectRoot = process.cwd()) {
  const progressPath = resolve(projectRoot, "docs/lifecycle/progress.md");
  const threatDir = resolve(projectRoot, "docs/lifecycle/threat-model");
  const warnings = [];

  if (!existsSync(progressPath)) return { ok: true, warnings: [] };

  const progressContent = readFileSync(progressPath, "utf8");
  const storyMatches = progressContent.matchAll(/- \[[ xX]\]\s+Story\s+([0-9]+)/gi);

  for (const match of storyMatches) {
    const storyNum = match[1];
    const threatFile = resolve(threatDir, `story-${storyNum}.md`);
    if (!existsSync(threatFile)) {
      warnings.push(`Story ${storyNum} is active in progress.md but missing a Threat Model at docs/lifecycle/threat-model/story-${storyNum}.md`);
    }
  }

  return {
    ok: warnings.length === 0,
    warnings,
  };
}
