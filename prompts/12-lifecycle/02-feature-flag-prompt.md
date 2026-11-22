# Stable Feature Flag & Canary Rollout Prompt

**Lifecycle & Evolution** · "Change Safely, Measure, Then Deploy" · Feature Flags

```text
Wrap feature [Feature Name] behind a stable percentage feature flag:
- Unknown or disabled flags must evaluate to false.
- Percentage rollouts must remain deterministic and stable per user (using a cryptographic hash of user ID % 100).
- Provide automated tests verifying: disabled state, enabled state, and uniform distribution across randomized user populations.
```
