#!/usr/bin/env node

/**
 * Governance CLI Entrypoint
 * The AI-Native Software Engineering & Verification Platform
 * "No code without proof"
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  initDocs,
  addStory,
  addAdr,
  listAdrs,
  getStatus,
  addThreatModel,
  generateAgentRules,
  installGitHooks,
  installCiWorkflow,
} from "../scripts/scaffold.mjs";
import { detectStacks, runStage } from "../scripts/stack-runner.mjs";
import {
  verifyCriteriaIntegrity,
  verifyThreatModelCoverage,
  approveSpec,
  deprecateStory,
  lockCriteria,
} from "../scripts/state-guardian.mjs";
import { loadPolicy, evaluateGate, GateStatus } from "../scripts/policy-engine.mjs";
import { generateVerdict, loadLatestVerdict, formatVerdictTerminal } from "../scripts/verdict-engine.mjs";
import { buildTraceabilityMatrix, formatTraceabilityTerminal } from "../scripts/traceability.mjs";
import { auditAgentChanges, formatAgentAuditTerminal, initAgentContract } from "../scripts/agent-control.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const [, , command, ...args] = process.argv;

const COMMANDS = {
  // Scaffolding & Decisions
  init: {
    description: "Initialize 3-pillar methodology docs in target project: governance init [title] [--force]",
    action: () => {
      const isForce = args.includes("--force") || args.includes("-f");
      const filteredArgs = args.filter((a) => a !== "--force" && a !== "-f");
      const title = filteredArgs.join(" ") || "New Project";
      initDocs(title, undefined, isForce);
    },
  },
  status: {
    description: "Show project governance status (ADRs, Stories, Rules, Verification)",
    action: () => getStatus(),
  },
  "new:adr": {
    description: "Record a new Architecture Decision Record: governance new:adr <title>",
    action: () => {
      const title = args.join(" ");
      if (!title) {
        console.error("Usage: governance new:adr <title>");
        process.exit(1);
      }
      addAdr(title);
    },
  },
  "list:adr": {
    description: "List all Architecture Decision Records and their statuses",
    action: () => listAdrs(),
  },
  "new:story": {
    description: "Scaffold a new story with acceptance criteria: governance new:story <number> <title>",
    action: () => {
      const [num, ...titleParts] = args;
      if (!num || titleParts.length === 0) {
        console.error("Usage: governance new:story <number> <title>");
        process.exit(1);
      }
      addStory(num, titleParts.join(" "));
    },
  },
  "new:threat": {
    description: "Create a one-page threat model: governance new:threat <story-number> [title]",
    action: () => {
      const [num, ...titleParts] = args;
      if (!num) {
        console.error("Usage: governance new:threat <story-number> [title]");
        process.exit(1);
      }
      addThreatModel(num, titleParts.join(" ") || undefined);
    },
  },
  rules: {
    description: "Generate agent instructions (.cursorrules, CLAUDE.md, Copilot)",
    action: () => generateAgentRules(),
  },
  "approve:spec": {
    description: "Formally approve and lock Acceptance Criteria: governance approve:spec [signer-name] [--prune]",
    action: () => {
      const isPrune = args.includes("--prune");
      const filtered = args.filter((a) => a !== "--prune");
      const signer = filtered.join(" ") || "Engineer";
      approveSpec(signer, { prune: isPrune }, process.cwd());
    },
  },
  "lock:criteria": {
    description: "Alias for approve:spec",
    action: () => {
      const isPrune = args.includes("--prune");
      const filtered = args.filter((a) => a !== "--prune");
      const signer = filtered.join(" ") || "Engineer";
      approveSpec(signer, { prune: isPrune }, process.cwd());
    },
  },
  "deprecate:story": {
    description: "Formally deprecate an existing story: governance deprecate:story <number> [reason] [--author=<name>] [--superseded-by=<id>]",
    action: () => {
      const filtered = args.filter((a) => !a.startsWith("--author=") && !a.startsWith("--superseded-by="));
      const [storyNum, ...reasonParts] = filtered;
      const authorFlag = args.find((a) => a.startsWith("--author="));
      const supersededFlag = args.find((a) => a.startsWith("--superseded-by="));
      const author = authorFlag ? authorFlag.replace("--author=", "") : "Engineer";
      const supersededBy = supersededFlag ? supersededFlag.replace("--superseded-by=", "") : null;
      if (!storyNum) {
        console.error("Usage: governance deprecate:story <number> [reason] [--author=<name>] [--superseded-by=<id>]");
        process.exit(1);
      }
      deprecateStory(storyNum, reasonParts.join(" ") || "Deprecated by engineer", author, process.cwd(), {
        supersededBy,
      });
    },
  },
  "install:hooks": {
    description: "Install Git pre-commit enforcement hooks in current repository",
    action: () => installGitHooks(),
  },
  "install:ci": {
    description: "Generate GitHub Actions CI/CD verification gate: governance install:ci [--force]",
    action: () => {
      const isForce = args.includes("--force") || args.includes("-f");
      installCiWorkflow(process.cwd(), isForce);
    },
  },

  // Verification & Engineering Gates
  check: {
    description: "Run complete policy-driven verification pipeline across all detected project stacks: governance check [--profile=strict|standard|lenient]",
    action: () => {
      console.log(`\n================================================================`);
      console.log(`   GOVERNANCE VERIFICATION PIPELINE`);
      console.log(`   Target Workspace: ${process.cwd()}`);
      console.log(`================================================================`);

      const profileArg = args.find((a) => a.startsWith("--profile="));
      const profileOverride = profileArg ? profileArg.replace("--profile=", "").trim() : undefined;
      const policy = loadPolicy(process.cwd(), profileOverride);
      const stacks = detectStacks(process.cwd());
      console.log(`[INFO] Active Policy Profile: ${policy.profile} (${policy.profileDescription})`);
      console.log(`[INFO] Detected Stacks: ${stacks.map((s) => s.name).join(" + ")}`);

      const startTime = Date.now();
      const gateResults = [];
      let failed = false;

      // 1. Acceptance Criteria Integrity Gate (Spec Lock)
      console.log("\n[STAGE 1/9] Verifying Specification & Acceptance Criteria Integrity...");
      const criteriaCheck = verifyCriteriaIntegrity(process.cwd());
      const g1 = evaluateGate(
        "spec_integrity",
        {
          status: criteriaCheck.ok ? GateStatus.PASSED : GateStatus.FAILED,
          message: criteriaCheck.violations.join("\n   [FAIL] "),
        },
        policy,
      );
      gateResults.push({
        key: "spec_integrity",
        name: policy.gates.spec_integrity.name,
        required: policy.gates.spec_integrity.required,
        ...g1,
      });
      if (criteriaCheck.ok) {
        console.log("   [PASS] Acceptance Criteria integrity intact (no tampering detected)");
      } else {
        console.error(`   ${g1.message}`);
        if (g1.blocking) failed = true;
      }

      // 2. Threat Model Coverage Gate
      console.log("\n[STAGE 2/9] Auditing Threat Model coverage for active stories...");
      const threatCheck = verifyThreatModelCoverage(process.cwd());
      const g2 = evaluateGate(
        "threat_modeling",
        {
          status: threatCheck.ok ? GateStatus.PASSED : GateStatus.FAILED,
          message: threatCheck.violations.join("\n   [FAIL] "),
        },
        policy,
      );
      gateResults.push({
        key: "threat_modeling",
        name: policy.gates.threat_modeling.name,
        required: policy.gates.threat_modeling.required,
        ...g2,
      });
      if (threatCheck.ok) {
        if (threatCheck.waived && threatCheck.waived.length > 0) {
          console.log(`   [INFO] Waived stories with documented exemption: ${threatCheck.waived.join(", ")}`);
        }
        console.log("   [PASS] Threat model coverage verified for active stories");
      } else {
        console.error(`   ${g2.message}`);
        if (g2.blocking) failed = true;
      }

      // 3. Secrets Scan in current project
      console.log("\n[STAGE 3/9] Scanning for secret leaks...");
      const secretsResult = spawnSync(process.execPath, [resolve(rootDir, "scripts/scan-secrets.mjs"), process.cwd()], {
        stdio: "inherit",
      });
      const g3 = evaluateGate(
        "secrets",
        {
          status: secretsResult.status === 0 ? GateStatus.PASSED : GateStatus.FAILED,
          message: "Secrets scan failed",
        },
        policy,
      );
      gateResults.push({
        key: "secrets",
        name: policy.gates.secrets.name,
        required: policy.gates.secrets.required,
        ...g3,
      });
      if (!g3.passed && g3.blocking) failed = true;

      // 4. Dependencies Verification Gate
      console.log("\n[STAGE 4/9] Verifying Dependencies Pinning and Approvals...");
      const depsResult = spawnSync(process.execPath, [resolve(rootDir, "scripts/check-deps.mjs"), process.cwd()], {
        stdio: "inherit",
      });
      const g4 = evaluateGate(
        "dependencies",
        {
          status: depsResult.status === 0 ? GateStatus.PASSED : GateStatus.FAILED,
          message: "Dependencies verification failed",
        },
        policy,
      );
      gateResults.push({
        key: "dependencies",
        name: policy.gates.dependencies.name,
        required: policy.gates.dependencies.required,
        ...g4,
      });
      if (!g4.passed && g4.blocking) failed = true;

      // 5. Audit Git commits
      console.log("\n[STAGE 5/9] Auditing Git commits...");
      const gitResult = spawnSync(process.execPath, [resolve(rootDir, "scripts/audit-git.mjs"), process.cwd()], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      const g5 = evaluateGate(
        "git_audit",
        {
          status: gitResult.status === 0 ? GateStatus.PASSED : GateStatus.FAILED,
          message: "Git commit standards audit failed",
        },
        policy,
      );
      gateResults.push({
        key: "git_audit",
        name: policy.gates.git_audit.name,
        required: policy.gates.git_audit.required,
        ...g5,
      });
      if (!g5.passed && g5.blocking) failed = true;

      // 6. Formatting Verification across all stacks
      let anyFormatRun = false;
      let lastFormatGate = null;
      for (const st of stacks) {
        if (st.formatCmd) {
          anyFormatRun = true;
          console.log(`\n[STAGE 6/9] Verifying Code Formatting (${st.name})...`);
          const res = runStage(`Code Formatting (${st.name})`, st.formatCmd.cmd, st.formatCmd.args, process.cwd());
          const g = evaluateGate("formatting", res, policy);
          lastFormatGate = g;
          if (g.message && !res.passed) {
            console.log(`\n${g.message}`);
          }
          if (!g.passed && g.blocking) failed = true;
        }
      }
      if (!anyFormatRun) {
        const g = evaluateGate(
          "formatting",
          {
            status: GateStatus.NOT_CONFIGURED,
            message: "No project code formatter configured",
          },
          policy,
        );
        lastFormatGate = g;
        console.log(`\n${g.message}`);
        if (!g.passed && g.blocking) failed = true;
      }
      gateResults.push({
        key: "formatting",
        name: policy.gates.formatting.name,
        required: policy.gates.formatting.required,
        ...lastFormatGate,
      });

      // 7. Static Analysis / Linter across all stacks
      let anyLintRun = false;
      let lastLintGate = null;
      for (const st of stacks) {
        if (st.lintCmd) {
          anyLintRun = true;
          console.log(`\n[STAGE 7/9] Running Static Analysis & Lint (${st.name})...`);
          const res = runStage(`Static Analysis (${st.name})`, st.lintCmd.cmd, st.lintCmd.args, process.cwd());
          const g = evaluateGate("static_analysis", res, policy);
          lastLintGate = g;
          if (g.message && !res.passed) {
            console.log(`\n${g.message}`);
          }
          if (!g.passed && g.blocking) failed = true;
        }
      }
      if (!anyLintRun) {
        const g = evaluateGate(
          "static_analysis",
          {
            status: GateStatus.NOT_CONFIGURED,
            message: "No project linter configured",
          },
          policy,
        );
        lastLintGate = g;
        console.log(`\n${g.message}`);
        if (!g.passed && g.blocking) failed = true;
      }
      gateResults.push({
        key: "static_analysis",
        name: policy.gates.static_analysis.name,
        required: policy.gates.static_analysis.required,
        ...lastLintGate,
      });

      // 8. Automated Test Suite Execution across all stacks
      let anyTestRun = false;
      let lastTestGate = null;
      for (const st of stacks) {
        if (st.testCmd) {
          anyTestRun = true;
          console.log(`\n[STAGE 8/9] Executing Automated Test Suite (${st.name})...`);
          const res = runStage(`Test Suite (${st.name})`, st.testCmd.cmd, st.testCmd.args, process.cwd());
          const g = evaluateGate("test_suite", res, policy);
          lastTestGate = g;
          if (!g.passed && g.blocking) failed = true;
        }
      }
      if (!anyTestRun) {
        const missingDetails = stacks
          .filter((s) => s.missingDepsMessage)
          .map((s) => `${s.name}: ${s.missingDepsMessage}`)
          .join("; ");
        const message = missingDetails
          ? `No test runner configured in active stack (${missingDetails})`
          : "No test runner configured in active stack";
        const g = evaluateGate(
          "test_suite",
          {
            status: GateStatus.NOT_CONFIGURED,
            message,
          },
          policy,
        );
        lastTestGate = g;
        console.log(`\n${g.message}`);
        if (!g.passed && g.blocking) failed = true;
      }
      gateResults.push({
        key: "test_suite",
        name: policy.gates.test_suite.name,
        required: policy.gates.test_suite.required,
        ...lastTestGate,
      });

      // 9. Design System Audit (if UI files exist)
      console.log("\n[STAGE 9/9] Auditing UI Design Tokens...");
      const designResult = spawnSync(process.execPath, [resolve(rootDir, "scripts/audit-design.mjs"), process.cwd()], {
        stdio: "inherit",
      });
      const g9 = evaluateGate(
        "design_system",
        {
          status: designResult.status === 0 ? GateStatus.PASSED : GateStatus.FAILED,
          message: "Design system token audit failed",
        },
        policy,
      );
      if (g9.message && designResult.status !== 0) {
        console.log(`\n${g9.message}`);
      }
      if (!g9.passed && g9.blocking) failed = true;
      gateResults.push({
        key: "design_system",
        name: policy.gates.design_system.name,
        required: policy.gates.design_system.required,
        ...g9,
      });

      // 10. Generate Verdict and Traceability Matrix Evidence
      const verdict = generateVerdict({ gateResults, policy, stacks, startTime }, process.cwd());
      buildTraceabilityMatrix(process.cwd());

      console.log(`\n================================================================`);
      console.log(`   GOVERNANCE VERDICT: [${verdict.verdict}]`);
      console.log(`   Evidence Ledger:   .governance/evidence/verdict.json`);
      console.log(`   Executive Report:  .governance/evidence/report.md`);
      console.log(`   Traceability Map:  .governance/evidence/traceability.json`);
      console.log(`   Signature:         ${verdict.signature.slice(0, 16)}...`);
      console.log(`================================================================`);

      if (failed) {
        console.error(`\n[FAIL] GOVERNANCE FAILED: One or more required policy gates failed!`);
        console.error(`       Fix violations before committing or pushing code.\n`);
        process.exit(1);
      } else {
        console.log(`\n[PASS] GOVERNANCE PASSED: All active verification gates passed!\n`);
        process.exit(0);
      }
    },
  },
  verdict: {
    description: "Display latest governance verdict and cryptographic evidence summary",
    action: () => {
      const v = loadLatestVerdict(process.cwd());
      console.log(formatVerdictTerminal(v));
    },
  },
  trace: {
    description: "Display requirement-to-code and test traceability matrix: governance trace [story-number]",
    action: () => {
      const storyFilter = args[0];
      const matrix = buildTraceabilityMatrix(process.cwd());
      console.log(formatTraceabilityTerminal(matrix, storyFilter));
    },
  },
  "agent:audit": {
    description: "Audit working tree changes against Agent Governance Contract rules and protected paths",
    action: () => {
      const res = auditAgentChanges(process.cwd());
      console.log(formatAgentAuditTerminal(res));
      if (!res.passed) {
        process.exit(1);
      }
    },
  },
  "init:contract": {
    description: "Initialize or reset Agent Governance Contract: governance init:contract [--force]",
    action: () => {
      const isForce = args.includes("--force") || args.includes("-f");
      initAgentContract(process.cwd(), isForce);
    },
  },
  "audit:git": {
    description: "Audit git commits against Conventional Commits standards",
    action: () => runScript("scripts/audit-git.mjs", [process.cwd(), ...args]),
  },
  "audit:design": {
    description: "Audit UI templates for Design System rules (palette, 70-20-10, no green bg)",
    action: () => runScript("scripts/audit-design.mjs", [process.cwd(), ...args]),
  },
  secrets: {
    description: "Scan codebase for accidental secret or token leaks",
    action: () => runScript("scripts/scan-secrets.mjs", [process.cwd()]),
  },
  deps: {
    description: "Verify that all dependencies are strictly pinned and approved",
    action: () => runScript("scripts/check-deps.mjs", [process.cwd()]),
  },
  context: {
    description: "Inspect context window size and token footprint across rulebooks",
    action: () => runScript("scripts/context-size.mjs"),
  },
  map: {
    description: "Generate structured repository architectural map",
    action: () => runScript("scripts/repo-map.mjs", [process.cwd()]),
  },

  // Reference Benchmark & Mutation Demos (internal reference implementation)
  "demo:mutate": {
    description: "Run mutation testing demo on reference project",
    action: () => {
      const demoScript = resolve(rootDir, "golden-project/scripts/mutate.mjs");
      if (existsSync(demoScript)) {
        runScript("golden-project/scripts/mutate.mjs");
      } else {
        console.log("Mutation demo is available in the source repository.");
      }
    },
  },
  "demo:bench": {
    description: "Run performance benchmark demo on reference project",
    action: () => {
      const demoScript = resolve(rootDir, "golden-project/scripts/bench.mjs");
      if (existsSync(demoScript)) {
        runScript("golden-project/scripts/bench.mjs");
      } else {
        console.log("Benchmark demo is available in the source repository.");
      }
    },
  },

  // Methodology Prompts
  prompt: {
    description: "Browse or display engineering prompts across the 13 methodology phases (00 to 12)",
    action: () => {
      const query = args.join(" ").trim().toLowerCase();
      const promptsPath = resolve(rootDir, "prompts");
      if (!existsSync(promptsPath)) {
        console.error("Prompts directory not found.");
        process.exit(1);
      }
      const stages = readdirSync(promptsPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

      if (!query) {
        console.log(`\n=== Governance AI Software Engineering Methodology Prompts (00 to 12) ===\n`);
        for (const stage of stages) {
          const files = readdirSync(resolve(promptsPath, stage)).filter((f) => f.endsWith(".md"));
          console.log(`  - ${stage} (${files.length} prompts)`);
        }
        console.log(
          `\nUsage: governance prompt <stage-or-keyword> (e.g. "governance prompt requirements" or "governance prompt 01")\n`,
        );
        return;
      }

      const matchedStage = stages.find((s) => s.toLowerCase().includes(query));
      if (matchedStage) {
        const stagePath = resolve(promptsPath, matchedStage);
        const files = readdirSync(stagePath).filter((f) => f.endsWith(".md"));
        console.log(`\n=== Prompts in: ${matchedStage} ===\n`);
        for (const file of files) {
          const content = readFileSync(resolve(stagePath, file), "utf8");
          console.log(`--- [${file}] ---`);
          console.log(content.trim());
          console.log("\n");
        }
      } else {
        console.error(`No prompt stage found matching "${query}". Available stages:`);
        console.log(stages.map((s) => `  - ${s}`).join("\n"));
        process.exit(1);
      }
    },
  },
};

function printHelp() {
  console.log(`
================================================================
   GOVERNANCE — Software Engineering Verification Engine
   "No code without proof"
================================================================

Usage:
   governance <command> [options]

Core Architecture & Decision Commands:
${Object.entries(COMMANDS)
  .filter(([cmd]) => ["init", "status", "new:adr", "list:adr", "new:story", "new:threat", "approve:spec", "deprecate:story", "rules", "install:hooks", "install:ci"].includes(cmd))
  .map(([name, meta]) => `   ${name.padEnd(16)} ${meta.description}`)
  .join("\n")}

Verification & Engineering Gates:
${Object.entries(COMMANDS)
  .filter(([cmd]) => ["check", "audit:git", "audit:design", "secrets", "deps", "map", "context"].includes(cmd))
  .map(([name, meta]) => `   ${name.padEnd(16)} ${meta.description}`)
  .join("\n")}

Reference Demos & Methodology:
${Object.entries(COMMANDS)
  .filter(([cmd]) => ["prompt", "demo:mutate", "demo:bench"].includes(cmd))
  .map(([name, meta]) => `   ${name.padEnd(16)} ${meta.description}`)
  .join("\n")}

Options:
   --help, -h     Show this help guide
   --version, -v  Print Governance engine version
`);
}

function runNpmScript(scriptName) {
  const result = spawnSync("npm", ["run", scriptName], {
    cwd: rootDir,
    stdio: "inherit",
    shell: true,
  });
  process.exit(result.status ?? 0);
}

function runScript(scriptRelativePath, extraArgs = []) {
  const fullPath = resolve(rootDir, scriptRelativePath);
  const result = spawnSync(process.execPath, [fullPath, ...extraArgs], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  process.exit(result.status ?? 0);
}

// Handle execution
if (!command || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  console.log("Governance Engine v1.00.00");
  process.exit(0);
}

const targetCommand = COMMANDS[command];
if (targetCommand) {
  targetCommand.action();
} else {
  console.error(`Unknown command: "${command}"\nRun "governance --help" to see available commands.`);
  process.exit(1);
}
