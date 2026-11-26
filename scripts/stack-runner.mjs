/**
 * Multi-Stack Verification & Engineering Gates Runner
 * Automatically detects all stacks present in target project (PHP/Laravel, Node/TS, Android/Gradle, Python)
 * Performs pre-flight availability checks for runners (pest, phpunit, pint, phpstan, npm, pytest, mypy, gradle)
 * and executes formatting, static analysis, and test suites across hybrid projects.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GateStatus } from "./policy-engine.mjs";

/**
 * Checks whether an executable command exists in system PATH or target directory.
 * @param {string} cmd
 * @param {string} [cwd]
 * @returns {boolean}
 */
export function isExecutableAvailable(cmd, cwd = process.cwd()) {
  try {
    const isWindows = process.platform === "win32";
    const checkCmd = isWindows ? `where "${cmd}"` : `which "${cmd}"`;
    const res = spawnSync(checkCmd, { cwd, shell: true, stdio: "ignore" });
    return res.status === 0;
  } catch {
    return false;
  }
}

/**
 * Detects all software engineering stacks present in target project (supports hybrid stacks).
 * Performs pre-flight checks on dependencies and tooling availability.
 *
 * @param {string} projectRoot
 * @returns {Array<object>}
 */
export function detectStacks(projectRoot = process.cwd()) {
  const detected = [];

  // 1. PHP / Laravel
  const composerPath = resolve(projectRoot, "composer.json");
  if (existsSync(composerPath)) {
    try {
      const composerContent = readFileSync(composerPath, "utf8");
      const isLaravel =
        composerContent.includes("laravel/framework") ||
        composerContent.includes("heritage/framework") ||
        composerContent.includes("ugarit/framework");

      const hasVendor = existsSync(resolve(projectRoot, "vendor"));
      const pintBin = resolve(projectRoot, "vendor/bin/pint");
      const pestBin = resolve(projectRoot, "vendor/bin/pest");
      const phpunitBin = resolve(projectRoot, "vendor/bin/phpunit");
      const phpstanBin = resolve(projectRoot, "vendor/bin/phpstan");

      detected.push({
        name: isLaravel ? "Laravel / PHP" : "PHP Package",
        type: "php",
        hasInstalledDeps: hasVendor,
        missingDepsMessage: hasVendor ? undefined : "vendor directory missing (run composer install)",
        formatCmd: hasVendor && existsSync(pintBin) ? { cmd: pintBin, args: ["--test"] } : undefined,
        testCmd: hasVendor
          ? existsSync(pestBin)
            ? { cmd: pestBin, args: [] }
            : existsSync(phpunitBin)
            ? { cmd: phpunitBin, args: [] }
            : undefined
          : undefined,
        lintCmd: hasVendor && existsSync(phpstanBin) ? { cmd: phpstanBin, args: ["analyse"] } : undefined,
      });
    } catch {
      // Fallback on parse error
    }
  }

  // 2. Node.js / TypeScript (e.g. standalone or hybrid frontend)
  const packageJsonPath = resolve(projectRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      const scripts = pkg.scripts || {};
      const hasNodeModules = existsSync(resolve(projectRoot, "node_modules"));

      detected.push({
        name: "Node.js / TypeScript",
        type: "node",
        hasInstalledDeps: hasNodeModules,
        missingDepsMessage: hasNodeModules ? undefined : "node_modules missing (run npm ci / npm install)",
        testCmd: scripts.test ? { cmd: "npm", args: ["test"] } : undefined,
        formatCmd: hasNodeModules && scripts.format ? { cmd: "npm", args: ["run", "format"] } : undefined,
        lintCmd: hasNodeModules
          ? scripts.lint
            ? { cmd: "npm", args: ["run", "lint"] }
            : scripts.typecheck
            ? { cmd: "npm", args: ["run", "typecheck"] }
            : undefined
          : undefined,
      });
    } catch {
      // Fallback on parse error
    }
  }

  // 3. Android / Kotlin (Gradle)
  if (
    existsSync(resolve(projectRoot, "build.gradle.kts")) ||
    existsSync(resolve(projectRoot, "build.gradle"))
  ) {
    const gradleCmd = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
    const hasWrapper = existsSync(resolve(projectRoot, gradleCmd));
    detected.push({
      name: "Android / Gradle",
      type: "android",
      hasInstalledDeps: hasWrapper,
      missingDepsMessage: hasWrapper ? undefined : "gradle wrapper missing (run gradle wrapper)",
      testCmd: hasWrapper ? { cmd: resolve(projectRoot, gradleCmd), args: ["test"] } : undefined,
      lintCmd: hasWrapper ? { cmd: resolve(projectRoot, gradleCmd), args: ["lint"] } : undefined,
    });
  }

  // 4. Python (requirements.txt, pyproject.toml, Pipfile, setup.py)
  if (
    existsSync(resolve(projectRoot, "requirements.txt")) ||
    existsSync(resolve(projectRoot, "pyproject.toml")) ||
    existsSync(resolve(projectRoot, "Pipfile")) ||
    existsSync(resolve(projectRoot, "setup.py"))
  ) {
    const venvPaths = [
      resolve(projectRoot, ".venv"),
      resolve(projectRoot, "venv"),
      resolve(projectRoot, "env"),
    ];
    const hasVenv = venvPaths.some((p) => existsSync(p));

    // Pre-flight check for pytest in venv or system PATH
    let pytestCmd = undefined;
    for (const venv of venvPaths) {
      const venvPytestWin = resolve(venv, "Scripts/pytest.exe");
      const venvPytestUnix = resolve(venv, "bin/pytest");
      if (existsSync(venvPytestWin)) {
        pytestCmd = venvPytestWin;
        break;
      }
      if (existsSync(venvPytestUnix)) {
        pytestCmd = venvPytestUnix;
        break;
      }
    }
    if (!pytestCmd && isExecutableAvailable("pytest", projectRoot)) {
      pytestCmd = "pytest";
    }

    // Pre-flight check for mypy
    let mypyCmd = undefined;
    for (const venv of venvPaths) {
      const venvMypyWin = resolve(venv, "Scripts/mypy.exe");
      const venvMypyUnix = resolve(venv, "bin/mypy");
      if (existsSync(venvMypyWin)) {
        mypyCmd = venvMypyWin;
        break;
      }
      if (existsSync(venvMypyUnix)) {
        mypyCmd = venvMypyUnix;
        break;
      }
    }
    if (!mypyCmd && isExecutableAvailable("mypy", projectRoot)) {
      mypyCmd = "mypy";
    }

    detected.push({
      name: "Python",
      type: "python",
      hasInstalledDeps: hasVenv,
      missingDepsMessage: !pytestCmd
        ? "pytest not found in virtualenv or PATH (run pip install pytest)"
        : !hasVenv
        ? "virtualenv not detected (.venv / venv directory missing)"
        : undefined,
      testCmd: pytestCmd ? { cmd: pytestCmd, args: [] } : undefined,
      lintCmd: mypyCmd ? { cmd: mypyCmd, args: ["."] } : undefined,
    });
  }

  if (detected.length === 0) {
    detected.push({
      name: "Generic / Agnostic",
      type: "generic",
      hasInstalledDeps: true,
    });
  }

  return detected;
}

