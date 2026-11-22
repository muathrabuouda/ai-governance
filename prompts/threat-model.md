# One-Page Threat Model Prompt (Governance Standard)

> Use this prompt before exposing any new endpoint, data transition, or external adapter.
> Enforces rigorous identification of threat vectors and active mitigations.

---

## Instructions for AI Agent

Analyze the proposed feature, story, or endpoint from an adversarial security perspective:

### 1. Assets to Protect

- What sensitive domain data, PII, credentials, or resources are touched?
- What financial, medical, or authorization state transitions occur?

### 2. Threat Actors & Scenarios

- **Malicious External Actor:** credential stuffing, replay attacks, parameter tampering.
- **Unauthorized Tenant / User:** IDOR (insecure direct object reference), tenant leakage.
- **Compromised Upstream Provider:** provider timeouts, malformed responses, DDoS.

### 3. Concrete Attack Vectors & Mitigations

| Threat / Vector         | Potential Impact            | Concrete Mitigation (Code / Architecture)                   |
| :---------------------- | :-------------------------- | :---------------------------------------------------------- |
| Replay / Double Request | Duplicate booking/charge    | Idempotency Key stored and verified atomically              |
| PII in System Logs      | Leak of phone/email/PII     | Structured logging filter redacting sensitive fields        |
| Upstream Outage         | Worker starvation / hang    | Strict timeout (e.g. 1000ms), retry limit & circuit breaker |
| Insecure ID Access      | Viewing another user's data | Multi-tenant boundary checks in repository queries          |

### 4. Verification Check

- What automated test proves that each mitigation actually works?
- (Provide the test name and test strategy for each row).
