/**
 * Governance Verdict & Evidence Engine
 * Generates cryptographic proof artifacts (verdict.json and report.md)
 * documenting gate verification outcomes, committer attestation, and compliance verdicts.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GateStatus } from "./policy-engine.mjs";
import { getGitAttestation, isKeyFingerprintAuthorized, loadGovernanceState } from "./state-guardian.mjs";

/**
 * Returns path to .governance/evidence directory in target project.
 * @param {string} projectRoot
 * @returns {string}
 */
export function getEvidenceDir(projectRoot = process.cwd()) {
  const dir = resolve(projectRoot, ".governance", "evidence");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Computes sha256 hash of text or object.
 * @param {string|object} data
 * @returns {string}
 */
export function hashData(data) {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return createHash("sha256").update(text.trim()).digest("hex");
}

/**
 * Generates and persists machine-readable verdict.json and human-readable report.md.
 *
 * @param {object} params
 * @param {Array<object>} params.gateResults
 * @param {object} params.policy
 * @param {Array<object>} params.stacks
 * @param {number} params.startTime
 * @param {string} [projectRoot]
 * @returns {object} The complete verdict payload
 */
export function generateVerdict({ gateResults, policy, stacks, startTime }, projectRoot = process.cwd()) {
  const endTime = Date.now();
  const durationMs = endTime - (startTime || endTime);
  const gitMeta = getGitAttestation(projectRoot);
  const state = loadGovernanceState(projectRoot);

  const failedGates = gateResults.filter((g) => !g.passed && g.blocking);
  const warningGates = gateResults.filter(
    (g) =>
      g.status === GateStatus.REQUIRES_REVIEW ||
      (g.passed && g.status === GateStatus.SKIPPED && g.message?.includes("[WARN]")),
  );

  let overallVerdict = "APPROVED";
  let summaryReason = "All active verification gates passed";

  if (failedGates.length > 0) {
    overallVerdict = "REJECTED";
    summaryReason = `${failedGates.length} required verification gate(s) failed: ${failedGates.map((g) => g.name || g.key).join(", ")}`;
  } else if (warningGates.length > 0 || policy.profile === "lenient") {
    overallVerdict = "REQUIRES_REVIEW";
    summaryReason =
      warningGates.length > 0
        ? `${warningGates.length} gate(s) completed with warnings or require review: ${warningGates.map((g) => g.name || g.key).join(", ")}`
        : "Executed under lenient policy profile";
  }

  const rawVerdict = {
    version: "1.0.0",
    verdict: overallVerdict,
    summary: summaryReason,
    timestamp: new Date().toISOString(),
    durationMs,
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      cwd: projectRoot,
    },
    attestation: {
      isGit: gitMeta.isGit,
      userName: gitMeta.userName,
      userEmail: gitMeta.userEmail,
      commitSha: gitMeta.commitSha,
      treeHash: gitMeta.treeHash,
      signatureStatus: gitMeta.signatureStatus || "N",
      signerName: gitMeta.signerName || "",
      signerKey: gitMeta.signerKey || "",
      stateHeadAnchor: state.headAnchor || "unanchored",
    },
    policy: {
      profile: policy.profile,
      failOnWarning: policy.fail_on_warning,
    },
    stacks: stacks.map((s) => ({
      name: s.name,
      type: s.type,
      hasInstalledDeps: s.hasInstalledDeps,
    })),
    gates: gateResults.map((g) => ({
      key: g.key,
      name: g.name,
      required: g.required,
      status: g.status,
      passed: g.passed,
      blocking: g.blocking,
      message: g.message || "",
    })),
  };

  // Verify genuine detached GPG signature on evidence artifact if present
  const evidenceDir = getEvidenceDir(projectRoot);
  const sigAscPath = resolve(evidenceDir, "verdict.json.asc");
  const sigVerification = verifyEvidenceSignature(projectRoot);

  // Generate cryptographic content digest of verdict payload
  const digestValue = hashData(rawVerdict);
  const verdict = {
    ...rawVerdict,
    contentDigest: {
      algorithm: "sha256",
      value: digestValue,
    },
    gitAttestation: {
      isGit: gitMeta.isGit,
      author: `${gitMeta.userName || "Unknown"} <${gitMeta.userEmail || "unknown"}>`,
      commitSha: gitMeta.commitSha,
      treeHash: gitMeta.treeHash,
      commitSignatureStatus: gitMeta.signatureStatus || "N",
      commitSignerName: gitMeta.signerName || null,
      commitSignerKey: gitMeta.signerKey || null,
      commitSignerFingerprint: gitMeta.signerFingerprint || null,
      verified: gitMeta.signatureStatus === "G",
    },
    evidenceAttestation: {
      signed: sigVerification.verified,
      type: sigVerification.verified
        ? "detached-gpg"
        : existsSync(sigAscPath)
          ? "invalid-signature"
          : "content_digest_only",
      signatureFile: existsSync(sigAscPath) ? "verdict.json.asc" : null,
      verified: sigVerification.verified,
      signerKey: sigVerification.signerKey || null,
      description: sigVerification.verified
        ? `Cryptographically verified via detached GPG signature (key: ${sigVerification.signerKey})`
        : existsSync(sigAscPath)
          ? `GPG Signature verification failed: ${sigVerification.error}`
          : "Unsigned (Integrity guaranteed via SHA-256 Content Digest; run 'governance evidence:sign' to attest)",
    },
    // Retained for backward-compatible consumption
    digitalProof: {
      type: gitMeta.signatureStatus === "G" ? "git-commit-gpg" : "none",
      status: gitMeta.signatureStatus || "N",
      signerName: gitMeta.signerName || null,
      signerKey: gitMeta.signerKey || null,
      signerKeyId: gitMeta.signerKeyId || null,
      signerFingerprint: gitMeta.signerFingerprint || null,
      verified: gitMeta.signatureStatus === "G",
    },
    signature: digestValue,
  };

  const verdictPath = resolve(evidenceDir, "verdict.json");
  const reportPath = resolve(evidenceDir, "report.md");

  writeFileSync(verdictPath, JSON.stringify(verdict, null, 2), "utf8");

  // Generate Human-Readable Markdown Report
  const reportMarkdown = generateReportMarkdown(verdict);
  writeFileSync(reportPath, reportMarkdown, "utf8");

  return verdict;
}