/**
 * Returns primary stack for backward compatibility.
 * @param {string} projectRoot
 * @returns {object}
 */
export function detectStack(projectRoot = process.cwd()) {
  return detectStacks(projectRoot)[0];
}

/**
 * Runs a shell verification stage and reports structured status.
 * Gracefully detects missing executables and reports GateStatus.NOT_CONFIGURED.
 *
 * @param {string} stageName
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} cwd
 * @returns {{ passed: boolean, status: string, message: string }}
 */
export function runStage(stageName, cmd, args, cwd = process.cwd()) {
  console.log(`\n[STAGE] ${stageName}...`);
  try {
    const result = spawnSync(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    if (result.error) {
      if (result.error.code === "ENOENT") {
        console.warn(`   [WARN] ${stageName}: Executable "${cmd}" not found in PATH.`);
        return {
          passed: false,
          status: GateStatus.NOT_CONFIGURED,
          message: `${cmd} not found in system PATH`,
        };
      }
      throw result.error;
    }

    const passed = result.status === 0;
    if (passed) {
      console.log(`   [PASS] ${stageName} passed`);
      return {
        passed: true,
        status: GateStatus.PASSED,
        message: `${stageName} passed`,
      };
    } else {
      console.error(`   [FAIL] ${stageName} failed (exit code: ${result.status})`);
      return {
        passed: false,
        status: GateStatus.FAILED,
        message: `${stageName} failed (exit code: ${result.status})`,
      };
    }
  } catch (err) {
    console.error(`   [ERROR] ${stageName} encountered execution error: ${err.message}`);
    return {
      passed: false,
      status: GateStatus.FAILED,
      message: `${stageName} error: ${err.message}`,
    };
  }
}
