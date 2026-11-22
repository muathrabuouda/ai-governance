# Continuous Integration & Quality Pipeline Prompt

**Quality & Verification** · "Quality Gates and Automated Pipelines" · Complete Verification Gate

```text
Configure our complete automated verification pipeline (`npm run check`):
Order:
1. Code formatting check (Prettier).
2. Static analysis and linting (ESLint, TypeScript).
3. Automated test suite execution (Unit, Contract, Property-based).
4. Multilingual resource consistency check (i18n).
5. Pinned dependencies audit.
6. Secret and credential leak scan.
Pipeline must fail if any step fails, and exit with code 0 only when all gates pass.
```
