/**
 * Governance Invariant & State Guardian
 * Maintains cryptographic hashes of acceptance criteria and enforces threat model gate transitions.
 * Prevents AI agents from silently weakening criteria or skipping security stages.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { execSync } from "node:child_process";
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
 * @returns {{ version: string, specVersion: string, storyHashes: Record<string, string>, deprecatedStories: Record<string, object>, lastVerifiedAt: string, lastApprovedAt?: string, lastApprovedBy?: string, auditLog: Array<object> }}
 */
export function loadGovernanceState(projectRoot = process.cwd()) {
  const stateFile = resolve(getGovernanceStateDir(projectRoot), "state.json");
  if (existsSync(stateFile)) {
    try {
      const data = JSON.parse(readFileSync(stateFile, "utf8"));
      return {
        version: "1.0.0",
        specVersion: data.specVersion || "1.0.0",
        storyHashes: data.storyHashes || {},
        deprecatedStories: data.deprecatedStories || {},
        auditLog: Array.isArray(data.auditLog) ? data.auditLog : [],
        lastVerifiedAt: data.lastVerifiedAt || new Date().toISOString(),
        lastApprovedAt: data.lastApprovedAt,
        lastApprovedBy: data.lastApprovedBy,
        headAnchor: data.headAnchor,
      };
    } catch {
      // fallback
    }
  }
  return {
    version: "1.0.0",
    specVersion: "1.0.0",
    storyHashes: {},
    deprecatedStories: {},
    auditLog: [],
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

const GENESIS_PREVIOUS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Retrieves Git committer metadata, commit SHA, and tree hash for cryptographic audit attestation.
 * @param {string} projectRoot
 * @returns {{ isGit: boolean, userName: string, userEmail: string, commitSha: string, treeHash: string }}
 */
export function getGitAttestation(projectRoot = process.cwd()) {
  try {
    const isGit =
      execSync("git rev-parse --is-inside-work-tree", {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }).trim() === "true";

    if (!isGit) {
      return {
        isGit: false,
        userName: "Non-Git User",
        userEmail: "non-git@local",
        commitSha: "0000000000000000000000000000000000000000",
        treeHash: "0000000000000000000000000000000000000000",
      };
    }

    let userName = "";
    try {
      userName = execSync("git config user.name", {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }).trim();
    } catch {
      // Non-fatal if unset
    }

    let userEmail = "";
    try {
      userEmail = execSync("git config user.email", {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }).trim();
    } catch {
      // Non-fatal if unset
    }

    let commitSha = "";
    try {
      commitSha = execSync("git rev-parse HEAD", {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }).trim();
    } catch {
      commitSha = "0000000000000000000000000000000000000000";
    }

    let treeHash = "";
    try {
      treeHash = execSync("git rev-parse HEAD^{tree}", {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }).trim();
    } catch {
      treeHash = "0000000000000000000000000000000000000000";
    }

    return {
      isGit: true,
      userName: userName || "Unknown Committer",
      userEmail: userEmail || "unknown@local",
      commitSha,
      treeHash,
    };
  } catch {
    return {
      isGit: false,
      userName: "Non-Git User",
      userEmail: "non-git@local",
      commitSha: "0000000000000000000000000000000000000000",
      treeHash: "0000000000000000000000000000000000000000",
    };
  }
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
 * Calculates cryptographic hash for an audit log block.
 * Includes attestation metadata if present.
 * @param {object} block
 * @returns {string}
 */
export function calculateBlockHash(block) {
  const attestationPart = block.attestation ? `:${JSON.stringify(block.attestation)}` : "";
  return hashText(
    `${block.index}:${block.timestamp}:${block.action}:${block.author}:${block.previousHash}:${JSON.stringify(block.details)}${attestationPart}`,
  );
}

/**
 * Verifies cryptographic integrity of the entire audit hash chain.
 * Validates backward continuity and checks external git tree anchor if present.
 * @param {object} state
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function verifyAuditChain(state) {
  if (!state.auditLog || state.auditLog.length === 0) {
    return { ok: true, violations: [] };
  }

  const violations = [];
  let expectedPrevious = GENESIS_PREVIOUS_HASH;

  for (let i = 0; i < state.auditLog.length; i++) {
    const block = state.auditLog[i];

    if (block.index !== i) {
      violations.push(`Audit log block index mismatch at position ${i} (expected ${i}, got ${block.index})`);
      break;
    }

    if (block.previousHash !== expectedPrevious) {
      violations.push(
        `Audit log hash chain broken at block ${i}! Expected previousHash "${expectedPrevious.slice(0, 12)}...", found "${(block.previousHash || "").slice(0, 12)}..."`,
      );
      break;
    }

    const expectedHash = calculateBlockHash(block);
    if (block.hash !== expectedHash) {
      violations.push(
        `Audit log block ${i} was tampered with! Expected hash "${expectedHash.slice(0, 12)}...", found "${(block.hash || "").slice(0, 12)}..."`,
      );
      break;
    }

    expectedPrevious = block.hash;
  }

  // Cross-verify state.headAnchor against the latest block attestation
  if (state.headAnchor && state.auditLog.length > 0) {
    const lastBlock = state.auditLog[state.auditLog.length - 1];
    const commitSha = lastBlock.attestation?.commitSha || "0000000000000000000000000000000000000000";
    const treeHash = lastBlock.attestation?.treeHash || "0000000000000000000000000000000000000000";
    const expectedAnchor = hashText(`${lastBlock.hash}:${commitSha}:${treeHash}`);
    if (state.headAnchor !== expectedAnchor) {
      violations.push(
        `Audit log head anchor mismatch! Tampering detected between state.json and external git tree anchor.`,
      );
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
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

    const tableMatch = block.match(/\|\s*ID\s*\|\s*Given[\s\S]*?(?=(?:---|$))/i);
    const headerMatch = block.match(/####\s+Acceptance\s+Criteria[\s\S]*?(?=(?:---|$))/i);

    if (tableMatch) {
      result[storyNum] = tableMatch[0].trim();
    } else if (headerMatch) {
      result[storyNum] = headerMatch[0].trim();
    }
  }

  return result;
}

/**
 * Formally approves and cryptographically locks Acceptance Criteria into .governance/state.json.
 * Must be invoked explicitly via human approval (governance approve:spec).
 * Appends a tamper-evident block to the audit hash chain.
 * @param {string} [approver]
 * @param {{ prune?: boolean }} [options]
 * @param {string} [projectRoot]
 * @returns {boolean}
 */
export function approveSpec(approver = "Engineer", options = {}, projectRoot = process.cwd()) {
  const blocks = extractCriteriaBlocks(projectRoot);
  const state = loadGovernanceState(projectRoot);
  const storyCount = Object.keys(blocks).length;

  if (storyCount === 0) {
    console.log("[WARN] No stories or acceptance criteria found in docs/foundation/02-spec.md");
    return false;
  }

  const updatedStories = [];
  const addedStories = [];
  const prunedStories = [];

  // 1. Process active stories (excluding formally deprecated stories)
  for (const [storyNum, criteriaText] of Object.entries(blocks)) {
    if (state.deprecatedStories && state.deprecatedStories[storyNum]) {
      // Story has been deprecated; do not re-activate without explicit un-deprecation
      continue;
    }
    const newHash = hashText(criteriaText);
    if (!state.storyHashes[storyNum]) {
      addedStories.push(storyNum);
    } else if (state.storyHashes[storyNum] !== newHash) {
      updatedStories.push(storyNum);
    }
    state.storyHashes[storyNum] = newHash;
  }

  // 2. Prune removed stories if explicitly requested
  if (options.prune) {
    for (const storyNum of Object.keys(state.storyHashes)) {
      if (!blocks[storyNum]) {
        delete state.storyHashes[storyNum];
        prunedStories.push(storyNum);
      }
    }
  }

  if (!state.auditLog) {
    state.auditLog = [];
  }

  const previousHash =
    state.auditLog.length > 0 ? state.auditLog[state.auditLog.length - 1].hash : GENESIS_PREVIOUS_HASH;

  const gitMeta = getGitAttestation(projectRoot);
  let resolvedAuthor = approver;
  if ((!approver || approver === "Engineer") && gitMeta.isGit && gitMeta.userEmail !== "unknown@local") {
    resolvedAuthor = `${gitMeta.userName} <${gitMeta.userEmail}>`;
  }

  // Check optional authorized-approvers list if configured
  const authFile = resolve(getGovernanceStateDir(projectRoot), "authorized-approvers.json");
  if (existsSync(authFile)) {
    try {
      const authData = JSON.parse(readFileSync(authFile, "utf8"));
      const allowed = Array.isArray(authData) ? authData : authData.approvers || [];
      if (allowed.length > 0) {
        const matches = allowed.some(
          (a) =>
            a.toLowerCase() === resolvedAuthor.toLowerCase() ||
            (gitMeta.userEmail && a.toLowerCase() === gitMeta.userEmail.toLowerCase()) ||
            (gitMeta.userName && a.toLowerCase() === gitMeta.userName.toLowerCase()),
        );
        if (!matches) {
          console.error(
            `[FAIL] Unauthorized approver "${resolvedAuthor}". Signer not listed in authorized-approvers.json.`,
          );
          return false;
        }
      }
    } catch {
      // Fallback on parse failure
    }
  }

  const attestation = {
    isGit: gitMeta.isGit,
    userName: gitMeta.userName,
    userEmail: gitMeta.userEmail,
    commitSha: gitMeta.commitSha,
    treeHash: gitMeta.treeHash,
  };

  const auditBlock = {
    index: state.auditLog.length,
    timestamp: new Date().toISOString(),
    action: "APPROVE_SPEC",
    author: resolvedAuthor,
    previousHash,
    attestation,
    details: {
      addedStories,
      updatedStories,
      prunedStories,
      totalActiveStories: Object.keys(state.storyHashes).length,
      specHash: hashText(JSON.stringify(state.storyHashes)),
    },
  };
  auditBlock.hash = calculateBlockHash(auditBlock);

  state.auditLog.push(auditBlock);
  state.lastApprovedAt = auditBlock.timestamp;
  state.lastApprovedBy = resolvedAuthor;
  state.headAnchor = hashText(`${auditBlock.hash}:${attestation.commitSha}:${attestation.treeHash}`);

  saveGovernanceState(state, projectRoot);

  console.log(`[PASS] Specification locked and approved by "${resolvedAuthor}"`);
  if (gitMeta.isGit && gitMeta.commitSha !== "0000000000000000000000000000000000000000") {
    console.log(`       Git Anchor Commit: ${gitMeta.commitSha.slice(0, 10)} (Tree: ${gitMeta.treeHash.slice(0, 10)})`);
  }
  console.log(`       Stories added: ${addedStories.length ? addedStories.join(", ") : "none"}`);
  console.log(`       Stories updated: ${updatedStories.length ? updatedStories.join(", ") : "none"}`);
  if (prunedStories.length > 0) {
    console.log(`       Stories pruned: ${prunedStories.join(", ")}`);
  }
  console.log(`       Audit block ${auditBlock.index} hash: ${auditBlock.hash.slice(0, 16)}...`);
  return true;
}

export const lockCriteria = approveSpec;

/**
 * Formally marks a story as deprecated in .governance/state.json with justification.
 * Appends a tamper-evident DEPRECATE_STORY block to the audit hash chain.
 * Synchronizes docs/foundation/02-spec.md to mark story header as [DEPRECATED].
 *
 * @param {number|string} storyNumber
 * @param {string} [reason]
 * @param {string} [author]
 * @param {string} [projectRoot]
 * @param {{ supersededBy?: string|null }} [options]
 * @returns {boolean}
 */
export function deprecateStory(
  storyNumber,
  reason = "Deprecated by engineer",
  author = "Engineer",
  projectRoot = process.cwd(),
  options = {},
) {
  const state = loadGovernanceState(projectRoot);
  if (!state.deprecatedStories) {
    state.deprecatedStories = {};
  }
  const storyKey = String(storyNumber);
  const wasActive = Boolean(state.storyHashes[storyKey]);

  delete state.storyHashes[storyKey];
  state.deprecatedStories[storyKey] = {
    reason,
    deprecatedAt: new Date().toISOString(),
    author,
    supersededBy: options.supersededBy || null,
  };

  // Synchronize docs/foundation/02-spec.md to mark story header as DEPRECATED if file exists
  const specPath = resolve(projectRoot, "docs/foundation/02-spec.md");
  if (existsSync(specPath)) {
    try {
      let specContent = readFileSync(specPath, "utf8");
      const tag = options.supersededBy
        ? `[DEPRECATED: SUPERSEDED BY STORY ${options.supersededBy}]`
        : `[DEPRECATED]`;
      const storyHeaderRegex = new RegExp(`(###\\s+Story\\s+${storyKey}\\b[^\n]*?)(?!\\s*\\[DEPRECATED)`, "i");
      if (storyHeaderRegex.test(specContent) && !specContent.includes(`Story ${storyKey} [DEPRECATED`)) {
        specContent = specContent.replace(storyHeaderRegex, `$1 ${tag}`);
        writeFileSync(specPath, specContent, "utf8");
      }
    } catch {
      // Do not block deprecation on non-fatal spec write errors
    }
  }

  const previousHash =
    state.auditLog && state.auditLog.length > 0
      ? state.auditLog[state.auditLog.length - 1].hash
      : GENESIS_PREVIOUS_HASH;

  if (!state.auditLog) state.auditLog = [];

  const gitMeta = getGitAttestation(projectRoot);
  let resolvedAuthor = author;
  if ((!author || author === "Engineer") && gitMeta.isGit && gitMeta.userEmail !== "unknown@local") {
    resolvedAuthor = `${gitMeta.userName} <${gitMeta.userEmail}>`;
  }

  const attestation = {
    isGit: gitMeta.isGit,
    userName: gitMeta.userName,
    userEmail: gitMeta.userEmail,
    commitSha: gitMeta.commitSha,
    treeHash: gitMeta.treeHash,
  };

  const auditBlock = {
    index: state.auditLog.length,
    timestamp: new Date().toISOString(),
    action: "DEPRECATE_STORY",
    author: resolvedAuthor,
    previousHash,
    attestation,
    details: {
      storyNumber: storyKey,
      reason,
      supersededBy: options.supersededBy || null,
      wasActive,
    },
  };
  auditBlock.hash = calculateBlockHash(auditBlock);

  state.auditLog.push(auditBlock);
  state.headAnchor = hashText(`${auditBlock.hash}:${attestation.commitSha}:${attestation.treeHash}`);
  saveGovernanceState(state, projectRoot);

  console.log(`[PASS] Story ${storyKey} formally deprecated by "${resolvedAuthor}"`);
  console.log(`       Reason: ${reason}`);
  if (options.supersededBy) {
    console.log(`       Superseded by: Story ${options.supersededBy}`);
  }
  console.log(`       Audit block ${auditBlock.index} hash: ${auditBlock.hash.slice(0, 16)}...`);
  return true;
}

/**
 * Verifies that no existing locked story criteria has been tampered with or weakened.
 * Validates the full audit hash chain from genesis to head before checking story hashes.
 * Strictly read-only: NEVER approves or registers newly added stories automatically.
 * Correctly respects deprecated and superseded stories without false violations.
 *
 * @param {string} projectRoot
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function verifyCriteriaIntegrity(projectRoot = process.cwd()) {
  const blocks = extractCriteriaBlocks(projectRoot);
  const state = loadGovernanceState(projectRoot);
  const violations = [];

  // 1. Verify the cryptographic audit log hash chain
  const chainCheck = verifyAuditChain(state);
  if (!chainCheck.ok) {
    return {
      ok: false,
      violations: chainCheck.violations,
    };
  }

  // 2. Verify locked stories against current specification
  for (const [storyNum, expectedHash] of Object.entries(state.storyHashes)) {
    // If formally deprecated, skip verification of criteria
    if (state.deprecatedStories && state.deprecatedStories[storyNum]) {
      continue;
    }

    const currentBlock = blocks[storyNum];
    if (!currentBlock) {
      violations.push(
        `Story ${storyNum}: Acceptance Criteria was deleted from docs/foundation/02-spec.md without formal deprecation! Run "governance deprecate:story ${storyNum}" to approve removal.`,
      );
      continue;
    }
    const currentHash = hashText(currentBlock);
    if (currentHash !== expectedHash) {
      violations.push(
        `Story ${storyNum}: Acceptance Criteria was modified or weakened! Original criteria is locked in .governance/state.json.`,
      );
    }
  }

  // 3. Reject unapproved stories: Any story in spec not yet in state.json is a violation
  for (const [storyNum] of Object.entries(blocks)) {
    // If the story has been formally deprecated, it is exempted from unapproved active story checks
    if (state.deprecatedStories && state.deprecatedStories[storyNum]) {
      continue;
    }

    if (!state.storyHashes[storyNum]) {
      violations.push(
        `Story ${storyNum}: Acceptance Criteria exists in 02-spec.md but has NOT been approved in .governance/state.json. Run "governance approve:spec" to approve.`,
      );
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}

/**
 * Verifies that active stories in progress have an associated threat model.
 * Enforces a strict blocking gate unless an explicit documented waiver exists
 * or the story has been formally deprecated.
 *
 * @param {string} projectRoot
 * @returns {{ ok: boolean, violations: string[], waived: string[] }}
 */
export function verifyThreatModelCoverage(projectRoot = process.cwd()) {
  const progressPath = resolve(projectRoot, "docs/lifecycle/progress.md");
  const threatDir = resolve(projectRoot, "docs/lifecycle/threat-model");
  const violations = [];
  const waived = [];

  if (!existsSync(progressPath)) return { ok: true, violations: [], waived: [] };

  // Load documented waivers if present
  const state = loadGovernanceState(projectRoot);
  const waiversFile = resolve(getGovernanceStateDir(projectRoot), "waivers.json");
  let externalWaivers = {};
  if (existsSync(waiversFile)) {
    try {
      externalWaivers = JSON.parse(readFileSync(waiversFile, "utf8"));
    } catch {
      // Fallback on parse failure
    }
  }

  const activeWaivers = {
    ...(state.threatModelWaivers || {}),
    ...(externalWaivers.threatModelWaivers || {}),
  };

  const progressContent = readFileSync(progressPath, "utf8");
  const storyMatches = progressContent.matchAll(/- \[[ xX]\]\s+Story\s+([0-9]+)/gi);

  for (const match of storyMatches) {
    const storyNum = match[1];
    const threatFile = resolve(threatDir, `story-${storyNum}.md`);

    // If deprecated, skip threat model check with note
    if (state.deprecatedStories && state.deprecatedStories[storyNum]) {
      waived.push(`Story ${storyNum} (Deprecated: ${state.deprecatedStories[storyNum].reason})`);
      continue;
    }

    if (activeWaivers[storyNum]) {
      waived.push(`Story ${storyNum} (Reason: ${activeWaivers[storyNum]})`);
      continue;
    }

    if (!existsSync(threatFile)) {
      violations.push(
        `Story ${storyNum} is active in progress.md but missing a STRIDE Threat Model at docs/lifecycle/threat-model/story-${storyNum}.md`,
      );
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    waived,
  };
}
