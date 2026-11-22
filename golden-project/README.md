# Golden Project (المشروع الذهبي المرجعي)

> **The Living Reference Architecture Implementation**  
> _Part of the AI Governance Platform (`@muathrabuouda/ai-governance`)._  
> _Architected by Muath R Abu Ouda._

---

## Overview

**Golden Project** is an end-to-end, production-grade reference implementation of a Clinic Appointment Booking & Scheduling Monolith. It serves as concrete, executable proof of the 13 AI Software Engineering phases taught and governed by **Governance**.

Rather than abstract guidelines, this project demonstrates real-world software engineering craftsmanship:

- **Injected Deterministic Clock:** Safe time-travel testing for 24-hour late cancellation rules without mock timers (`src/modules/booking/cancel.ts`).
- **Idempotency & Concurrency:** Eliminating race conditions and duplicate submissions atomically (`src/modules/booking/book.ts`).
- **Offline Consumer-Driven Contract Testing:** Validating external SMS provider schemas offline without network access (`tests/adapters/sms-contract.test.ts`).
- **100% Mutation Testing Score:** Comprehensive mutant termination catching subtle boundary and inversion faults (`scripts/mutate.mjs`).
- **N+1 Query Elimination & Performance Contract:** Benchmark proving constant 2-query batch fetching regardless of volume (`scripts/bench.mjs`).
- **Strangler Fig & Characterization Testing:** Capturing baseline behavior of legacy reporting code before refactoring (`src/legacy/`, `tests/legacy/`).
- **Multilingual Localization (i18n):** Arabic pluralization (6 plural categories), Arabic-Indic numerals, and Levant calendar localization (`src/shared/i18n/`).

---

## Directory Structure

```
golden-project/
├── contracts/             # Provider schema contracts (JSON Schema)
├── docs/                  # System specifications, domain models & ADRs
├── evals/                 # Benchmark & evaluation tasks
├── locales/               # Bilingual translation catalogs (ar, en)
├── scripts/               # Benchmarking, mutation testing, i18n & story checks
├── src/
│   ├── adapters/          # External integrations (SMS notifier adapter)
│   ├── legacy/            # Legacy monolith reporting code
│   ├── modules/
│   │   ├── booking/       # Booking bounded context (book, cancel, ports)
│   │   ├── reports/       # Modern daily report generator
│   │   └── scheduling/    # Slot availability and batching engine
│   └── shared/            # Invariant logger, feature flags, i18n helpers
└── tests/                 # Unit, contract, boundary, and property-based test suites
```

---

## Verification Commands

Run the Golden Project verification commands from within `golden-project/` (or via root `governance` CLI):

```bash
# Run all unit, boundary, and property tests (37 tests)
npm test

# Run 100% mutation testing across domain boundaries
npm run mutate

# Run query performance benchmark against N+1 regression
npm run bench

# Verify multilingual dictionary synchronization
npm run i18n

# View formal acceptance criteria for any story
node scripts/story.mjs 2
```

---

## License

MIT License. Authored by Muath R Abu Ouda.
