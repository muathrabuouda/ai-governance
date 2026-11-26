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
} from "../scripts/scaffold.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const [, , command, ...args] = process.argv;

const COMMANDS = {
  // Scaffolding & Decisions
  init: {
    description: "Initialize 3-pillar methodology docs in target project: governance init [title]",
    action: () => {
      const title = args.join(" ") || "New Project";
      initDocs(title);
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

  // Verification & Testing
  check: {
    description: "Run full verification pipeline across platform and golden project",
    action: () => runNpmScript("check"),
  },
  test: {
    description: "Execute automated unit, contract, and audit tests",
    action: () => runNpmScript("test"),
  },
  mutate: {
    description: "Run mutation testing in golden-project to verify test suite quality",
    action: () => runScript("golden-project/scripts/mutate.mjs"),
  },
  context: {
    description: "Inspect context window size and token footprint across rulebooks",
    action: () => runScript("scripts/context-size.mjs"),
  },
  map: {
    description: "Generate structured repository architectural map",
    action: () => runScript("scripts/repo-map.mjs"),
  },
  story: {
    description: "View golden project story specification: governance story <number>",
    action: () => runScript("golden-project/scripts/story.mjs", args),
  },
  bench: {
    description: "Run performance benchmarks and query count verifications in golden-project",
    action: () => runScript("golden-project/scripts/bench.mjs"),
  },
  secrets: {
    description: "Scan codebase for accidental secret or token leaks",
    action: () => runNpmScript("secrets"),
  },
  deps: {
    description: "Verify that all dependencies are strictly pinned and approved",
    action: () => runNpmScript("deps"),
  },
  "audit:git": {
    description: "Audit git commits against Conventional Commits standards",
    action: () => runScript("scripts/audit-git.mjs", args),
  },
  "audit:design": {
    description: "Audit UI templates for Design System rules (palette, 70-20-10, no green bg)",
    action: () => runScript("scripts/audit-design.mjs", args),
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
   GOVERNANCE (إثبات) — Software Engineering Verification Engine
   "No code without proof"
================================================================

Usage:
   governance <command> [options]

Core Architecture & Decision Commands:
${Object.entries(COMMANDS)
  .filter(([cmd]) => ["init", "status", "new:adr", "list:adr", "new:story", "new:threat", "rules", "install:hooks"].includes(cmd))
  .map(([name, meta]) => `   ${name.padEnd(16)} ${meta.description}`)
  .join("\n")}

Verification & Engineering Gates:
${Object.entries(COMMANDS)
  .filter(([cmd]) => ["check", "test", "mutate", "audit:git", "audit:design", "secrets", "deps", "bench", "map", "context"].includes(cmd))
  .map(([name, meta]) => `   ${name.padEnd(16)} ${meta.description}`)
  .join("\n")}

Methodology & Prompts:
${Object.entries(COMMANDS)
  .filter(([cmd]) => ["prompt", "story"].includes(cmd))
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