/**
 * Resolves a truthful, consistent badge for a gate result.
 * Prevents skipped or non-configured gates from displaying a false [PASS] badge.
 *
 * @param {object} gate
 * @returns {string} Truthful status badge: [PASS], [FAIL], [SKIP], [NOT CONFIGURED], [WARN]
 */
export function getGateBadge(gate) {
  if (gate.status === GateStatus.PASSED) {
    return "[PASS]";
  }
  if (gate.status === GateStatus.FAILED) {
    return "[FAIL]";
  }
  if (gate.status === GateStatus.SKIPPED) {
    return "[SKIP]";
  }
  if (gate.status === GateStatus.NOT_CONFIGURED) {
    return gate.passed ? "[NOT CONFIGURED]" : "[FAIL]";
  }
  if (gate.status === GateStatus.REQUIRES_REVIEW) {
    return "[WARN]";
  }
  return gate.passed ? "[PASS]" : "[FAIL]";
}

/**
 * Formats human-readable markdown report from verdict object.
 * @param {object} verdict
 * @returns {string}
 */
export function generateReportMarkdown(verdict) {
  const badgeMap = {
    APPROVED: "[VERDICT: APPROVED]",
    REJECTED: "[VERDICT: REJECTED]",
    REQUIRES_REVIEW: "[VERDICT: REQUIRES REVIEW]",
  };

  const gateRows = verdict.gates
    .map((g) => {
      const statusBadge = getGateBadge(g);
      const requiredStr = g.required ? "Required" : "Optional";
      return `| ${statusBadge} ${g.name} | ${requiredStr} | ${g.status} | ${g.message.replace(/\|/g, "\\|")} |`;
    })
    .join("\n");

  const stackList = verdict.stacks.map((s) => `- **${s.name}** (${s.type})`).join("\n");

  const gitAttest = verdict.gitAttestation || verdict.attestation || {};
  const sigStatus = gitAttest.commitSignatureStatus || gitAttest.signatureStatus || "N";
  const gitSigDescription =
    sigStatus === "G"
      ? `Valid (Signed by ${gitAttest.commitSignerName || gitAttest.signerName || "Verified Key"} [${gitAttest.commitSignerKey || gitAttest.signerKey || "GPG/SSH"}])`
      : sigStatus === "N"
        ? "Unsigned"
        : `Status ${sigStatus}`;

  const evidenceAttest = verdict.evidenceAttestation || {};
  const evidenceSigDescription = evidenceAttest.signed
    ? `Verified (${evidenceAttest.description})`
    : `Unsigned (${evidenceAttest.description || "SHA-256 Digest Only"})`;

  return `# Governance Verification Report

> **Verdict:** **${badgeMap[verdict.verdict] || verdict.verdict}**  
> **Summary:** ${verdict.summary}  
> **Timestamp:** ${verdict.timestamp} (${verdict.durationMs}ms)  
> **Content Digest (SHA-256):** \`${verdict.contentDigest?.value || verdict.signature}\`  
> **Evidence Digital Attestation:** ${evidenceSigDescription}  
> **Git Commit Attestation:** ${gitSigDescription}

---

## Evidence Integrity & Attestation

- **Content Digest Algorithm:** \`${verdict.contentDigest?.algorithm || "sha256"}\`
- **Digest Value:** \`${verdict.contentDigest?.value || verdict.signature}\`
- **Detached GPG Attestation:** ${evidenceSigDescription}
- **Signature File:** \`${evidenceAttest.signatureFile || "none (run 'governance evidence:sign')"}\`

## Git Provenance & Commit Attestation

- **Committer:** ${gitAttest.author || `${gitAttest.userName || "Unknown"} <${gitAttest.userEmail || "unknown"}>`}
- **Git Commit:** \`${(gitAttest.commitSha || "0000000000").slice(0, 10)}\` (Tree: \`${(gitAttest.treeHash || "0000000000").slice(0, 10)}\`)
- **Git Commit Signature:** ${gitSigDescription}
- **State Head Anchor:** \`${(verdict.attestation?.stateHeadAnchor || "unanchored").slice(0, 16)}...\`
- **Policy Profile:** \`${verdict.policy.profile}\` (Fail on warning: ${verdict.policy.failOnWarning})

## Detected Engineering Stacks

${stackList}

---

## Gate Verification Matrix

| Gate | Requirement | Status | Diagnostics & Proof |
| :--- | :--- | :--- | :--- |
${gateRows}

---

_Generated automatically by AI Governance Platform — "No code without proof"_
`;
}

