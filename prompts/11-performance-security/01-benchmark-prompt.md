# Performance Benchmark & N+1 Prevention Prompt

**Performance & Security** · "Change Safely, Measure, Then Deploy" · N+1 Elimination

```text
Write an automated performance benchmark (`scripts/bench.mjs`):
- Simulate a realistic database query latency (e.g. 2ms per query).
- Compare the naive implementation (which issues N+1 queries) against the batched implementation across increasing entity scales (1, 5, 20 entities).
- Measure and print query counts, total execution time, and output equality.
- Establish an automated performance test asserting constant query count regardless of dataset size.
```
