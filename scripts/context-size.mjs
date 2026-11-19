// Rough size of the context files an agent loads: lines, words, ~tokens (chars / 4).
// It is an estimate; Arabic text usually costs more tokens per word than English.
import { readFileSync, existsSync } from "node:fs";
import { globSync } from "node:fs";

const files = [
  "AGENTS.md",
  ...globSync("golden-project/**/AGENTS.md"),
  ...globSync(".agents/skills/*/SKILL.md"),
].filter((f) => existsSync(f));
let total = 0;
for (const f of files) {
  const s = readFileSync(f, "utf8");
  const tokens = Math.round(s.length / 4);
  if (!f.includes("skills/") && !f.startsWith("src/")) total += tokens;
  console.log(
    `${f.padEnd(34)} ${String(s.split("\n").length).padStart(4)} lines ${String(s.split(/\s+/).filter(Boolean).length).padStart(5)} words ~${tokens} tokens`,
  );
}
console.log(`always loaded (root files): ~${total} tokens; folder rules and skills load only when needed`);
