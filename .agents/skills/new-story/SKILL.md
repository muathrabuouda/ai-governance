---
name: new-story
description: Implement one story from docs/02-spec.md with the contract-first, test-first loop. Use when asked to build, implement or start a story or acceptance criterion in this repository.
argument-hint: "[story number]"
disable-model-invocation: true
---

# Implement story $ARGUMENTS

Follow these steps in order. Stop where it says stop.

1. Read docs/progress.md. Get the story and its acceptance criteria with the `get_story` tool (or `node scripts/story.mjs $ARGUMENTS`). Read the glossary in docs/03-domain.md.
2. Create a branch `story-$ARGUMENTS-<short-name>`.
3. **Contract.** Write only the types, the function signature and every result (including errors). Dependencies such as the clock or repositories are parameters. The body throws "not implemented". **Stop and show me the contract.**
4. **Failing tests.** One test per acceptance criterion, named `ac_<story>_<n>: ...`, written from the criterion text. Run `npm test` and show me that they fail because the code is not implemented.
5. **Implementation.** The smallest code that makes the tests pass. Reuse existing functions. Do not edit existing tests.
6. Run `npm run check`. Fix until it passes.
7. Update docs/progress.md: done, decisions, next, open questions.
8. Summarise which acceptance criteria pass and which do not.
