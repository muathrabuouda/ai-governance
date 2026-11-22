# Continuous Delivery & Canary Deployment Prompt

**Lifecycle & Evolution** · "Change Safely, Measure, Then Deploy" · Production Delivery

```text
Write a production deployment pipeline workflow (`.github/workflows/deploy.yml`):
- Trigger on merge to `main`.
- Execute the full verification gate (`npm run check`).
- Deploy to staging and execute smoke tests.
- Require human approval gate before production deployment.
- Deploy canary release with automated health checks and automatic rollback on failure.
```
