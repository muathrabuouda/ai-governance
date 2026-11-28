/**
 * Active Execution Gateway & Real-Time Agent Control Plane
 * Intercepts agent actions (file mutations, shell execution, dependency installations)
 * BEFORE execution, enforcing fail-closed contract boundaries and logging all attempts.
 *
 * @copyright 2026 Muath R Abu Ouda <muathrabuouda@hotmail.com>
 * @license MIT
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canAgentExecuteAction, loadAgentContract } from "./agent-control.mjs";
import { getEvidenceDir } from "./verdict-engine.mjs";

/**
 * Returns the path to the agent execution audit log.
 * @param {string} [projectRoot]
 * @returns {string}
 */
export function getAgentExecutionLogPath(projectRoot = process.cwd()) {
  const evidenceDir = getEvidenceDir(projectRoot);
  return resolve(evidenceDir, "agent-execution.log");
}

/**
 * Appends a structured log entry to the agent execution audit log.
 * In fail-closed strict mode, write failure triggers an exception to prevent unlogged execution.
 *
 * @param {object} entry - Log payload
 * @param {string} [projectRoot]
 */
export function logAgentExecution(entry, projectRoot = process.cwd()) {
  const logFile = getAgentExecutionLogPath(projectRoot);
  const evidenceDir = resolve(logFile, "..");
  if (!existsSync(evidenceDir)) {
    mkdirSync(evidenceDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const status = entry.status || (entry.allowed ? "ALLOWED" : "BLOCKED");
  const action = entry.action || "unknown";
  const target = entry.target || "none";
  const actor = entry.actor || "autonomous_agent";
  const rule = entry.rule ? ` [Rule: ${entry.rule}]` : "";
  const reason = entry.reason ? ` - ${entry.reason}` : "";
  const exitCode = entry.exitCode !== undefined ? ` [Exit: ${entry.exitCode}]` : "";

  const line = `[${timestamp}] [${status}] actor=${actor} action=${action} target=${target}${rule}${exitCode}${reason}\n`;

  try {
    appendFileSync(logFile, line, "utf8");
  } catch (err) {
    const contract = loadAgentContract(projectRoot);
    if (contract.strictMode) {
      throw new Error(`[Fail-Closed] Failed to record agent execution in audit log: ${err.message}`);
    }
  }
}

/**
 * Parses command strings to determine target dependencies or file paths.
 * @param {string} command
 * @returns {{ intent: string, targets: string[] }}
 */
export function parseCommandIntent(command) {
  const trimmed = command.trim();

  // 1. Dependency addition detection (npm, pnpm, yarn)
  const npmAddRegex = /(?:npm\s+(?:install|i|add)|pnpm\s+add|yarn\s+add)(?:\s+-[A-Za-z0-9_-]+)*\s+([^;&|]+)/i;
  const addMatch = trimmed.match(npmAddRegex);
  if (addMatch) {
    const rawArgs = addMatch[1].trim().split(/\s+/);
    const packages = rawArgs
      .filter((arg) => !arg.startsWith("-") && !arg.startsWith("."))
      .map((p) => p.replace(/@[^/]+$/, "").trim()) // Strip version tags
      .filter(Boolean);

    if (packages.length > 0) {
      return {
        intent: "add_dependency",
        targets: packages,
      };
    }
  }

  // 2. Destructive file deletion detection (rm, rimraf, del)
  const rmRegex = /(?:rm(?:\s+-[rfiv]+)*|rimraf|del(?:\s+\/[fq]+)*)\s+([^;&|]+)/i;
  const rmMatch = trimmed.match(rmRegex);
  if (rmMatch) {
    const targets = rmMatch[1]
      .trim()
      .split(/\s+/)
      .filter((t) => !t.startsWith("-"));
    return {
      intent: "delete",
      targets,
    };
  }

  // 3. Shell redirection to files (> or >>)
  const redirectMatch = trimmed.match(/>>?\s*([^\s;&|]+)/);
  if (redirectMatch) {
    return {
      intent: "write",
      targets: [redirectMatch[1].trim()],
    };
  }

  return {
    intent: "exec",
    targets: [trimmed.split(/\s+/)[0]],
  };
}

/**
 * Intercepts and validates an agent action before execution.
 * If permitted, executes the provided command function, logs result, and returns payload.
 * If prohibited, denies execution and logs violation to agent-execution.log.
 *
 * @param {string} action - "write" | "modify" | "delete" | "add_dependency" | "exec"
 * @param {string} target - Target path, package, or command
 * @param {Function} [commandFn] - Callable to execute if authorized
 * @param {object} [context] - Execution context
 * @returns {{ allowed: boolean, blocked: boolean, reason?: string, result?: any, exitCode?: number }}
 */
export function executeAgentAction(action, target, commandFn = null, context = {}) {
  const projectRoot = context.projectRoot || process.cwd();
  const actor = context.actor || "autonomous_agent";

  // Validate boundary against Agent Governance Contract
  const check = canAgentExecuteAction(action, target, { projectRoot });

  if (!check.allowed) {
    logAgentExecution(
      {
        action,
        target,
        actor,
        status: "BLOCKED",
        rule: check.rule,
        reason: check.reason,
      },
      projectRoot,
    );

    return {
      allowed: false,
      blocked: true,
      reason: check.reason,
      rule: check.rule,
    };
  }

  // Action is permitted: log pre-execution approval
  logAgentExecution(
    {
      action,
      target,
      actor,
      status: "ALLOWED",
    },
    projectRoot,
  );

  if (typeof commandFn === "function") {
    try {
      const result = commandFn();
      logAgentExecution(
        {
          action,
          target,
          actor,
          status: "SUCCESS",
          exitCode: 0,
        },
        projectRoot,
      );
      return {
        allowed: true,
        blocked: false,
        result,
        exitCode: 0,
      };
    } catch (err) {
      logAgentExecution(
        {
          action,
          target,
          actor,
          status: "FAILED",
          exitCode: 1,
          reason: err.message,
        },
        projectRoot,
      );
      throw err;
    }
  }

  return {
    allowed: true,
    blocked: false,
  };
}

/**
 * Executes a shell command through the Active Execution Gateway.
 * Intercepts potential boundary violations (unapproved dependencies, test deletions, protected writes).
 *
 * @param {string} commandString - Complete command line to execute
 * @param {object} [options]
 * @returns {{ allowed: boolean, exitCode: number, stdout?: string, stderr?: string, error?: string }}
 */
export function interceptShellCommand(commandString, options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const actor = options.actor || "autonomous_agent";
  const intentMeta = parseCommandIntent(commandString);

  // Check each target identified by intent
  for (const target of intentMeta.targets) {
    const action = intentMeta.intent === "exec" ? "exec" : intentMeta.intent;
    if (action !== "exec") {
      const check = canAgentExecuteAction(action, target, { projectRoot });
      if (!check.allowed) {
        logAgentExecution(
          {
            action,
            target,
            actor,
            status: "BLOCKED",
            rule: check.rule,
            reason: check.reason,
          },
          projectRoot,
        );

        return {
          allowed: false,
          exitCode: 1,
          error: `[GATEWAY DENIED] ${check.reason} (Rule: ${check.rule})`,
        };
      }
    }
  }

  // Pre-execution checks passed. Execute command via spawnSync
  logAgentExecution(
    {
      action: "shell_exec",
      target: commandString,
      actor,
      status: "ALLOWED",
    },
    projectRoot,
  );

  const start = Date.now();
  const spawnRes = spawnSync(commandString, {
    cwd: projectRoot,
    shell: true,
    stdio: options.stdio || ["inherit", "pipe", "pipe"],
    encoding: "utf8",
  });

  const duration = Date.now() - start;
  const exitCode = spawnRes.status ?? (spawnRes.error ? 1 : 0);
  const status = exitCode === 0 ? "SUCCESS" : "FAILED";

  logAgentExecution(
    {
      action: "shell_exec",
      target: commandString,
      actor,
      status,
      exitCode,
      reason: `Completed in ${duration}ms`,
    },
    projectRoot,
  );

  return {
    allowed: true,
    exitCode,
    stdout: spawnRes.stdout,
    stderr: spawnRes.stderr,
    error: spawnRes.error?.message,
  };
}

/**
 * Intercepts a file write operation through the Gateway.
 * @param {string} filePath - Relative or absolute path
 * @param {Function} writeFn - Writing callback
 * @param {object} [context]
 * @returns {any}
 */
export function interceptFileWrite(filePath, writeFn, context = {}) {
  const projectRoot = context.projectRoot || process.cwd();
  const relPath = filePath.replace(projectRoot, "").replace(/^[\\/]/, "");
  return executeAgentAction("write", relPath, writeFn, context);
}

/**
 * Intercepts a file deletion operation through the Gateway.
 * @param {string} filePath - Relative or absolute path
 * @param {Function} deleteFn - Deletion callback
 * @param {object} [context]
 * @returns {any}
 */
export function interceptFileDelete(filePath, deleteFn, context = {}) {
  const projectRoot = context.projectRoot || process.cwd();
  const relPath = filePath.replace(projectRoot, "").replace(/^[\\/]/, "");
  return executeAgentAction("delete", relPath, deleteFn, context);
}

/**
 * Reads and returns parsed log records from the agent execution log.
 * @param {string} [projectRoot]
 * @returns {Array<{ timestamp: string, status: string, actor: string, action: string, target: string, raw: string }>}
 */
export function getAgentExecutionHistory(projectRoot = process.cwd()) {
  const logFile = getAgentExecutionLogPath(projectRoot);
  if (!existsSync(logFile)) return [];

  try {
    const raw = readFileSync(logFile, "utf8");
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const timeMatch = line.match(/^\[(.*?)\]/);
        const statusMatch = line.match(/^\[.*?\]\s+\[(.*?)\]/);
        const actorMatch = line.match(/actor=([^\s]+)/);
        const actionMatch = line.match(/action=([^\s]+)/);
        const targetMatch = line.match(/target=([^\s]+)/);

        return {
          timestamp: timeMatch ? timeMatch[1] : "",
          status: statusMatch ? statusMatch[1] : "",
          actor: actorMatch ? actorMatch[1] : "",
          action: actionMatch ? actionMatch[1] : "",
          target: targetMatch ? targetMatch[1] : "",
          raw: line,
        };
      });
  } catch {
    return [];
  }
}
