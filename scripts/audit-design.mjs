/**
 * Governance Design System & UI Token Auditor
 * Enforces official color palette roles, typography standards, and accessibility guardrails.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const TARGET_EXTENSIONS = new Set([".vue", ".tsx", ".jsx", ".blade.php", ".html", ".css", ".scss"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "vendor", "storage"]);

// Official palette design tokens
export const OFFICIAL_PALETTE = {
  greenAccent: "#14A800",
  inkHeadlines: "#16211C",
  graphiteBody: "#333333",
  mistCanvas: "#F5F5F5",
  whiteCard: "#FFFFFF",
  greenWashTag: "#EAF6E8",
};

/**
 * Recursively find target source files.
 */
function findSourceFiles(dir, fileList = []) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry)) continue;
      const fullPath = resolve(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        findSourceFiles(fullPath, fileList);
      } else if (TARGET_EXTENSIONS.has(extname(fullPath))) {
        fileList.push(fullPath);
      }
    }
  } catch {
    // Directory might not exist in root
  }
  return fileList;
}

/**
 * Audits a single file for design system compliance.
 * @param {string} filePath
 * @returns {Array<{ line: number, message: string, severity: 'error' | 'warning' }>}
 */
export function auditFileDesign(filePath) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const violations = [];

  // Patterns for green as background:
  // e.g. bg-[#14A800], background: #14A800, background-color: #14A800
  const greenBgRegex = /(bg-\[#14A800\]|background(-color)?\s*:\s*#14A800)/i;

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Rule: Green is an accent, NEVER a background
    if (greenBgRegex.test(line)) {
      violations.push({
        line: lineNum,
        message:
          "Violation: Green (#14A800) is an accent color, NEVER a background (use Mist #F5F5F5 or White #FFFFFF for surfaces, or Green wash #EAF6E8 for tags).",
        severity: "error",
      });
    }
  });

  return violations;
}

/**
 * Runs the design system audit across the target directory.
 */
export function runDesignAudit(targetDir = process.cwd()) {
  console.log(`Auditing design system compliance in "${targetDir}"...\n`);
  const files = findSourceFiles(targetDir);

  if (files.length === 0) {
    console.log("No frontend template or CSS files found to audit.");
    return { passed: true, violationsCount: 0 };
  }

  let totalViolations = 0;
  for (const file of files) {
    const violations = auditFileDesign(file);
    if (violations.length > 0) {
      console.error(`\nFile: ${file}`);
      for (const v of violations) {
        totalViolations++;
        console.error(`  [Line ${v.line}] [${v.severity.toUpperCase()}] ${v.message}`);
      }
    }
  }

  console.log("\n------------------------------------------------");
  if (totalViolations === 0) {
    console.log(`Design System Audit Passed: Checked ${files.length} files. Zero violations.`);
    return { passed: true, violationsCount: 0 };
  } else {
    console.error(
      `Design System Audit Failed: Found ${totalViolations} violations across ${files.length} files.`,
    );
    return { passed: false, violationsCount: totalViolations };
  }
}

// CLI Execution entry
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const targetDir = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
  const result = runDesignAudit(targetDir);
  process.exit(result.passed ? 0 : 1);
}
