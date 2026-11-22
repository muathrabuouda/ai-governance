// A small tool for the agent: print one story and its acceptance criteria, nothing else.
// Usage: node scripts/story.mjs <number>
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toAr = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
export function getStory(num, specPath) {
  const defaultPath = "docs/foundation/02-spec.md";
  const projectRoot = resolve(fileURLToPath(import.meta.url), "../..");
  const candidatePaths = [
    specPath,
    defaultPath,
    resolve(projectRoot, "docs/foundation/02-spec.md"),
    resolve(projectRoot, "../docs/foundation/02-spec.md"),
  ].filter(Boolean);

  const resolvedPath = candidatePaths.find((p) => existsSync(p));
  if (!resolvedPath) return { ok: false, text: "Specification file docs/foundation/02-spec.md not found." };

  const spec = readFileSync(resolvedPath, "utf8");
  const blocks = spec.split(/^### /m).slice(1);
  const ids = blocks.map((b) => b.match(/^(?:Story|القصة)\s+([0-9٠-٩]+)/i)?.[1]).filter(Boolean);
  const block = blocks.find(
    (b) =>
      b.startsWith(`Story ${num}:`) ||
      b.startsWith(`Story ${toAr(num)}:`) ||
      b.startsWith(`القصة ${num}:`) ||
      b.startsWith(`القصة ${toAr(num)}:`),
  );
  if (!block) return { ok: false, text: `Story ${num} not found. Available stories: ${ids.join(", ")}` };
  const lines = block.split("\n");
  const title = lines[0].trim();
  const story =
    lines.find((l) => l.startsWith("As a") || l.startsWith("بصفتي") || l.startsWith("**As a**")) ?? "";
  const criteria = lines
    .filter((l) => /^\|\s*[0-9٠-٩]+[٫.][0-9٠-٩]+/.test(l))
    .map((l) =>
      l
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim()),
    )
    .map(([id, given, when, then]) => `${id}: Given ${given} · When ${when} · Then ${then}`);
  return { ok: true, text: [title, story, ...criteria].join("\n") };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const r = getStory(Number(process.argv[2]));
  (r.ok ? console.log : console.error)(r.text);
  process.exit(r.ok ? 0 : 1);
}
