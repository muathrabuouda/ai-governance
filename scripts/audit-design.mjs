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
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "vendor", "storage", ".governance"]);

// Official palette design tokens
export const OFFICIAL_PALETTE = {
  greenAccent: "#14A800",
  inkHeadlines: "#16211C",
  graphiteBody: "#333333",
  mistCanvas: "#F5F5F5",
  whiteCard: "#FFFFFF",
  greenWashTag: "#EAF6E8",
};

export const APPROVED_FONTS = ["IBM Plex Sans Arabic", "IBM Plex Sans", "IBM Plex Mono"];

/**
 * Recursively find target source files.
 * @param {string} dir
 * @param {string[]} fileList
 * @returns {string[]}
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

  // 1. Green background check: Green (#14A800) is an accent, NEVER background
  const greenBgRegex = /(bg-\[#14A800\]|background(-color)?\s*:\s*#14A800)/i;

  // 2. Unapproved raw hex colors (arbitrary hex that bypasses design system tokens)
  const rawHexRegex = /(?:bg|text|border)-\[#([0-9a-fA-F]{3,8})\]/g;
  const approvedHexSet = new Set(
    Object.values(OFFICIAL_PALETTE).map((h) => h.toLowerCase().replace("#", "")),
  );

  // 3. Unauthorized font families
  const unapprovedFontRegex = /font-family\s*:\s*['"]?([^'";\n]+)['"]?/i;

  // 4. Accessibility: <img> without alt
  const imgWithoutAltRegex = /<img\b(?![^>]*\balt=)[^>]*>/i;

  // 5. Accessibility: <button> with only icon / no accessible text or aria-label
  const buttonNoAriaRegex = /<button\b(?![^>]*\baria-label=)[^>]*>\s*<(?:svg|i)\b[^>]*>\s*<\/(?:svg|i)>\s*<\/button>/i;

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Rule 1: Green is an accent, NEVER a background
    if (greenBgRegex.test(line)) {
      violations.push({
        line: lineNum,
        message:
          "Violation: Green (#14A800) is an accent color, NEVER a background (use Mist #F5F5F5 or White #FFFFFF for surfaces, or Green wash #EAF6E8 for tags).",
        severity: "error",
      });
    }

    // Rule 2: Token bypass with arbitrary raw hex
    let hexMatch;
    while ((hexMatch = rawHexRegex.exec(line)) !== null) {
      const hex = hexMatch[1].toLowerCase();
      // Allow pure black/white shortcuts if needed, otherwise verify against official tokens
      if (!approvedHexSet.has(hex) && hex !== "000" && hex !== "000000" && hex !== "fff" && hex !== "ffffff") {
        violations.push({
          line: lineNum,
          message: `Token Bypass: Raw arbitrary color hex "#${hexMatch[1]}" used without design token abstraction.`,
          severity: "warning",
        });
      }
    }

    // Rule 3: Typography standards
    const fontMatch = line.match(unapprovedFontRegex);
    if (fontMatch) {
      const declaredFont = fontMatch[1].trim();
      const hasApprovedFont = APPROVED_FONTS.some((approved) =>
        declaredFont.toLowerCase().includes(approved.toLowerCase()),
      );
      if (!hasApprovedFont && !declaredFont.includes("inherit") && !declaredFont.includes("sans-serif")) {
        violations.push({
          line: lineNum,
          message: `Typography Violation: Font "${declaredFont}" is not in the approved design system font stack (IBM Plex Sans Arabic, IBM Plex Sans, IBM Plex Mono).`,
          severity: "error",
        });
      }
    }

    // Rule 4: Accessibility <img> without alt
    if (imgWithoutAltRegex.test(line)) {
      violations.push({
        line: lineNum,
        message: "Accessibility Violation: <img> tag is missing an 'alt' attribute for screen readers.",
        severity: "warning",
      });
    }

    // Rule 5: Accessibility <button> icon-only without aria-label
    if (buttonNoAriaRegex.test(line)) {
      violations.push({
        line: lineNum,
        message: "Accessibility Violation: Icon-only <button> missing 'aria-label' attribute.",
        severity: "warning",
      });
    }
  });

  return violations;
}

/**
 * Runs the design system audit across the target directory.
 * @param {string} targetDir
 * @returns {{ passed: boolean, violationsCount: number }}
 */
export function runDesignAudit(targetDir = process.cwd()) {
  console.log(`Auditing design system compliance in "${targetDir}"...\n`);
  const files = findSourceFiles(targetDir);

  if (files.length === 0) {
    console.log("No frontend template or CSS files found to audit.");
    return { passed: true, violationsCount: 0 };
  }

  let errorCount = 0;
  let warningCount = 0;

  for (const file of files) {
    const violations = auditFileDesign(file);
    if (violations.length > 0) {
      console.error(`\nFile: ${file}`);
      for (const v of violations) {
        if (v.severity === "error") errorCount++;
        else warningCount++;
        console.error(`  [Line ${v.line}] [${v.severity.toUpperCase()}] ${v.message}`);
      }
    }
  }

  console.log("\n------------------------------------------------");
  if (errorCount === 0) {
    console.log(`Design System Audit Passed: Checked ${files.length} files. (${warningCount} warnings, 0 errors)`);
    return { passed: true, violationsCount: errorCount };
  } else {
    console.error(
      `Design System Audit Failed: Found ${errorCount} errors and ${warningCount} warnings across ${files.length} files.`,
    );
    return { passed: false, violationsCount: errorCount };
  }
}

// CLI Execution entry
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const targetDir = process.argv[2] ? resolve(process.argv[2]) : process.cwd();
  const result = runDesignAudit(targetDir);
  process.exit(result.passed ? 0 : 1);
}
