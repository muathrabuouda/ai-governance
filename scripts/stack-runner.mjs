/**
 * Multi-Stack Verification & Engineering Gates Runner
 * Automatically detects target project stack (PHP/Laravel, Node/TS, Android/Gradle, Python)
 * and executes formatting, static analysis, test suites, and governance invariant gates.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Detects the software engineering stack of the target project directory.
 * @param {string} projectRoot
 * @returns {object}
 */
export function detectStack(projectRoot = process.cwd()) {
  // 1. PHP / Laravel
  const composerPath = resolve(projectRoot, "composer.json");
  if (existsSync(composerPath)) {
    try {
      const composerContent = readFileSync(composerPath, "utf8");
      const isLaravel =
        composerContent.includes("laravel/framework") ||
        composerContent.includes("heritage/framework") ||
        composerContent.includes("ugarit/framework");

      const pintBin = resolve(projectRoot, "vendor/bin/pint");
      const pestBin = resolve(projectRoot, "vendor/bin/pest");
      const phpunitBin = resolve(projectRoot, "vendor/bin/phpunit");
      const phpstanBin = resolve(projectRoot, "vendor/bin/phpstan");

      return {
        name: isLaravel ? "Laravel / PHP" : "PHP Package",
        type: "laravel",
        formatCmd: existsSync(pintBin) ? { cmd: pintBin, args: ["--test"] } : undefined,
        testCmd: existsSync(pestBin)
          ? { cmd: pestBin, args: [] }
          : existsSync(phpunitBin)
          ? { cmd: phpunitBin, args: [] }
          : undefined,
        lintCmd: existsSync(phpstanBin) ? { cmd: phpstanBin, args: ["analyse"] } : undefined,
      };
    } catch {
      // fallback
    }
  }

  // 2. Android / Kotlin (Gradle)
  if (
    existsSync(resolve(projectRoot, "build.gradle.kts")) ||
    existsSync(resolve(projectRoot, "build.gradle"))
  ) {
    const gradleCmd = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
    const hasWrapper = existsSync(resolve(projectRoot, gradleCmd));
    return {
      name: "Android / Gradle",
      type: "android",
      testCmd: hasWrapper ? { cmd: resolve(projectRoot, gradleCmd), args: ["test"] } : undefined,
      lintCmd: hasWrapper ? { cmd: resolve(projectRoot, gradleCmd), args: ["lint"] } : undefined,
    };
  }

  // 3. Node.js / TypeScript
  const packageJsonPath = resolve(projectRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      const scripts = pkg.scripts || {};
      const hasNodeModules = existsSync(resolve(projectRoot, "node_modules"));
      return {
        name: "Node.js / TypeScript",
        type: "node",
        hasNodeModules,
        testCmd: hasNodeModules && scripts.test ? { cmd: "npm", args: ["test"] } : undefined,
        formatCmd: hasNodeModules && scripts.format ? { cmd: "npm", args: ["run", "format"] } : undefined,
        lintCmd: hasNodeModules
          ? scripts.lint
            ? { cmd: "npm", args: ["run", "lint"] }
            : scripts.typecheck
            ? { cmd: "npm", args: ["run", "typecheck"] }
            : undefined
          : undefined,
      };
    } catch {
      // fallback
    }
  }

  // 4. Python
  if (
    existsSync(resolve(projectRoot, "requirements.txt")) ||
    existsSync(resolve(projectRoot, "pyproject.toml"))
  ) {
    return {
      name: "Python",
      type: "python",
      testCmd: { cmd: "pytest", args: [] },
    };
  }

  return {
    name: "Generic / Agnostic",
    type: "generic",
  };
}

/**
 * Runs a shell verification stage and reports structured status.
 * @param {string} stageName
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} cwd
 * @returns {boolean}
 */
export function runStage(stageName, cmd, args, cwd = process.cwd()) {
  console.log(`\n➡️  [STAGE] ${stageName}...`);
  try {
    const result = spawnSync(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });
    const passed = result.status === 0;
    if (passed) {
      console.log(`   ✓ ${stageName} passed`);
    } else {
      console.error(`   ✗ ${stageName} failed (exit code: ${result.status})`);
    }
    return passed;
  } catch (err) {
    console.error(`   ✗ ${stageName} encountered execution error: ${err.message}`);
    return false;
  }
}
