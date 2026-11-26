/**
 * Governance Scaffolding & Template Engine
 * Generates and populates standardized 3-pillar architectural documentation, ADRs, and agent rules for AI agents and developers.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, chmodSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const templatesRootDir = resolve(rootDir, "templates");

/**
 * Normalizes text to a URL/filename-safe slug.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolves target docs directory (defaults to cwd/docs).
 * @param {string} [customDir]
 * @returns {string}
 */
export function getDocsDir(customDir) {
  return customDir ? resolve(customDir) : resolve(process.cwd(), "docs");
}

/**
 * Initializes a project's documentation suite from Governance templates into the 3-pillar structure.
 * Skips existing files by default to preserve user modifications unless overwrite is true.
 * @param {string} projectName
 * @param {string} [targetDocsDir]
 * @param {boolean} [overwrite=false]
 */
export function initDocs(projectName = "Governance Project", targetDocsDir = getDocsDir(), overwrite = false) {
  console.log(`\nInitializing Governance 3-pillar methodology documentation for "${projectName}"...\nTarget: ${targetDocsDir}\n`);

  const foundationTarget = resolve(targetDocsDir, "foundation");
  const lifecycleTarget = resolve(targetDocsDir, "lifecycle");
  const standardsTarget = resolve(targetDocsDir, "standards");

  mkdirSync(foundationTarget, { recursive: true });
  mkdirSync(lifecycleTarget, { recursive: true });
  mkdirSync(standardsTarget, { recursive: true });
  mkdirSync(resolve(foundationTarget, "adr"), { recursive: true });
  mkdirSync(resolve(lifecycleTarget, "threat-model"), { recursive: true });

  const templatesMap = [
    // Index
    {
      src: resolve(templatesRootDir, "index.template.md"),
      dest: resolve(targetDocsDir, "index.md"),
      name: "docs/index.md",
    },
    // Foundation templates
    {
      src: resolve(templatesRootDir, "foundation", "01-brief.template.md"),
      dest: resolve(foundationTarget, "01-brief.md"),
      name: "foundation/01-brief.md",
    },
    {
      src: resolve(templatesRootDir, "foundation", "02-spec.template.md"),
      dest: resolve(foundationTarget, "02-spec.md"),
      name: "foundation/02-spec.md",
    },
    {
      src: resolve(templatesRootDir, "foundation", "03-domain.template.md"),
      dest: resolve(foundationTarget, "03-domain.md"),
      name: "foundation/03-domain.md",
    },
    {
      src: resolve(templatesRootDir, "foundation", "04-architecture.template.md"),
      dest: resolve(foundationTarget, "04-architecture.md"),
      name: "foundation/04-architecture.md",
    },
    // Lifecycle templates
    {
      src: resolve(templatesRootDir, "lifecycle", "progress.template.md"),
      dest: resolve(lifecycleTarget, "progress.md"),
      name: "lifecycle/progress.md",
    },
    {
      src: resolve(templatesRootDir, "lifecycle", "lessons.template.md"),
      dest: resolve(lifecycleTarget, "lessons.md"),
      name: "lifecycle/lessons.md",
    },
    {
      src: resolve(templatesRootDir, "lifecycle", "context-order.template.md"),
      dest: resolve(lifecycleTarget, "context-order.md"),
      name: "lifecycle/context-order.md",
    },
    // Standards templates
    {
      src: resolve(templatesRootDir, "standards", "definition-of-done.template.md"),
      dest: resolve(standardsTarget, "definition-of-done.md"),
      name: "standards/definition-of-done.md",
    },
    {
      src: resolve(templatesRootDir, "standards", "git-workflow.template.md"),
      dest: resolve(standardsTarget, "git-workflow.md"),
      name: "standards/git-workflow.md",
    },
    {
      src: resolve(templatesRootDir, "standards", "design-system.template.md"),
      dest: resolve(standardsTarget, "design-system.md"),
      name: "standards/design-system.md",
    },
    {
      src: resolve(templatesRootDir, "standards", "coding-standards.template.md"),
      dest: resolve(standardsTarget, "coding-standards.md"),
      name: "standards/coding-standards.md",
    },
    {
      src: resolve(templatesRootDir, "standards", "dependencies.template.md"),
      dest: resolve(standardsTarget, "dependencies.md"),
      name: "standards/dependencies.md",
    },
    {
      src: resolve(templatesRootDir, "standards", "agent-lifecycle.template.md"),
      dest: resolve(standardsTarget, "agent-lifecycle.md"),
      name: "standards/agent-lifecycle.md",
    },
    {
      src: resolve(templatesRootDir, "standards", "runbook.template.md"),
      dest: resolve(standardsTarget, "runbook.md"),
      name: "standards/runbook.md",
    },
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const { src, dest, name } of templatesMap) {
    if (existsSync(src)) {
      if (existsSync(dest) && !overwrite) {
        console.log(`  - [SKIPPED] ${name} (already exists, use --force to overwrite)`);
        skippedCount++;
        continue;
      }
      let content = readFileSync(src, "utf8");
      content = content.replace(/\{\{PROJECT_TITLE\}\}/g, projectName);
      writeFileSync(dest, content, "utf8");
      console.log(`  ✓ [${existsSync(dest) ? "UPDATED" : "CREATED"}] ${name}`);
      createdCount++;
    }
  }

  console.log(`\n✅ Governance 3-pillar documentation suite initialized: ${createdCount} written, ${skippedCount} preserved.`);
}

