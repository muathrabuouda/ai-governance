// Summarise evals/runs.csv: pass rate, all-runs-pass, mean turns and cost, per context and task.
// Usage: node scripts/eval-summary.mjs [evals/runs.csv]
import { readFileSync } from "node:fs";

const [head, ...rows] = readFileSync(process.argv[2] ?? "evals/runs.csv", "utf8")
  .trim()
  .split("\n");
const cols = head.split(",");
const data = rows.map((r) =>
  Object.fromEntries(r.split(",").map((v, i) => [cols[i], isNaN(v) ? v : Number(v)])),
);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const groups = Map.groupBy(data, (r) => r.context);

for (const [ctx, runs] of groups) {
  const byTask = Map.groupBy(runs, (r) => r.task);
  const allPass = [...byTask.values()].filter((t) => t.every((r) => r.pass === 1)).length;
  console.log(`\n${ctx}`);
  console.log(
    `  pass rate        ${(100 * mean(runs.map((r) => r.pass))).toFixed(0)}%  (${runs.filter((r) => r.pass).length}/${runs.length} runs)`,
  );
  console.log(`  tasks passing every run  ${allPass}/${byTask.size}`);
  console.log(`  mean turns       ${mean(runs.map((r) => r.turns)).toFixed(1)}`);
  console.log(`  mean cost        $${mean(runs.map((r) => r.cost_usd)).toFixed(2)} per run`);
  console.log(`  interventions    ${runs.reduce((s, r) => s + r.interventions, 0)}`);
  for (const [task, t] of byTask)
    console.log(`    task ${task}: ${t.map((r) => (r.pass ? "✓" : "✗")).join(" ")}`);
}