/**
 * Loads latest verdict from project if exists.
 * @param {string} [projectRoot]
 * @returns {object|null}
 */
export function loadLatestVerdict(projectRoot = process.cwd()) {
  const verdictPath = resolve(projectRoot, ".governance", "evidence", "verdict.json");
  if (existsSync(verdictPath)) {
    try {
      return JSON.parse(readFileSync(verdictPath, "utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Formats a terminal summary of the latest verdict.
 * @param {object} verdict
 * @returns {string}
 */
export function formatVerdictTerminal(verdict) {
  if (!verdict) {
    return "[INFO] No governance verdict has been generated yet. Run 'governance check' first.";
  }

  const lines = [
    `\n================================================================`,
    `   GOVERNANCE VERDICT SUMMARY`,
    `================================================================`,
    `Verdict:     ${verdict.verdict}`,
    `Summary:     ${verdict.summary}`,
    `Timestamp:   ${verdict.timestamp}`,
    `Profile:     ${verdict.policy?.profile || "standard"}`,
    `Signer:      ${verdict.attestation?.userName || "Unknown"} <${verdict.attestation?.userEmail || "unknown"}>`,
    `Commit:      ${verdict.attestation?.commitSha ? verdict.attestation.commitSha.slice(0, 10) : "N/A"}`,
    `Signature:   ${verdict.signature}`,
    `Evidence:    .governance/evidence/verdict.json`,
    `Report:      .governance/evidence/report.md`,
    `================================================================\n`,
  ];

  return lines.join("\n");
}

/**
 * Resolves the GPG executable path using Git configuration, system PATH, or standard binary locations.
 * @param {string} [projectRoot]
 * @returns {string}
 */
export function resolveGpgBinary(projectRoot = process.cwd()) {
  try {
    const gitGpg = execSync("git config gpg.program", {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (gitGpg && existsSync(gitGpg)) return `"${gitGpg}"`;
  } catch {
    // Continue search
  }

  const commonPaths = [
    "C:\\Program Files\\Git\\usr\\bin\\gpg.exe",
    "C:\\Program Files (x86)\\GnuPG\\bin\\gpg.exe",
    "C:\\Program Files\\GnuPG\\bin\\gpg.exe",
  ];
  for (const p of commonPaths) {
    if (existsSync(p)) return `"${p}"`;
  }

  return "gpg";
}

/**
 * Cryptographically signs a verdict file using GPG detached signature.
 * @param {string} [projectRoot]
 * @param {{ keyId?: string }} [options]
 * @returns {{ signed: boolean, signaturePath: string|null, error: string|null }}
 */
export function signVerdict(projectRoot = process.cwd(), options = {}) {
  const evidenceDir = getEvidenceDir(projectRoot);
  const verdictPath = resolve(evidenceDir, "verdict.json");
  if (!existsSync(verdictPath)) {
    return { signed: false, signaturePath: null, error: "verdict.json not found" };
  }

  const sigPath = resolve(evidenceDir, "verdict.json.asc");
  let targetKey = options.keyId;
  if (!targetKey) {
    try {
      targetKey = execSync("git config user.signingkey", {
        cwd: projectRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      targetKey = "";
    }
  }
  const keyArg = targetKey ? `-u "${targetKey}"` : "";
  const gpgBin = resolveGpgBinary(projectRoot);

  try {
    execSync(
      `${gpgBin} --batch --yes --armor --detach-sign ${keyArg} --output "${sigPath}" "${verdictPath}"`,
      {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    return {
      signed: true,
      signaturePath: sigPath,
      error: null,
    };
  } catch (err) {
    return {
      signed: false,
      signaturePath: null,
      error: err.message,
    };
  }
}

/**
 * Cryptographically verifies a detached GPG signature on verdict.json.
 * Validates GPG status, checks signature authenticity, and ensures the signer's
 * key fingerprint is authorized in .governance/authorized-approvers.json.
 *
 * @param {string} [projectRoot]
 * @returns {{ verified: boolean, signerName: string|null, signerKey: string|null, error: string|null }}
 */
export function verifyEvidenceSignature(projectRoot = process.cwd()) {
  const evidenceDir = getEvidenceDir(projectRoot);
  const verdictPath = resolve(evidenceDir, "verdict.json");
  const sigAscPath = resolve(evidenceDir, "verdict.json.asc");

  if (!existsSync(verdictPath) || !existsSync(sigAscPath)) {
    return {
      verified: false,
      signerName: null,
      signerKey: null,
      error: !existsSync(sigAscPath) ? "detached_signature_missing" : "verdict_file_missing",
    };
  }

  // Load authorized approvers whitelist
  const authFile = resolve(projectRoot, ".governance", "authorized-approvers.json");
  let allowedKeys = [];
  if (existsSync(authFile)) {
    try {
      const authData = JSON.parse(readFileSync(authFile, "utf8"));
      allowedKeys = authData.allowedKeyFingerprints || [];
    } catch {
      // Failed to parse approvers
    }
  }

  try {
    const gpgBin = resolveGpgBinary(projectRoot);
    const output = execSync(`${gpgBin} --batch --status-fd 1 --verify "${sigAscPath}" "${verdictPath}"`, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });

    const isGoodSig = output.includes("[GNUPG:] GOODSIG");
    const validSigMatch = output.match(/\[GNUPG:\]\s+VALIDSIG\s+([A-Fa-f0-9]+)/);
    const signerFingerprint = validSigMatch ? validSigMatch[1] : null;

    if (!isGoodSig || !signerFingerprint) {
      return {
        verified: false,
        signerName: null,
        signerKey: signerFingerprint,
        error: "invalid_cryptographic_signature",
      };
    }

    // Check against authorized approvers whitelist
    const isAuthorized =
      allowedKeys.length === 0 || isKeyFingerprintAuthorized({ signerFingerprint }, allowedKeys);

    if (!isAuthorized) {
      return {
        verified: false,
        signerName: null,
        signerKey: signerFingerprint,
        error: `unauthorized_signing_key: ${signerFingerprint}`,
      };
    }

    return {
      verified: true,
      signerName: null,
      signerKey: signerFingerprint,
      error: null,
    };
  } catch (err) {
    return {
      verified: false,
      signerName: null,
      signerKey: null,
      error: `gpg_verification_failed: ${err.message}`,
    };
  }
}
