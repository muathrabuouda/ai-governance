// PreToolUse hook for Edit|Write: block changes to EXISTING test files.
// New test files are allowed. Exit 2 = block, stderr is sent back to the agent.
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const file = input?.tool_input?.file_path ?? "";
const rel = relative(process.env.AGENT_PROJECT_DIR ?? process.env.PROJECT_DIR ?? process.cwd(), file);

if (/^tests\/.*\.test\.ts$/.test(rel) && existsSync(file)) {
  console.error(
    `Blocked: ${rel} is an existing test. Do not change tests to make them pass; stop and explain why the test is wrong.`,
  );
  process.exit(2);
}
process.exit(0);