/**
 * Adds a new story to the specification in docs/foundation/02-spec.md.
 * @param {number|string} storyNumber
 * @param {string} title
 * @param {string} [targetDocsDir]
 */
export function addStory(storyNumber, title, targetDocsDir = getDocsDir()) {
  const specPath = resolve(targetDocsDir, "foundation", "02-spec.md");
  if (!existsSync(specPath)) {
    console.error(`\n❌ Error: Specification file not found at "${specPath}". Run "governance init" first.`);
    return false;
  }

  const storyBlock = `
---

### Story ${storyNumber}: ${title}
**As a** [user role or system actor],  
**I want to** [action or capability desired],  
**So that** [business value or operational benefit achieved].

#### Acceptance Criteria

| ID | Given | When | Then |
| :--- | :--- | :--- | :--- |
| ${storyNumber}.1 | Valid initial state and prerequisites met | User triggers the action | Operation succeeds and state transitions |
| ${storyNumber}.2 | Invalid or malformed inputs | User attempts submission | Request is rejected with a specific domain error |
`;

  let currentContent = readFileSync(specPath, "utf8");
  currentContent += storyBlock;
  writeFileSync(specPath, currentContent, "utf8");
  console.log(`\n✅ [SUCCESS] Story ${storyNumber} ("${title}") appended to foundation/02-spec.md`);

  // Update lifecycle/progress.md
  const progressPath = resolve(targetDocsDir, "lifecycle", "progress.md");
  if (existsSync(progressPath)) {
    let progressContent = readFileSync(progressPath, "utf8");
    const progressEntry = `- [ ] Story ${storyNumber}: ${title} (Pending)\n`;
    if (!progressContent.includes(`Story ${storyNumber}:`)) {
      progressContent += progressEntry;
      writeFileSync(progressPath, progressContent, "utf8");
      console.log(`✅ [UPDATED] lifecycle/progress.md updated with Story ${storyNumber}`);
    }
  }

  return true;
}

/**
 * Creates a new Architecture Decision Record (ADR) in docs/foundation/adr/.
 * @param {string} title
 * @param {string} [targetDocsDir]
 */
export function addAdr(title, targetDocsDir = getDocsDir()) {
  const adrDir = resolve(targetDocsDir, "foundation", "adr");
  if (!existsSync(adrDir)) mkdirSync(adrDir, { recursive: true });

  const existingFiles = readdirSync(adrDir).filter((f) => f.endsWith(".md"));
  const nextNum = String(existingFiles.length + 1).padStart(4, "0");
  const slug = slugify(title);
  const fileName = `${nextNum}-${slug}.md`;
  const destPath = resolve(adrDir, fileName);

  const templatePath = resolve(templatesRootDir, "foundation", "adr.template.md");
  let content = existsSync(templatePath)
    ? readFileSync(templatePath, "utf8")
    : `# ADR-{{NUMBER}}: {{TITLE}}\n`;

  const today = new Date().toISOString().split("T")[0];
  content = content
    .replace(/\{\{NUMBER\}\}/g, nextNum)
    .replace(/\{\{TITLE\}\}/g, title)
    .replace(/\{\{DATE\}\}/g, today);

  writeFileSync(destPath, content, "utf8");
  console.log(`\n✅ [CREATED] ADR created at docs/foundation/adr/${fileName}`);
  return true;
}

/**
 * Lists all Architecture Decision Records in the target project.
 * @param {string} [targetDocsDir]
 */
