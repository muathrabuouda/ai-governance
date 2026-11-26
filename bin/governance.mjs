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
import { detectStack, runStage } from "../scripts/stack-runner.mjs";
import {
  verifyCriteriaIntegrity,
  verifyThreatModelCoverage,
  lockCriteria,
} from "../scripts/state-guardian.mjs";

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
  "install:hooks": {
    description: "Install Git pre-commit enforcement hooks in current repository",
    action: () => installGitHooks(),
  },
  "install:ci": {
    description: "Generate GitHub Actions CI/CD verification gate (.github/workflows/governance-gate.yml)",
    action: () => installCiWorkflow(),
  },

  // Verification & Engineering Gates
  check: {
    description: "Run complete verification pipeline: stack tests, lint, format, secrets, git audit",
    action: () => {
      console.log(`\n================================================================`);
      console.log(`   GOVERNANCE VERIFICATION PIPELINE`);
      console.log(`   Target Workspace: ${process.cwd()}`);
      console.log(`================================================================`);

      const stack = detectStack(process.cwd());
      console.log(`\n🔍 Detected Stack: ${stack.name}`);
      let failed = false;

      // 1. Acceptance Criteria Integrity Gate (Spec Lock)
      console.log("\n➡️  [GATE 1/8] Verifying Specification & Acceptance Criteria Integrity...");
      const criteriaCheck = verifyCriteriaIntegrity(process.cwd());
      if (!criteriaCheck.ok) {
        for (const v of criteriaCheck.violations) {
          console.error(`   ✗ ${v}`);
        }
        failed = true;
      } else {
        console.log("   ✓ Acceptance Criteria integrity intact (no tampering detected)");
      }

      // 2. Threat Model Coverage Gate
      console.log("\n➡️  [GATE 2/8] Auditing Threat Model coverage for active stories...");
      const threatCheck = verifyThreatModelCoverage(process.cwd());
      if (!threatCheck.ok) {
        for (const w of threatCheck.warnings) {
          console.warn(`   ⚠️  ${w}`);
        }
      } else {
        console.log("   ✓ Threat model coverage verified for active stories");
      }

      // 3. Secrets Scan in current project
      console.log("\n➡️  [GATE 3/8] Scanning for secret leaks...");
      const secretsResult = spawnSync(process.execPath, [resolve(rootDir, "scripts/scan-secrets.mjs"), process.cwd()], {
        stdio: "inherit",
      });
      if (secretsResult.status !== 0) failed = true;

      // 4. Audit Git commits
      console.log("\n➡️  [GATE 4/8] Auditing Git commits...");
      const gitResult = spawnSync(process.execPath, [resolve(rootDir, "scripts/audit-git.mjs")], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      if (gitResult.status !== 0) failed = true;

      // 5. Formatting Verification
      if (stack.formatCmd) {
        console.log(`\n➡️  [GATE 5/8] Verifying Code Formatting (${stack.name})...`);
        const ok = runStage("Code Formatting", stack.formatCmd.cmd, stack.formatCmd.args, process.cwd());
        if (!ok) failed = true;
      } else {
        console.log(`\nℹ️  [GATE 5/8] Code Formatting: No project formatter configured (skipped)`);
      }

      // 6. Static Analysis / Linter
      if (stack.lintCmd) {
        console.log(`\n➡️  [GATE 6/8] Running Static Analysis & Lint (${stack.name})...`);
        const ok = runStage("Static Analysis", stack.lintCmd.cmd, stack.lintCmd.args, process.cwd());
        if (!ok) failed = true;
      } else {
        console.log(`\nℹ️  [GATE 6/8] Static Analysis: No project linter configured (skipped)`);
      }

      // 7. Automated Test Suite Execution
      if (stack.testCmd) {
        console.log(`\n➡️  [GATE 7/8] Executing Automated Test Suite (${stack.name})...`);
        const ok = runStage("Test Suite", stack.testCmd.cmd, stack.testCmd.args, process.cwd());
        if (!ok) failed = true;
      } else {
        console.log(`\nℹ️  [GATE 7/8] Test Suite: No test runner configured (skipped)`);
      }

      // 8. Design System Audit (if UI files exist)
      console.log("\n➡️  [GATE 8/8] Auditing UI Design Tokens...");
      const designResult = spawnSync(process.execPath, [resolve(rootDir, "scripts/audit-design.mjs"), process.cwd()], {
        stdio: "inherit",
      });
      if (designResult.status !== 0) failed = true;

      console.log(`\n================================================================`);
      if (failed) {
        console.error(`❌ GOVERNANCE FAILED: One or more verification gates failed!`);
        console.error(`   Fix violations before committing or pushing code.`);
        console.log(`================================================================\n`);
        process.exit(1);
      } else {
        console.log(`✅ GOVERNANCE PASSED: All active verification gates passed!`);
        console.log(`================================================================\n`);
        process.exit(0);
      }
    },
  },
  "audit:git": {
    description: "Audit git commits against Conventional Commits standards",
    action: () => runScript("scripts/audit-git.mjs", args),
  },
  "audit:design": {
    description: "Audit UI templates for Design System rules (palette, 70-20-10, no green bg)",
    action: () => runScript("scripts/audit-design.mjs", args),
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
          console.log(`  📁 ${stage} (${files.length} prompts)`);
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
  .filter(([cmd]) => ["init", "status", "new:adr", "list:adr", "new:story", "new:threat", "rules", "install:hooks", "install:ci"].includes(cmd))
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
    cwd: rootDir,
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
