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
  const root = projectRoot || process.cwd();
  const stateDir = resolve(root, ".governance");
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
      // Use git log format="%T" to extract tree hash cross-platform without shell escaping issues
      treeHash = execSync('git log -1 --format="%T"', {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }).trim();
    } catch {
      treeHash = "0000000000000000000000000000000000000000";
    }

    let signatureStatus = "N";
    let signerName = "";
    let signerKeyId = "";
    let signerFingerprint = "";
    let primaryFingerprint = "";
    try {
      const sigData = execSync('git log -1 --format="%G?|%GS|%GK|%GF|%GP"', {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }).trim();
      const parts = sigData.split("|");
      signatureStatus = parts[0] || "N";
      signerName = parts[1] || "";
      signerKeyId = parts[2] || "";
      signerFingerprint = parts[3] || "";
      primaryFingerprint = parts[4] || "";
    } catch {
      // Non-fatal if git signature check fails
    }

    const signerKey = signerFingerprint || primaryFingerprint || signerKeyId || "";

    let gitNote = "";
    try {
      gitNote = execSync("git notes --ref=governance show HEAD", {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }).trim();
    } catch {
      // Non-fatal if no governance note exists
    }

    return {
      isGit: true,
      userName: userName || "Unknown Committer",
      userEmail: userEmail || "unknown@local",
      commitSha,
      treeHash: treeHash || "0000000000000000000000000000000000000000",
      signatureStatus,
      signerName,
      signerKey,
      signerKeyId,
      signerFingerprint,
      primaryFingerprint,
      gitNote,
    };
  } catch {
    return {
      isGit: false,
      userName: "Non-Git User",
      userEmail: "non-git@local",
      commitSha: "0000000000000000000000000000000000000000",
      treeHash: "0000000000000000000000000000000000000000",
      signatureStatus: "N",
      signerName: "",
      signerKey: "",
      signerKeyId: "",
      signerFingerprint: "",
      primaryFingerprint: "",
      gitNote: "",
    };
  }
}

/**
 * Normalizes a cryptographic key fingerprint or key ID for strict comparison.
 * Strips whitespace, colons, and leading 0x prefixes.
 *
 * @param {string} key
 * @returns {string} Normalized lowercase key string
 */
export function normalizeKey(key) {
  if (typeof key !== "string") return "";
  return key.replace(/[\s:]+/g, "").replace(/^0x/i, "").toLowerCase();
}

/**
 * Checks whether a commit's signer key matches an allowed list of fingerprints or key IDs.
 * Correctly matches full fingerprints (40 or 64 hex chars), primary key fingerprints,
 * and 64-bit long key IDs (16 hex chars).
 * Short 32-bit key IDs (8 hex chars) are strictly rejected to prevent Evil32 collision attacks.
 *
 * @param {object} gitMeta
 * @param {string[]} allowedKeys
 * @returns {boolean}
 */
