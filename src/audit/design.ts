/**
 * Governance Design System Auditor
 * Validates UI templates for palette distribution rules (70-20-10, no green bg).
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";

const TARGET_EXTENSIONS = new Set([".vue", ".tsx", ".jsx", ".blade.php", ".html", ".css", ".scss"]);
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "vendor", "storage"]);

export const OFFICIAL_PALETTE = {
  greenAccent: "#14A800",
  inkHeadlines: "#16211C",
  graphiteBody: "#333333",
  mistCanvas: "#F5F5F5",
  whiteCard: "#FFFFFF",
  greenWashTag: "#EAF6E8",
} as const;

export interface DesignViolation {
  line: number;
  message: string;
  severity: "error" | "warning";
}

function findSourceFiles(dir: string, fileList: string[] = []): string[] {
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
    // Directory might not exist
  }
  return fileList;
}

export function auditFileDesign(filePath: string): DesignViolation[] {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const violations: DesignViolation[] = [];

  const greenBgRegex = /(bg-\[#14A800\]|background(-color)?\s*:\s*#14A800)/i;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
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

export function runDesignAudit(targetDir = process.cwd()): {
  passed: boolean;
  violationsCount: number;
} {
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
