/**
 * Governance Scaffolding & Template Engine
 * Generates and populates standardized 3-pillar architectural documentation for AI agents and developers.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
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
    .replace(/[^a-z0-9\u0621-\u064A]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Initializes a project's documentation suite from Governance templates into the 3-pillar structure.
 * @param {string} projectName
 * @param {string} targetDocsDir
 */
export function initDocs(projectName = "Governance Project", targetDocsDir = resolve(rootDir, "docs")) {
  console.log(`Initializing Governance 3-pillar methodology documentation for "${projectName}"...\n`);

  const foundationTarget = resolve(targetDocsDir, "foundation");
  const lifecycleTarget = resolve(targetDocsDir, "lifecycle");
  const standardsTarget = resolve(targetDocsDir, "standards");

  mkdirSync(foundationTarget, { recursive: true });
  mkdirSync(lifecycleTarget, { recursive: true });
  mkdirSync(standardsTarget, { recursive: true });
  mkdirSync(resolve(foundationTarget, "adr"), { recursive: true });
  mkdirSync(resolve(lifecycleTarget, "threat-model"), { recursive: true });

  const templatesMap = [
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
    // Standards templates
    {
      src: resolve(templatesRootDir, "standards", "definition-of-done.template.md"),
      dest: resolve(standardsTarget, "definition-of-done.md"),
      name: "standards/definition-of-done.md",
    },
    {
      src: resolve(templatesRootDir, "standards", "runbook.template.md"),
      dest: resolve(standardsTarget, "runbook.md"),
      name: "standards/runbook.md",
    },
  ];

  for (const { src, dest, name } of templatesMap) {
    if (existsSync(src)) {
      let content = readFileSync(src, "utf8");
      content = content.replace(/\{\{PROJECT_TITLE\}\}/g, projectName);
      writeFileSync(dest, content, "utf8");
      console.log(`  [CREATED] ${name}`);
    }
  }

  console.log("\nGovernance 3-pillar documentation scaffolding completed successfully.");
}

/**
 * Adds a new story to the specification in docs/foundation/02-spec.md.
 * @param {number|string} number Story number
 * @param {string} title Story title
 * @param {string} targetDocsDir
 */
export function addStory(number, title, targetDocsDir = resolve(rootDir, "docs")) {
  const specPath = resolve(targetDocsDir, "foundation", "02-spec.md");
  if (!existsSync(specPath)) {
    console.error(`Error: Specification file not found at "${specPath}". Run "governance init" first.`);
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
  console.log(`[SUCCESS] Story ${storyNumber} ("${title}") appended to foundation/02-spec.md`);

  // Update lifecycle/progress.md
  const progressPath = resolve(targetDocsDir, "lifecycle", "progress.md");
  if (existsSync(progressPath)) {
    let progressContent = readFileSync(progressPath, "utf8");
    const progressEntry = `- [ ] Story ${storyNumber}: ${title} (Pending)\n`;
    if (!progressContent.includes(`Story ${storyNumber}:`)) {
      progressContent += progressEntry;
      writeFileSync(progressPath, progressContent, "utf8");
      console.log(`[UPDATED] lifecycle/progress.md updated with Story ${storyNumber}`);
    }
  }

  return true;
}

/**
 * Creates a new Architecture Decision Record (ADR) in docs/foundation/adr/.
 * @param {string} title
 * @param {string} targetDocsDir
 */
export function addAdr(title, targetDocsDir = resolve(rootDir, "docs")) {
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
  console.log(`[CREATED] ADR created at docs/foundation/adr/${fileName}`);
  return true;
}

/**
 * Creates a new Threat Model for a story in docs/lifecycle/threat-model/.
 * @param {number|string} storyNumber
 * @param {string} title
 * @param {string} targetDocsDir
 */
export function addThreatModel(
  storyNumber,
  title = "Feature Security",
  targetDocsDir = resolve(rootDir, "docs"),
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
  console.log(`[CREATED] Threat model created at docs/lifecycle/threat-model/${fileName}`);
  return true;
}
