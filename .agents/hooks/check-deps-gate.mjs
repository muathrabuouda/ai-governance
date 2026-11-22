// PreToolUse hook for Edit|Write: block edits to package.json that introduce unapproved dependencies.
// Exit 2 = block, stderr is sent back to the agent.
import { readFileSync, existsSync } from "node:fs";
import { relative } from "node:path";

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const file = input?.tool_input?.file_path ?? "";
  const rel = relative(process.env.AGENT_PROJECT_DIR ?? process.env.PROJECT_DIR ?? process.cwd(), file);

  if (/package\.json$/.test(rel) && existsSync(file)) {
    const depsPath = existsSync("docs/standards/dependencies.md")
      ? "docs/standards/dependencies.md"
      : "docs/dependencies.md";

    if (existsSync(depsPath)) {
      const approved = new Set(
        readFileSync(depsPath, "utf8")
          .split("\n")
          .filter((l) => /^\| [@a-z0-9]/.test(l))
          .map((l) => l.split("|")[1].trim()),
      );

      const incomingContent = input?.tool_input?.content ?? input?.tool_input?.new_string ?? "";
      if (incomingContent) {
        try {
          const parsed = JSON.parse(incomingContent);
          const allDeps = Object.keys({ ...parsed.dependencies, ...parsed.devDependencies });
          const unapproved = allDeps.filter((d) => !approved.has(d));

          if (unapproved.length > 0) {
            console.error(
              `Blocked by Governance Dependency Gate: The following packages are not approved in docs/standards/dependencies.md: ${unapproved.join(
                ", ",
              )}. Propose a row in docs/standards/dependencies.md and get human approval before adding them.`,
            );
            process.exit(2);
          }
        } catch {
          // If content is not complete valid JSON (e.g. diff snippet), allow through to lint/check gate
        }
      }
    }
  }
} catch {
  // If parsing stdin fails, proceed safely
}

process.exit(0);