export function isKeyFingerprintAuthorized(gitMeta, allowedKeys = []) {
  if (!allowedKeys || !Array.isArray(allowedKeys) || allowedKeys.length === 0) {
    return false;
  }

  const candidateKeys = [
    normalizeKey(gitMeta.signerFingerprint),
    normalizeKey(gitMeta.primaryFingerprint),
    normalizeKey(gitMeta.signerKeyId),
    normalizeKey(gitMeta.signerKey),
  ].filter(Boolean);

  if (candidateKeys.length === 0) return false;

  for (const rawAllowed of allowedKeys) {
    const allowed = normalizeKey(rawAllowed);
    if (!allowed) continue;

    // Reject short keys (< 16 hex chars) in allowed list to prevent Evil32 32-bit ID collisions
    if (allowed.length < 16) {
      continue;
    }

    for (const candidate of candidateKeys) {
      // Reject candidate keys shorter than 16 hex characters (prevents Evil32 collisions)
      if (candidate.length < 16) {
        continue;
      }

      if (candidate === allowed) {
        return true;
      }
      // If allowed is full fingerprint (40+ hex) and candidate is long key ID (16+ hex), match suffix
      if (allowed.length >= 16 && candidate.length >= 16) {
        if (allowed.endsWith(candidate) || candidate.endsWith(allowed)) {
          return true;
        }
      }
    }
  }

  return false;
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
 * Resolves whether strict key enforcement and strict governance invariants are active.
 * Ensures consistent strictness resolution across both verification gates (check)
 * and state locking operations (approve:spec).
 *
 * @param {string} [projectRoot]
 * @param {object} [options]
 * @returns {boolean}
 */
export function resolveStrictEnforcement(projectRoot = process.cwd(), options = {}) {
  if (typeof options.strict === "boolean") {
    return options.strict;
  }

  const govDir = getGovernanceStateDir(projectRoot);

  // 1. Check policy.json profile or explicit strictKeyEnforcement flag
  const policyFile = resolve(govDir, "policy.json");
  if (existsSync(policyFile)) {
    try {
      const pol = JSON.parse(readFileSync(policyFile, "utf8"));
      if (pol.profile === "strict" || pol.strictKeyEnforcement) {
        return true;
      }
    } catch {
      // Non-fatal parse fallback
    }
  }

  // 2. Check authorized-approvers.json configuration
  const authFile = resolve(govDir, "authorized-approvers.json");
  if (existsSync(authFile)) {
    try {
      const auth = JSON.parse(readFileSync(authFile, "utf8"));
      if (auth.strictKeyEnforcement) {
        return true;
      }
    } catch {
      // Non-fatal parse fallback
    }
  }

  return false;
}

/**
 * Verifies cryptographic integrity of the entire audit hash chain.
 * Validates backward continuity, immutable Git Tag anchors, and optional signature enforcement.
 *
 * @param {object} state - Governance state object
 * @param {string} [projectRoot] - Target project root
 * @param {{ strict?: boolean, requireTagAnchor?: boolean }} [options] - Verification options
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function verifyAuditChain(state, projectRoot = process.cwd(), options = {}) {
  if (!state.auditLog || state.auditLog.length === 0) {
    return { ok: true, violations: [] };
  }

  const violations = [];
  const isStrict = resolveStrictEnforcement(projectRoot, options);

  // In strict mode, prevent uncommitted working tree forgery on governance state or specification
  if (isStrict && projectRoot) {
    const gitMeta = getGitAttestation(projectRoot);
    if (gitMeta.isGit) {
      try {
        const dirtyDiff = execSync("git diff HEAD -- .governance/state.json docs/foundation/02-spec.md", {
          cwd: projectRoot,
          stdio: ["ignore", "pipe", "ignore"],
          encoding: "utf8",
        }).trim();

        if (dirtyDiff.length > 0) {
          violations.push(
            `Security Violation: Uncommitted working tree modifications detected in .governance/state.json or docs/foundation/02-spec.md. In strict mode, state and criteria must match committed HEAD to prevent uncommitted working-tree forgery.`,
          );
        }
      } catch {
        // Non-fatal if diff check fails
      }
    }
  }

  // In strict mode, verify that authorized approvers configuration exists and has at least one registered key
  let strictAllowedKeys = [];
  if (isStrict && projectRoot) {
    const authFile = resolve(getGovernanceStateDir(projectRoot), "authorized-approvers.json");
    if (!existsSync(authFile)) {
      violations.push(
        `Security Violation: In strict mode, authorized-approvers.json must exist with registered "allowedKeyFingerprints".`,
      );
    } else {
      try {
        const authData = JSON.parse(readFileSync(authFile, "utf8"));
        strictAllowedKeys = Array.isArray(authData)
          ? authData
          : authData?.allowedKeyFingerprints || [];

        if (strictAllowedKeys.length === 0) {
          violations.push(
            `Security Violation: In strict mode, "allowedKeyFingerprints" in authorized-approvers.json cannot be empty. An authorized approver key fingerprint must be registered to verify state modifications.`,
          );
        }
      } catch {
        violations.push(
          `Security Violation: Failed to parse authorized-approvers.json during strict key verification.`,
        );
      }
    }
  }

  // Resolve migration baseline anchor:
  // Allows transitioning from historical unauthenticated development blocks to strict cryptographically signed production blocks.
  let baselineIndex = -1;
  for (let i = 0; i < state.auditLog.length; i++) {
    if (state.auditLog[i].action === "RE_BASELINE" || state.auditLog[i].action === "MIGRATION_BASELINE") {
      baselineIndex = i;
    }
  }
  if (state.baseline && typeof state.baseline.blockIndex === "number") {
    baselineIndex = Math.max(baselineIndex, state.baseline.blockIndex);
  }

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

    // In strict mode, enforce verified cryptographic signatures
    // If a migration baseline exists, legacy blocks strictly prior to baseline are verified
    // for hash integrity and chain continuity, while GPG signature is required from baseline onwards.
    const requiresSignature = baselineIndex === -1 ? true : i >= baselineIndex;
    if (isStrict && requiresSignature && (block.action === "APPROVE_SPEC" || block.action === "RE_BASELINE")) {
      const sigStatus = block.attestation?.signatureStatus || "N";
      if (sigStatus !== "G") {
        violations.push(
          `Audit log block ${i} (${block.action}) lacks a verified cryptographic signature (status: "${sigStatus}"). Strict policy requires verified GPG/SSH signatures.`,
        );
      }
    }

    expectedPrevious = block.hash;
  }

  // Cross-verify state.headAnchor against the latest block attestation
  if (state.auditLog.length > 0) {
    if (!state.headAnchor) {
      if (isStrict) {
        violations.push(
          `Missing "headAnchor" in governance state! Strict policy requires a cryptographically computed headAnchor when an audit log exists.`,
        );
      }
    } else {
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
  }

  // Cross-verify immutable Git Tag Anchor and Commit Signature unconditionally if in a Git repository
  if (projectRoot && state.auditLog.length > 0) {
    const lastBlock = state.auditLog[state.auditLog.length - 1];
    const gitMeta = getGitAttestation(projectRoot);
    if (gitMeta.isGit) {
      const expectedTag = lastBlock.attestation?.tagAnchor?.tag || `governance/spec-v${lastBlock.index}`;
      let tagSha = "";
      try {
        tagSha = execSync(`git rev-parse -q --verify "refs/tags/${expectedTag}"`, {
          cwd: projectRoot,
          stdio: ["ignore", "pipe", "ignore"],
          encoding: "utf8",
        }).trim();
      } catch {
        // Tag not found
      }

      if (!tagSha) {
        if (isStrict || options.requireTagAnchor) {
          violations.push(
            `Immutable Git Tag anchor "refs/tags/${expectedTag}" is missing from git object database! Strict policy mandates verified tag anchors.`,
          );
        }
      }

      // In strict mode, verify that the commit modifying .governance/state.json is cryptographically signed by an authorized key
      if (isStrict) {
        try {
          const stateCommitData = execSync('git log -1 --format="%H|%G?|%GS|%GK|%GF|%GP" -- .governance/state.json', {
            cwd: projectRoot,
            stdio: ["ignore", "pipe", "ignore"],
            encoding: "utf8",
          }).trim();

          if (stateCommitData) {
            const parts = stateCommitData.split("|");
            const stateCommitSha = parts[0] || "";
            const stateSigStatus = parts[1] || "N";
            const stateMeta = {
              signatureStatus: stateSigStatus,
              signerName: parts[2] || "",
              signerKeyId: parts[3] || "",
              signerFingerprint: parts[4] || "",
              primaryFingerprint: parts[5] || "",
              signerKey: parts[4] || parts[5] || parts[3] || "",
            };

            const baselineCommit = state.baseline?.commitSha;
            const isHistoricalUnsigned = baselineCommit && stateCommitSha === baselineCommit && state.baseline?.blockIndex !== undefined;

            if (stateSigStatus !== "G" && !isHistoricalUnsigned) {
              violations.push(
                `The commit modifying .governance/state.json lacks a verified cryptographic signature (status: "${stateSigStatus}"). Strict policy requires verified GPG/SSH commit signatures on state changes.`,
              );
            } else if (stateSigStatus === "G" && strictAllowedKeys.length > 0 && !isKeyFingerprintAuthorized(stateMeta, strictAllowedKeys)) {
              violations.push(
                `The commit modifying .governance/state.json was signed by an unauthorized key (${stateMeta.signerFingerprint || stateMeta.signerKey || "unknown"}). Key fingerprint is not listed in allowedKeyFingerprints in authorized-approvers.json.`,
              );
            }
          }
        } catch {
          // Fallback
        }
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}

/**
 * Extracts all stories and their Acceptance Criteria blocks from docs/foundation/02-spec.md.
 * Accurately parses full Markdown tables (including header, separator, and all data rows)
 * without prematurely stopping on Markdown separator dashes (:---).
 *
 * @param {string} projectRoot - Root directory of the repository
 * @returns {Record<string, string>} Mapping of story number to full criteria block text
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

    // 1. Locate the criteria table starting with the table header row "| ID |"
    const tableHeaderIdx = block.search(/^\|[ \t]*ID[ \t]*\|/im);
    if (tableHeaderIdx !== -1) {
      const remaining = block.slice(tableHeaderIdx);
      const lines = remaining.split(/\r?\n/);
      const tableLines = [];

      for (const line of lines) {
        const trimmed = line.trim();
        // Continue collecting as long as lines are Markdown table rows
        if (trimmed.startsWith("|")) {
          tableLines.push(trimmed);
        } else if (tableLines.length > 0) {
          // Break when encountering a blank line, divider, or non-table content
          break;
        }
      }

      // Ensure we captured at least the header and separator rows, plus any data rows
      if (tableLines.length >= 2) {
        result[storyNum] = tableLines.join("\n").trim();
        continue;
      }
    }

    // 2. Fallback: Capture standard "#### Acceptance Criteria" text block until next heading or horizontal rule
    const headerMatch = block.match(
      /####\s+Acceptance\s+Criteria[\s\S]*?(?=(?:\r?\n\s*#{2,4}\s+|\r?\n\s*---+\s*$|$))/i,
    );
    if (headerMatch) {
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

  // Sanitize approver name to reject shell metacharacters and control characters (allows standard Name <email> format)
  if (typeof approver === "string" && /[;&|`$\n\r]/.test(approver)) {
    console.error("[FAIL] Security Violation: Approver identifier contains illegal shell or control characters.");
    return false;
  }

  // 3. Cryptographic Signature & Authorized Approvers Enforcement
  const authFile = resolve(getGovernanceStateDir(projectRoot), "authorized-approvers.json");
  let authData = null;
  if (existsSync(authFile)) {
    try {
      authData = JSON.parse(readFileSync(authFile, "utf8"));
    } catch {
      // Non-fatal parse fallback
    }
  }

  // Verify GitHub actor authorization if provided
  if (options.actor && authData?.allowedGitHubActors && authData.allowedGitHubActors.length > 0) {
    const isActorAllowed = authData.allowedGitHubActors.some(
      (a) => a.toLowerCase() === String(options.actor).toLowerCase(),
    );
    if (!isActorAllowed) {
      console.error(
        `[FAIL] Security Violation: GitHub actor "${options.actor}" is not authorized. Not found in allowedGitHubActors in authorized-approvers.json.`,
      );
      return false;
    }
  }

  // Resolve strict key enforcement using unified policy & approvers resolution
  const strictKeyEnforcement = resolveStrictEnforcement(projectRoot, options);

  // Prevent signature borrowing: in strict mode, verify that docs/foundation/02-spec.md has no uncommitted changes
  if (strictKeyEnforcement && gitMeta.isGit) {
    try {
      const specDiff = execSync("git diff HEAD -- docs/foundation/02-spec.md", {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }).trim();

      if (specDiff.length > 0) {
        console.error(
          "[FAIL] Security Violation: Uncommitted changes detected in docs/foundation/02-spec.md. In strict mode, acceptance criteria must be committed in a signed commit before approval to prevent signature borrowing.",
        );
        return false;
      }
    } catch {
      // Non-fatal if diff check fails
    }
  }

  if (strictKeyEnforcement) {
    if (!gitMeta.isGit) {
      console.error("[FAIL] Security Violation: Strict specification approval requires an active Git repository.");
      return false;
    }

    if (gitMeta.signatureStatus !== "G") {
      console.error(
        `[FAIL] Security Violation: Commit is not signed with a verified cryptographic key (status: "${gitMeta.signatureStatus}"). Strict specification approval requires a valid GPG or SSH commit signature (%G? = G).`,
      );
      return false;
    }

    const allowedKeys = Array.isArray(authData)
      ? authData
      : authData?.allowedKeyFingerprints || [];

    if (allowedKeys.length === 0) {
      console.error(
        `[FAIL] Security Violation: In strict mode, "allowedKeyFingerprints" in authorized-approvers.json cannot be empty.`,
      );
      return false;
    }

    if (!gitMeta.signerKey && !gitMeta.signerKeyId && !gitMeta.signerFingerprint) {
      console.error(
        `[FAIL] Security Violation: Signer key fingerprint could not be extracted from commit signature.`,
      );
      return false;
    }

    if (!isKeyFingerprintAuthorized(gitMeta, allowedKeys)) {
      console.error(
        `[FAIL] Security Violation: Signing key "${gitMeta.signerFingerprint || gitMeta.signerKey}" (${gitMeta.signerName || "unnamed"}) is not authorized. Key fingerprint is not listed in allowedKeyFingerprints in authorized-approvers.json.`,
      );
      return false;
    }
  } else if (authData) {
    // Non-strict fallback: if authorized approvers list is defined
    const allowed = Array.isArray(authData) ? authData : authData.approvers || authData.allowedSigners || [];
    if (allowed.length > 0) {
      const matches = allowed.some(
        (a) =>
          isKeyFingerprintAuthorized(gitMeta, [a]) ||
          a.toLowerCase() === resolvedAuthor.toLowerCase() ||
          a.toLowerCase().startsWith(resolvedAuthor.toLowerCase() + " <") ||
          (gitMeta.userEmail && a.toLowerCase() === gitMeta.userEmail.toLowerCase()) ||
          (gitMeta.userName && a.toLowerCase() === gitMeta.userName.toLowerCase()) ||
          (options.actor && a.toLowerCase() === String(options.actor).toLowerCase()),
      );
      if (!matches) {
        console.error(
          `[FAIL] Unauthorized approver "${resolvedAuthor}". Signer not listed in authorized-approvers.json.`,
        );
        return false;
      }
    }
  }

  const tagName = `governance/spec-v${state.auditLog.length}`;
  const tagAnchor = {
    tag: tagName,
    commitSha: gitMeta.commitSha,
    treeHash: gitMeta.treeHash,
  };

  const attestation = {
    isGit: gitMeta.isGit,
    userName: gitMeta.userName,
    userEmail: gitMeta.userEmail,
    commitSha: gitMeta.commitSha,
    treeHash: gitMeta.treeHash,
    signatureStatus: gitMeta.signatureStatus || "N",
    signerName: gitMeta.signerName || "",
    signerKey: gitMeta.signerKey || "",
    tagAnchor,
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

  // External anchor: record in immutable Git Tag
  if (gitMeta.isGit && gitMeta.commitSha !== "0000000000000000000000000000000000000000") {
    try {
      execSync(`git tag -a "${tagName}" -m "Governance Spec Lock v${auditBlock.index}: ${auditBlock.hash}" HEAD -f`, {
        cwd: projectRoot,
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Non-fatal if git tag creation fails
    }
  }

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
 * Establishes a cryptographic migration baseline anchor in .governance/state.json.
 * Seals all prior unauthenticated history while enforcing strict cryptographic
 * GPG signatures and tag verification from this baseline forward.
 *
 * @param {string} [author]
 * @param {string} [reason]
 * @param {object} [options]
 * @param {string} [projectRoot]
 * @returns {boolean}
 */
export function rebaselineSpec(
  author,
  reason = "Migration baseline: establishing cryptographic root of trust for legacy blocks",
  options = {},
  projectRoot = process.cwd(),
) {
  const currentCriteria = extractCriteriaBlocks(projectRoot);
  const state = loadGovernanceState(projectRoot);
  const gitMeta = getGitAttestation(projectRoot);

  const previousHash =
    state.auditLog.length > 0
      ? state.auditLog[state.auditLog.length - 1].hash
      : GENESIS_PREVIOUS_HASH;

  let resolvedAuthor = author || "Muath R Abu Ouda";
  if (!author && gitMeta.userName) {
    resolvedAuthor = gitMeta.userName;
    if (gitMeta.userEmail) {
      resolvedAuthor += ` <${gitMeta.userEmail}>`;
    }
  }

  // Update story hashes with current criteria
  state.storyHashes = {};
  for (const [num, text] of Object.entries(currentCriteria)) {
    state.storyHashes[num] = hashText(text);
  }

  const tagName = `governance/spec-v${state.auditLog.length}`;
  const tagAnchor = {
    tag: tagName,
    commitSha: gitMeta.commitSha,
    treeHash: gitMeta.treeHash,
  };

  const attestation = {
    isGit: gitMeta.isGit,
    userName: gitMeta.userName,
    userEmail: gitMeta.userEmail,
    commitSha: gitMeta.commitSha,
    treeHash: gitMeta.treeHash,
    signatureStatus: gitMeta.signatureStatus || "N",
    signerName: gitMeta.signerName || "",
    signerKey: gitMeta.signerKey || "",
    tagAnchor,
  };

  const auditBlock = {
    index: state.auditLog.length,
    timestamp: new Date().toISOString(),
    action: "RE_BASELINE",
    author: resolvedAuthor,
    previousHash,
    attestation,
    details: {
      reason,
      baselineBlockIndex: state.auditLog.length,
      totalActiveStories: Object.keys(state.storyHashes).length,
      specHash: hashText(JSON.stringify(state.storyHashes)),
    },
  };
  auditBlock.hash = calculateBlockHash(auditBlock);

  state.auditLog.push(auditBlock);
  state.baseline = {
    blockIndex: auditBlock.index,
    blockHash: auditBlock.hash,
    commitSha: gitMeta.commitSha,
    reason,
    establishedAt: auditBlock.timestamp,
  };
  state.lastApprovedAt = auditBlock.timestamp;
  state.lastApprovedBy = resolvedAuthor;
  state.headAnchor = hashText(`${auditBlock.hash}:${attestation.commitSha}:${attestation.treeHash}`);

  // Create tag anchor if in Git
  if (gitMeta.isGit && gitMeta.commitSha !== "0000000000000000000000000000000000000000") {
    try {
      execSync(`git tag -a "${tagName}" -m "Governance Migration Baseline Lock v${auditBlock.index}: ${auditBlock.hash}" HEAD -f`, {
        cwd: projectRoot,
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Non-fatal if tag creation fails
    }
  }

  saveGovernanceState(state, projectRoot);
  console.log(`[PASS] Cryptographic Migration Baseline established at block ${auditBlock.index}`);
  console.log(`       Reason: ${reason}`);
  console.log(`       Baseline Hash: ${auditBlock.hash}`);
  return true;
}

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
    signatureStatus: gitMeta.signatureStatus || "N",
    signerName: gitMeta.signerName || "",
    signerKey: gitMeta.signerKey || "",
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

  // External anchor: record in Git Notes object database under refs/notes/governance
  if (gitMeta.isGit && gitMeta.commitSha !== "0000000000000000000000000000000000000000") {
    try {
      execSync(`git notes --ref=governance add -f -m "${state.headAnchor}" HEAD`, {
        cwd: projectRoot,
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Non-fatal if git notes is unavailable
    }
  }

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
 * @param {string} [projectRoot]
 * @param {{ strict?: boolean, requireTagAnchor?: boolean }} [options]
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function verifyCriteriaIntegrity(projectRoot = process.cwd(), options = {}) {
  const blocks = extractCriteriaBlocks(projectRoot);
  const state = loadGovernanceState(projectRoot);
  const violations = [];

  // 1. Verify the cryptographic audit log hash chain and immutable git tag anchor
  const chainCheck = verifyAuditChain(state, projectRoot, options);
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