export function listAdrs(targetDocsDir = getDocsDir()) {
  const adrDir = resolve(targetDocsDir, "foundation", "adr");
  if (!existsSync(adrDir)) {
    console.log(`\nNo ADR directory found at ${adrDir}. Run "governance init" first.`);
    return;
  }

  const files = readdirSync(adrDir).filter((f) => f.endsWith(".md")).sort();
  if (files.length === 0) {
    console.log(`\nNo Architecture Decision Records found in ${adrDir}.`);
    console.log(`Run "governance new:adr <title>" to create your first decision.`);
    return;
  }

  console.log(`\n=== Architecture Decision Records (ADRs) ===\nPath: ${adrDir}\n`);
  for (const file of files) {
    const filePath = resolve(adrDir, file);
    const content = readFileSync(filePath, "utf8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const statusMatch = content.match(/Status[:\s]+(\w+)/i) || content.match(/\*\*Status\*\*:\s*([^\n]+)/i);

    const title = titleMatch ? titleMatch[1] : file;
    const status = statusMatch ? statusMatch[1].trim() : "Accepted";
    console.log(`  📄 [${status.toUpperCase()}] ${file} — ${title}`);
  }
  console.log(`\nTotal: ${files.length} record(s)\n`);
}

/**
 * Displays an aggregated governance status report of the current workspace.
 * @param {string} [targetDocsDir]
 */
export function getStatus(targetDocsDir = getDocsDir()) {
  const projectRoot = resolve(targetDocsDir, "..");
  console.log(`\n================================================================`);
  console.log(`   GOVERNANCE STATUS REPORT`);
  console.log(`   Target Workspace: ${projectRoot}`);
  console.log(`================================================================\n`);

  const specPath = resolve(targetDocsDir, "foundation", "02-spec.md");
  const progressPath = resolve(targetDocsDir, "lifecycle", "progress.md");
  const adrDir = resolve(targetDocsDir, "foundation", "adr");

  // Check Docs initialization
  if (!existsSync(targetDocsDir)) {
    console.log(`⚠️  Governance documentation suite NOT initialized.`);
    console.log(`👉 Run "governance init [project-name]" to initialize.\n`);
    return;
  }

  console.log(`✅ Documentation Suite: Initialized (${targetDocsDir})`);

  // Count ADRs
  if (existsSync(adrDir)) {
    const adrs = readdirSync(adrDir).filter((f) => f.endsWith(".md"));
    console.log(`🏛️  Architecture Decision Records: ${adrs.length} ADR(s) documented`);
  } else {
    console.log(`🏛️  Architecture Decision Records: 0 (Directory missing)`);
  }

  // Count Stories in Progress
  if (existsSync(progressPath)) {
    const progressContent = readFileSync(progressPath, "utf8");
    const completed = (progressContent.match(/- \[[xX]\]/g) || []).length;
    const pending = (progressContent.match(/- \[ \]/g) || []).length;
    console.log(`📋 Stories Lifecycle: ${completed} Completed | ${pending} Pending | Total: ${completed + pending}`);
  }

  // Check Agent Rules
  const cursorRules = existsSync(resolve(projectRoot, ".cursorrules"));
  const claudeRules = existsSync(resolve(projectRoot, "CLAUDE.md"));
  const copilotRules = existsSync(resolve(projectRoot, ".github", "copilot-instructions.md"));

  console.log(`🤖 Agent Rules Configuration:`);
  console.log(`   - .cursorrules: ${cursorRules ? "✅ Configured" : "❌ Not found"}`);
  console.log(`   - CLAUDE.md: ${claudeRules ? "✅ Configured" : "❌ Not found"}`);
  console.log(`   - Copilot instructions: ${copilotRules ? "✅ Configured" : "❌ Not found"}`);

  if (!cursorRules && !claudeRules && !copilotRules) {
    console.log(`👉 Tip: Run "governance rules" to generate agent instruction files automatically.\n`);
  } else {
    console.log();
  }
}

/**
 * Creates a new Threat Model for a story in docs/lifecycle/threat-model/.
 * @param {number|string} storyNumber
 * @param {string} [title]
 * @param {string} [targetDocsDir]
 */
export function addThreatModel(
  storyNumber,
  title = "Feature Security",
  targetDocsDir = getDocsDir(),
) {
  const threatDir = resolve(targetDocsDir, "lifecycle", "threat-model");
  if (!existsSync(threatDir)) mkdirSync(threatDir, { recursive: true });

  const fileName = `story-${storyNumber}.md`;
  const destPath = resolve(threatDir, fileName);

  const templatePath = resolve(templatesRootDir, "lifecycle", "threat-model.template.md");
  let content = existsSync(templatePath)
    ? readFileSync(templatePath, "utf8")
    : `# Threat Model: Story {{STORY_NUMBER}}\n`;

  const today = new Date().toISOString().split("T")[0];
  content = content
    .replace(/\{\{STORY_NUMBER\}\}/g, String(storyNumber))
    .replace(/\{\{STORY_TITLE\}\}/g, title)
    .replace(/\{\{DATE\}\}/g, today);

  writeFileSync(destPath, content, "utf8");
  console.log(`\n✅ [CREATED] Threat model created at docs/lifecycle/threat-model/${fileName}`);
  return true;
}

/**
 * Generates AI agent instructions (.cursorrules, CLAUDE.md, and .github/copilot-instructions.md)
 * @param {string} [projectRoot]
 */
export function generateAgentRules(projectRoot = process.cwd()) {
  console.log(`\nGenerating AI Agent Governance Rules in: ${projectRoot}...\n`);

  const rulesContent = `# AI Agent Governance & Engineering Invariants
# Enforced by @muathrabuouda/ai-governance ("No code without proof")

## 1. Core Principles
- Spec-First: Never write production code without an explicit specification and acceptance criteria.
- Test-Driven Development (TDD): Always write failing tests first (red), then implementation (green), then refactor.
- Test Protection: You are strictly forbidden from weakening, commenting out, or deleting existing tests to pass builds.
- Architecture Decision Records (ADRs): Never alter fundamental architecture patterns without consulting or creating an ADR.

## 2. Invariants & Standards
- Result Pattern: Prefer Result/Outcome envelopes over unhandled raw exceptions.
- Domain Boundaries: Respect Hexagonal / Clean Architecture boundaries (Ports & Adapters).
- Design System: Adhere strictly to the 70-20-10 color balance. Never use primary green as a large canvas background.
- Conventional Commits: Formulate atomic commits strictly following conventional commit standards.
`;

  // 1. .cursorrules
  writeFileSync(resolve(projectRoot, ".cursorrules"), rulesContent, "utf8");
  console.log(`  ✓ [CREATED] .cursorrules`);

  // 2. CLAUDE.md
  writeFileSync(resolve(projectRoot, "CLAUDE.md"), rulesContent, "utf8");
  console.log(`  ✓ [CREATED] CLAUDE.md`);

  // 3. .github/copilot-instructions.md
  const githubDir = resolve(projectRoot, ".github");
  if (!existsSync(githubDir)) mkdirSync(githubDir, { recursive: true });
  writeFileSync(resolve(githubDir, "copilot-instructions.md"), rulesContent, "utf8");
  console.log(`  ✓ [CREATED] .github/copilot-instructions.md`);

  console.log(`\n✅ Agent governance rules successfully generated for Cursor, Claude Code, and Copilot.\n`);
}

/**
 * Installs Git pre-commit enforcement hook in target repository.
 * Preserves any existing pre-commit hook by appending to it safely and enforces real exit code.
 * @param {string} [projectRoot]
 */
export function installGitHooks(projectRoot = process.cwd()) {
  const gitDir = resolve(projectRoot, ".git");
  if (!existsSync(gitDir)) {
    console.error(`\n❌ Error: No .git directory found at "${projectRoot}". Run "git init" first.`);
    return false;
  }

  const hooksDir = resolve(gitDir, "hooks");
  if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });

  const hookMarker = "# --- GOVERNANCE PRE-COMMIT VERIFICATION ---";
  const governanceSnippet = `
${hookMarker}
echo "🛡️  Running Governance Pre-Commit Verification on project..."
if command -v governance >/dev/null 2>&1; then
  governance check || exit 1
elif command -v npx >/dev/null 2>&1; then
  npx --no-install github:muathrabuouda/ai-governance check || exit 1
fi
# --- END GOVERNANCE PRE-COMMIT ---
`;

  const preCommitPath = resolve(hooksDir, "pre-commit");

  if (existsSync(preCommitPath)) {
    const existingContent = readFileSync(preCommitPath, "utf8");
    if (existingContent.includes(hookMarker)) {
      console.log(`\nℹ️  Governance hook is already installed in .git/hooks/pre-commit.`);
      return true;
    }
    // Append to existing hook without overwriting user's tools (e.g. Pint, Husky, Pest)
    writeFileSync(preCommitPath, existingContent.trimEnd() + "\n" + governanceSnippet, "utf8");
    console.log(`\n✅ Governance verification hook appended to existing .git/hooks/pre-commit`);
  } else {
    // Create new executable hook
    const newHook = `#!/usr/bin/env sh\n` + governanceSnippet;
    writeFileSync(preCommitPath, newHook, "utf8");
    console.log(`\n✅ New Governance Git pre-commit hook installed at .git/hooks/pre-commit`);
  }

  try {
    chmodSync(preCommitPath, 0o755);
  } catch {
    // Windows permissions
  }

  return true;
}
