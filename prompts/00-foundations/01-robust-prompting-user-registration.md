# Robust Prompting: User Registration

**Foundations: Prompt as a Micro-Specification** · "Every output is a draft until verified" · Core Principle: High-leverage prompts specify exact boundaries, constraints, and verifiable deliverables.

```text
You are a senior backend engineer specializing in application security. In our web framework with a relational database, write a new user registration feature.
Fields: name, email, password.
Constraints: Name is required; email must be valid format and unique; password must be at least 8 characters including at least one number, stored with a secure cryptographic hash. Do not introduce new external libraries. Provide clean error messages.
Deliverables: Give me the implementation code, followed by automated unit tests covering all six boundary cases, and explicitly state any assumptions made. If any requirement is ambiguous, ask for clarification before writing code.
```
