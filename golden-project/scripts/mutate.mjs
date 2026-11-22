// A tiny mutation tester: break the code on purpose, one change at a time, and check the tests notice.
// A mutant the tests do not catch ("survived") shows a behaviour no test pins down.
// Usage: node scripts/mutate.mjs        Real projects: use a tool such as Stryker; this shows the idea.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";

const projectRoot = resolve(fileURLToPath(import.meta.url), "../..");

const MUTANTS = [
  [
    "src/modules/booking/cancel.ts",
    "hoursLeft < LATE_CANCEL_HOURS",
    "hoursLeft <= LATE_CANCEL_HOURS",
    "boundary: < becomes <=",
  ],
  [
    "src/modules/booking/cancel.ts",
    "appt.patientId !== patientId",
    "appt.patientId === patientId",
    "owner check inverted",
  ],
  ["src/modules/booking/cancel.ts", "await deps.repo.releaseSlot(appt.slotId);", "", "slot never released"],
  [
    "src/modules/booking/cancel.ts",
    'appt.status === "Confirmed" &&',
    'appt.status === "Requested" &&',
    "wrong status in late rule",
  ],
  [
    "src/modules/booking/domain.ts",
    "LATE_CANCEL_HOURS = 24",
    "LATE_CANCEL_HOURS = 12",
    "rule changed: 24 becomes 12",
  ],
  [
    "src/modules/booking/domain.ts",
    'Requested: ["Confirmed", "Cancelled"]',
    'Requested: ["Confirmed", "Cancelled", "Completed"]',
    "illegal transition allowed",
  ],
  [
    "src/modules/booking/book.ts",
    "startsAt <= deps.clock.now()",
    "startsAt < deps.clock.now()",
    "boundary: <= becomes <",
  ],
  [
    "src/modules/booking/book.ts",
    'if (outcome === "taken") return { ok: false, error: "SlotTaken" };',
    "",
    "double booking not reported",
  ],
  ["src/modules/booking/book.ts", "if (previous) return", "if (false) return", "idempotency ignored"],
];

const runTests = () =>
  spawnSync("npx", ["tsx", "--test", "tests/**/*.test.ts"], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: true,
  }).status === 0;

if (!runTests()) {
  console.error("tests fail before mutation; fix them first");
  process.exit(1);
}

let killed = 0;
const survivors = [];
for (const [file, from, to, label] of MUTANTS) {
  const fullPath = join(projectRoot, file);
  const original = readFileSync(fullPath, "utf8");
  if (!original.includes(from)) {
    console.error(`skip (pattern not found): ${file} · ${label}`);
    continue;
  }
  try {
    writeFileSync(fullPath, original.replace(from, to));
    const caught = !runTests();
    if (caught) {
      killed++;
    } else {
      survivors.push(`${file} · ${label}`);
    }
    console.log(`${caught ? "killed  " : "SURVIVED"}  ${label}  (${file})`);
  } finally {
    writeFileSync(fullPath, original); // always restore
  }
}
const total = killed + survivors.length;
console.log(`\nmutation score: ${killed}/${total} = ${Math.round((100 * killed) / total)}%`);
if (survivors.length) {
  console.log("write a test that fails for each survivor:\n" + survivors.map((s) => "  - " + s).join("\n"));
}
