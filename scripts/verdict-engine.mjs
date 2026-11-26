/**
 * Governance Verdict & Evidence Engine
 * Generates cryptographic proof artifacts (verdict.json and report.md)
 * documenting gate verification outcomes, committer attestation, and compliance verdicts.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GateStatus } from "./policy-engine.mjs";
import { getGitAttestation, loadGovernanceState } from "./state-guardian.mjs";

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
export function generateVerdict(
  { gateResults, policy, stacks, startTime },
  projectRoot = process.cwd(),
) {
  const endTime = Date.now();
  const durationMs = endTime - (startTime || endTime);
  const gitMeta = getGitAttestation(projectRoot);
  const state = loadGovernanceState(projectRoot);

  const failedGates = gateResults.filter((g) => !g.passed && g.blocking);
  const warningGates = gateResults.filter(
    (g) => g.status === GateStatus.REQUIRES_REVIEW || (g.passed && g.status === GateStatus.SKIPPED && g.message?.includes("[WARN]")),
  );

  let overallVerdict = "APPROVED";
  let summaryReason = "All active verification gates passed";

  if (failedGates.length > 0) {
    overallVerdict = "REJECTED";
    summaryReason = `${failedGates.length} required verification gate(s) failed: ${failedGates.map((g) => g.name || g.key).join(", ")}`;
  } else if (warningGates.length > 0 || policy.profile === "lenient") {
    overallVerdict = "REQUIRES_REVIEW";
    summaryReason = warningGates.length > 0
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

  // Generate cryptographic signature of verdict payload
  const signature = hashData(rawVerdict);
  const verdict = {
    ...rawVerdict,
    signature,
  };

  const evidenceDir = getEvidenceDir(projectRoot);
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

  const sigStatus = verdict.attestation.signatureStatus || "N";
  const sigDescription =
    sigStatus === "G"
      ? `Valid (Signed by ${verdict.attestation.signerName || "Verified Key"} [${verdict.attestation.signerKey || "GPG/SSH"}])`
      : sigStatus === "N"
        ? "Unsigned"
        : `Status ${sigStatus}`;

  return `# Governance Verification Report

> **Verdict:** **${badgeMap[verdict.verdict] || verdict.verdict}**  
> **Summary:** ${verdict.summary}  
> **Timestamp:** ${verdict.timestamp} (${verdict.durationMs}ms)  
> **Cryptographic Signature:** \`${verdict.signature}\`

---

## Attestation & Provenance

- **Committer:** ${verdict.attestation.userName} <${verdict.attestation.userEmail}>
- **Git Commit:** \`${verdict.attestation.commitSha.slice(0, 10)}\` (Tree: \`${verdict.attestation.treeHash.slice(0, 10)}\`)
- **Commit Signature:** ${sigDescription}
- **State Head Anchor:** \`${verdict.attestation.stateHeadAnchor.slice(0, 16)}...\`
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
