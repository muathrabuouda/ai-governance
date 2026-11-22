// Measure before you optimise: same data, both versions, simulated 2 ms per database query.
// Usage: npx tsx scripts/bench.mjs
import { availableSlots, availableSlotsNaive } from "../src/modules/scheduling/available.ts";
import { fakeSlots, makeSlots } from "../tests/scheduling/fake-slots.ts";

const from = new Date("2026-11-23T00:00:00Z"),
  to = new Date("2026-11-30T00:00:00Z");
for (const doctors of [1, 5, 20]) {
  const slots = makeSlots(doctors, 24, 7);
  const taken = new Set(slots.filter((_, i) => i % 3 === 0).map((s) => s.id));
  const ids = Array.from({ length: doctors }, (_, i) => `d${i}`);
  for (const [name, fn] of [
    ["naive  ", availableSlotsNaive],
    ["batched", availableSlots],
  ]) {
    const f = fakeSlots(slots, taken, 2);
    const t0 = performance.now();
    const r = await fn(f.repo, ids, from, to);
    console.log(
      `${String(doctors).padStart(2)} doctors · ${name} · ${String(f.queries()).padStart(5)} queries · ${(performance.now() - t0).toFixed(0).padStart(5)} ms · ${r.length} slots`,
    );
  }
}
