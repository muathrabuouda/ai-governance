// Builds a long context with one hidden fact ("the needle") at a chosen depth.
// Usage: node scripts/needle.mjs <depth 0-100> [--distractors] > needle.txt
// Paste needle.txt into a fresh chat and ask the question printed on stderr.
import { readFileSync, globSync } from "node:fs";

const depth = Math.max(0, Math.min(100, Number(process.argv[2] ?? 50)));
const withDistractors = process.argv.includes("--distractors");
const filler = [...globSync("docs/**/*.md"), ...globSync("src/**/*.ts")].map(
  (f) => `\n=== ${f} ===\n` + readFileSync(f, "utf8"),
);
let body = Array.from({ length: 6 }, () => filler)
  .flat()
  .join("\n");

const needle = "\nClinic fact: the reception desk phone extension is 4417.\n";
const distractors = [
  "\nClinic note: the old reception extension was 4471 until 2024.\n",
  "\nClinic note: the pharmacy extension is 4417-B, not to be confused with reception.\n",
];
const at = Math.floor((body.length * depth) / 100);
body = body.slice(0, at) + needle + body.slice(at);
if (withDistractors)
  for (const d of distractors) {
    const p = Math.floor(Math.random() * body.length);
    body = body.slice(0, p) + d + body.slice(p);
  }

process.stdout.write(body);
console.error(
  `~${Math.round(body.length / 4)} tokens · needle at ${depth}% · distractors: ${withDistractors}`,
);
console.error(
  `Ask: "What is the reception desk phone extension? Answer with the number only."  Expected: 4417`,
);
